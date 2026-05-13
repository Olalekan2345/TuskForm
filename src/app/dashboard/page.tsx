"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/Button";
import { AuthModal } from "@/components/auth/AuthModal";
import { fetchFromWalrus } from "@/lib/walrus";
import {
  hasPrivateKey, getPrivateKeyB64, decryptField, isSealedValue,
  isSealV3Value, isSealV2Value,
  createAuthenticatedSessionKey, decryptFieldSeal, buildSealApprovalTx,
} from "@/lib/seal";
import type { SessionKey } from "@mysten/seal";
import { formatRelativeTime } from "@/lib/utils";
import { useWalletStore } from "@/lib/walletStore";
import type { StoredForm, FormResponse } from "@/lib/types";
import {
  FileText, BarChart3, Plus, Search,
  Star, Archive, Clock, Eye, Trash2, CheckCircle2, AlertCircle,
  Users, Inbox, Zap, Lock, Database, Loader2,
  ExternalLink, Copy, Check, Info, ArrowUpDown,
  Flag, MessageSquare, Download, ChevronDown, SortAsc, SortDesc,
  Circle, AlertTriangle, CheckCheck, Pencil
} from "lucide-react";

interface ResponseWithForm extends FormResponse {
  responseBlobId: string;
  form: StoredForm;
}

type Priority = "none" | "urgent" | "in_progress" | "done";
type SortKey  = "newest" | "oldest" | "form";

const WALRUS_AGGREGATOR =
  process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_URL ?? "https://aggregator.walrus-mainnet.walrus.space";

interface BlobMeta { blobId: string; fileName: string; fileType: string; fileSize: number }

function parseBlobMeta(value: string): BlobMeta | null {
  if (!value.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed.blobId === "string" && typeof parsed.fileType === "string") {
      return parsed as BlobMeta;
    }
  } catch { /* not JSON */ }
  return null;
}

function blobDownloadUrl(blob: BlobMeta) {
  return `/api/download?blobId=${encodeURIComponent(blob.blobId)}&fileName=${encodeURIComponent(blob.fileName)}&fileType=${encodeURIComponent(blob.fileType)}`;
}

function blobInlineUrl(blob: BlobMeta) {
  return `/api/download?blobId=${encodeURIComponent(blob.blobId)}&fileName=${encodeURIComponent(blob.fileName)}&fileType=${encodeURIComponent(blob.fileType)}&inline=1`;
}

function FieldValue({ value }: { value: string }) {
  const blob = parseBlobMeta(value);
  if (blob) {
    const sizeTxt = (blob.fileSize / 1024).toFixed(1) + " KB";

    if (blob.fileType.startsWith("image/")) {
      return (
        <div style={{ marginTop: 4 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={blobInlineUrl(blob)}
            alt={blob.fileName}
            style={{ maxWidth: "100%", maxHeight: 300, borderRadius: 8, border: "1px solid var(--border)" }}
          />
          <div style={{ fontSize: "0.72rem", color: "var(--ink-muted)", marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
            <span>{blob.fileName} · {sizeTxt}</span>
            <a href={blobDownloadUrl(blob)} style={{ color: "var(--accent)", display: "inline-flex", alignItems: "center", gap: 3 }}>
              <Download size={11} /> Download
            </a>
          </div>
        </div>
      );
    }

    if (blob.fileType.startsWith("audio/")) {
      return (
        <div style={{ marginTop: 4 }}>
          <audio controls src={blobInlineUrl(blob)} style={{ width: "100%", borderRadius: 8 }} />
          <div style={{ fontSize: "0.72rem", color: "var(--ink-muted)", marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
            <span>{blob.fileName} · {sizeTxt}</span>
            <a href={blobDownloadUrl(blob)} style={{ color: "var(--accent)", display: "inline-flex", alignItems: "center", gap: 3 }}>
              <Download size={11} /> Download
            </a>
          </div>
        </div>
      );
    }

    if (blob.fileType.startsWith("video/")) {
      return (
        <div style={{ marginTop: 4 }}>
          <video controls src={blobInlineUrl(blob)} style={{ maxWidth: "100%", maxHeight: 320, borderRadius: 8, border: "1px solid var(--border)" }} />
          <div style={{ fontSize: "0.72rem", color: "var(--ink-muted)", marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
            <span>{blob.fileName} · {sizeTxt}</span>
            <a href={blobDownloadUrl(blob)} style={{ color: "var(--accent)", display: "inline-flex", alignItems: "center", gap: 3 }}>
              <Download size={11} /> Download
            </a>
          </div>
        </div>
      );
    }

    return (
      <a
        href={blobDownloadUrl(blob)}
        style={{ fontSize: "0.85rem", color: "var(--accent)", display: "inline-flex", alignItems: "center", gap: 4 }}
      >
        <Download size={12} /> {blob.fileName} ({sizeTxt})
      </a>
    );
  }
  return <span style={{ fontSize: "0.9rem", color: "var(--ink)", lineHeight: 1.6 }}>{value}</span>;
}

const PRIORITY_CONFIG: Record<Priority, { label:string; color:string; bg:string; border:string; icon: React.ElementType }> = {
  none:        { label:"No priority", color:"#475569", bg:"rgba(71,85,105,0.1)",  border:"rgba(71,85,105,0.2)",  icon:Circle },
  urgent:      { label:"Urgent",      color:"#f87171", bg:"rgba(239,68,68,0.1)",  border:"rgba(239,68,68,0.25)", icon:AlertTriangle },
  in_progress: { label:"In progress", color:"#fbbf24", bg:"rgba(245,158,11,0.1)", border:"rgba(245,158,11,0.25)",icon:Clock },
  done:        { label:"Done",        color:"#34d399", bg:"rgba(16,185,129,0.1)", border:"rgba(16,185,129,0.25)",icon:CheckCheck },
};

const NAV_ITEMS = [
  { icon:Inbox,        label:"All responses", key:"all" },
  { icon:Star,         label:"Starred",       key:"starred" },
  { icon:Clock,        label:"Recent (24h)",  key:"recent" },
  { icon:AlertTriangle,label:"Urgent",        key:"urgent" },
  { icon:CheckCheck,   label:"Done",          key:"done" },
  { icon:Archive,      label:"Archived",      key:"archived" },
];

export default function DashboardPage() {
  const address                  = useWalletStore(s => s.address);
  const signPersonalMessageAsync = useWalletStore(s => s.signPersonalMessageAsync);
  const account = address ? { address } : null;

  const [authOpen, setAuthOpen]   = useState(false);
  const [myForms, setMyForms]     = useState<StoredForm[]>([]);
  const [responses, setResponses] = useState<ResponseWithForm[]>([]);
  const [loading, setLoading]     = useState(false);
  const [selIdx, setSelIdx]       = useState<number|null>(null);
  const [search, setSearch]       = useState("");
  const [navKey, setNavKey]       = useState("all");
  const [sortKey, setSortKey]     = useState<SortKey>("newest");
  const [showSort, setShowSort]   = useState(false);
  const [copiedLink, setCopiedLink] = useState<string|null>(null);
  const [selectedFormId, setSelectedFormId] = useState<string|null>(null);

  // Per-response metadata (stored in localStorage)
  const [starred,    setStarred]    = useState<Set<string>>(new Set());
  const [priorities, setPriorities] = useState<Record<string, Priority>>({});
  const [notes,      setNotes]      = useState<Record<string, string>>({});
  const [archived,   setArchived]   = useState<Set<string>>(new Set());
  const [editingNote, setEditingNote] = useState(false);
  const [draftNote,   setDraftNote]   = useState("");
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  // Decrypted values for the currently selected response
  const [decrypted, setDecrypted] = useState<Record<string, string>>({});

  // Seal v3 decrypt state
  type SealDecryptState = "idle" | "signing" | "decrypting" | "done" | "error";
  const [sealState, setSealState] = useState<SealDecryptState>("idle");
  const [sealError, setSealError] = useState<string | null>(null);
  const sealSessionRef = useRef<SessionKey | null>(null);

  const noteRef = useRef<HTMLTextAreaElement>(null);

  // Load persisted metadata
  useEffect(() => {
    if (!address) return;
    const s = JSON.parse(localStorage.getItem(`tuskform_starred_${address}`)    || "[]");
    const p = JSON.parse(localStorage.getItem(`tuskform_priorities_${address}`) || "{}");
    const n = JSON.parse(localStorage.getItem(`tuskform_notes_${address}`)      || "{}");
    const a = JSON.parse(localStorage.getItem(`tuskform_archived_${address}`)   || "[]");
    setStarred(new Set(s));
    setPriorities(p);
    setNotes(n);
    setArchived(new Set(a));
  }, [address]);

  // Detect if selected response has Seal v3 encrypted fields
  const selHasV3 = (sel: ResponseWithForm | null): boolean =>
    sel?.responses?.some(r => r.encrypted && isSealV3Value(String(r.value))) ?? false;

  // Auto-decrypt v2 (ECDH) fields when a response is selected
  const decryptSelected = (sel: ResponseWithForm | null) => {
    if (!sel?.responses?.some(r => r.encrypted)) { setDecrypted({}); return; }
    // v2 fields: decrypt automatically if private key is on this device
    const formBlobId = sel.formId;
    const privKeyB64 = getPrivateKeyB64(formBlobId);
    if (privKeyB64) {
      (async () => {
        const map: Record<string, string> = {};
        for (const r of sel.responses ?? []) {
          if (r.encrypted && isSealV2Value(String(r.value))) {
            const plain = await decryptField(String(r.value), privKeyB64);
            if (plain !== null) map[r.fieldId] = plain;
          }
        }
        setDecrypted(map);
      })().catch(() => setDecrypted({}));
    } else {
      setDecrypted({});
    }
  };

  // Decrypt all v3 (Seal) fields in the selected response using the wallet
  const decryptV3Fields = async (sel: ResponseWithForm) => {
    if (!address || !signPersonalMessageAsync) return;

    // Get the Seal package ID: prefer env var, then fetch form schema from Walrus
    let pkgId = process.env.NEXT_PUBLIC_SEAL_PACKAGE_ID;
    if (!pkgId) {
      try {
        const schema = await fetchFromWalrus<import("@/lib/types").FormSchema>(sel.formId);
        pkgId = schema.sealPackageId;
      } catch { /* ignore */ }
    }

    if (!pkgId) {
      setSealError("No Seal package ID found. Set NEXT_PUBLIC_SEAL_PACKAGE_ID.");
      setSealState("error");
      return;
    }

    setSealState("signing");
    setSealError(null);
    try {
      // Create SessionKey and sign with wallet (opens wallet popup)
      const sessionKey = await createAuthenticatedSessionKey(address, pkgId, signPersonalMessageAsync);
      sealSessionRef.current = sessionKey;

      setSealState("decrypting");
      const txBytes = await buildSealApprovalTx(pkgId, address);

      const map: Record<string, string> = { ...decrypted };
      let firstErr: string | null = null;
      for (const r of sel.responses ?? []) {
        if (r.encrypted && isSealV3Value(String(r.value))) {
          try {
            const plain = await decryptFieldSeal(String(r.value), sessionKey, txBytes);
            if (plain !== null) map[r.fieldId] = plain;
          } catch (err) {
            console.error("[Seal] field decrypt error:", err);
            if (!firstErr) firstErr = err instanceof Error ? err.message : String(err);
          }
        }
      }
      setDecrypted(map);
      if (firstErr && Object.keys(map).length === Object.keys(decrypted).length) {
        // Nothing new was decrypted — surface the error
        setSealError(firstErr);
        setSealState("error");
      } else {
        setSealState("done");
      }
    } catch (err) {
      console.error("[Seal] decryptV3Fields error:", err);
      setSealError(err instanceof Error ? err.message : "Decryption failed");
      setSealState("error");
    }
  };

  const persist = (key: string, val: unknown) => {
    if (!address) return;
    localStorage.setItem(`tuskform_${key}_${address}`, JSON.stringify(val));
  };

  const toggleStar = (id: string) => {
    setStarred(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      persist("starred", [...n]);
      return n;
    });
  };

  const toggleArchive = (id: string) => {
    setArchived(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      persist("archived", [...n]);
      return n;
    });
  };

  const setPriority = (id: string, p: Priority) => {
    setPriorities(prev => {
      const n = { ...prev, [id]: p };
      persist("priorities", n);
      return n;
    });
    setShowPriorityMenu(false);
  };

  const saveNote = (id: string, text: string) => {
    setNotes(prev => {
      const n = { ...prev, [id]: text };
      persist("notes", n);
      return n;
    });
    setEditingNote(false);
  };

  // Load forms
  useEffect(() => {
    if (!account?.address) { setMyForms([]); setResponses([]); return; }
    const key = `tuskform_forms_${account.address}`;
    const stored: StoredForm[] = JSON.parse(localStorage.getItem(key) || "[]");
    setMyForms(stored);
  }, [account?.address]);

  // Fetch responses
  useEffect(() => {
    if (!myForms.length) { setResponses([]); return; }
    setLoading(true);
    Promise.all(
      myForms.map(async form => {
        try {
          const { responseBlobIds = [] }: { responseBlobIds: string[] } =
            await fetch(`/api/responses?formId=${form.blobId}`).then(r => r.json());
          const loaded = await Promise.all(
            responseBlobIds.map(async rbId => {
              try {
                const resp = await fetchFromWalrus<FormResponse>(rbId);
                return { ...resp, responseBlobId: rbId, form } as ResponseWithForm;
              } catch { return null; }
            })
          );
          return loaded.filter(Boolean) as ResponseWithForm[];
        } catch { return []; }
      })
    )
      .then(nested => setResponses(nested.flat()))
      .finally(() => setLoading(false));
  }, [myForms]);

  // Filter + sort
  const filtered = responses
    .filter(r => {
      if (archived.has(r.responseBlobId) && navKey !== "archived") return false;
      if (!archived.has(r.responseBlobId) && navKey === "archived") return false;
      if (selectedFormId && r.formId !== selectedFormId) return false;
      const matchSearch = !search ||
        r.formTitle?.toLowerCase().includes(search.toLowerCase()) ||
        r.responses?.some(f => String(f.value).toLowerCase().includes(search.toLowerCase()));
      const matchNav =
        navKey === "all"      ? true :
        navKey === "starred"  ? starred.has(r.responseBlobId) :
        navKey === "recent"   ? Date.now() - r.respondedAt < 24*3600*1000 :
        navKey === "urgent"   ? priorities[r.responseBlobId] === "urgent" :
        navKey === "done"     ? priorities[r.responseBlobId] === "done" :
        navKey === "archived" ? true : true;
      return matchSearch && matchNav;
    })
    .sort((a, b) =>
      sortKey === "newest" ? b.respondedAt - a.respondedAt :
      sortKey === "oldest" ? a.respondedAt - b.respondedAt :
      a.formTitle.localeCompare(b.formTitle)
    );

  const sel = selIdx !== null && selIdx < filtered.length ? filtered[selIdx] : null;

  // When selection changes, load note and decrypt sealed fields
  useEffect(() => {
    if (sel) { setDraftNote(notes[sel.responseBlobId] || ""); setEditingNote(false); setShowPriorityMenu(false); }
    setSealState("idle");
    setSealError(null);
    sealSessionRef.current = null;
    decryptSelected(sel ?? null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel?.responseBlobId]);

  const copyFormLink = (blobId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/forms/${blobId}`);
    setCopiedLink(blobId);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const deleteForm = (blobId: string) => {
    if (!account?.address) return;
    const key = `tuskform_forms_${account.address}`;
    const updated = myForms.filter(f => f.blobId !== blobId);
    setMyForms(updated);
    localStorage.setItem(key, JSON.stringify(updated));
  };

  // CSV export
  const exportCSV = () => {
    if (!filtered.length) return;
    const allFields = [...new Set(filtered.flatMap(r => r.responses?.map(f => f.fieldLabel) ?? []))];
    const header = ["Form", "Submitted At", "Priority", "Starred", ...allFields].join(",");
    const rows = filtered.map(r => {
      const fieldMap = Object.fromEntries(r.responses?.map(f => [f.fieldLabel, f.encrypted ? "[Sealed]" : String(f.value ?? "")]) ?? []);
      return [
        `"${r.formTitle}"`,
        new Date(r.respondedAt).toISOString(),
        priorities[r.responseBlobId] || "none",
        starred.has(r.responseBlobId) ? "yes" : "no",
        ...allFields.map(f => `"${(fieldMap[f] || "").replace(/"/g, '""')}"`),
      ].join(",");
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "tuskform-responses.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const stats = [
    { icon:Users,        label:"Total Responses", val:responses.length.toString(),     color:"var(--teal)" },
    { icon:FileText,     label:"Forms",            val:myForms.length.toString(),       color:"#34d399" },
    { icon:AlertCircle,  label:"New (24h)",        val:responses.filter(r=>Date.now()-r.respondedAt<86400000).length.toString(), color:"#f87171" },
    { icon:AlertTriangle,label:"Urgent",           val:Object.values(priorities).filter(p=>p==="urgent").length.toString(), color:"#fbbf24" },
  ];

  const SORT_LABELS: Record<SortKey, string> = { newest:"Newest first", oldest:"Oldest first", form:"By form name" };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh", background:"var(--bg)", color:"var(--ink)", overflow:"hidden" }}>
      <Navbar onAuthOpen={() => setAuthOpen(true)} />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />

      <div style={{ flex:1, display:"flex", overflow:"hidden", marginTop:64 }}>
        {/* Sidebar */}
        <div className="sidebar" style={{ display:"flex", flexDirection:"column" }}>
          <div style={{ padding:"16px 16px 12px" }}>
            <Link href="/builder">
              <Button size="sm" style={{ width:"100%", justifyContent:"center" }} icon={<Plus size={13}/>}>New Form</Button>
            </Link>
          </div>

          <div style={{ padding:"0 10px", flex:1, overflowY:"auto" }}>
            <div style={{ fontSize:"0.68rem", fontWeight:700, color:"var(--ink-faint)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8, padding:"0 6px" }}>Inbox</div>
            {NAV_ITEMS.map(n => (
              <button key={n.key} onClick={() => { setNavKey(n.key); setSelIdx(null); setSelectedFormId(null); }} className={`nav-item ${navKey===n.key && !selectedFormId?"active":""}`} style={{ marginBottom:2 }}>
                <n.icon size={14}/>
                <span style={{ flex:1, fontSize:"0.83rem" }}>{n.label}</span>
                {n.key==="all" && responses.length>0 && <span className="badge badge-primary">{responses.length}</span>}
                {n.key==="urgent" && Object.values(priorities).filter(p=>p==="urgent").length>0 && (
                  <span className="badge badge-warning">{Object.values(priorities).filter(p=>p==="urgent").length}</span>
                )}
              </button>
            ))}

            {myForms.length > 0 && (
              <>
                <div style={{ fontSize:"0.68rem", fontWeight:700, color:"var(--ink-faint)", textTransform:"uppercase", letterSpacing:"0.08em", margin:"16px 0 8px", padding:"0 6px" }}>My Forms</div>
                {myForms.map(form => {
                  const isActive = selectedFormId === form.blobId;
                  const formResponseCount = responses.filter(r => r.formId === form.blobId).length;
                  return (
                    <div key={form.blobId} style={{ borderRadius:9, marginBottom:2, background: isActive ? "rgba(0,200,224,0.08)" : "none", border: isActive ? "1px solid rgba(0,200,224,0.2)" : "1px solid transparent" }}>
                      <button
                        onClick={() => { setSelectedFormId(isActive ? null : form.blobId); setSelIdx(null); setNavKey("all"); }}
                        style={{ width:"100%", display:"flex", alignItems:"center", gap:6, padding:"8px 8px", background:"none", border:"none", cursor:"pointer", textAlign:"left" }}
                      >
                        <FileText size={12} color={isActive ? "var(--teal)" : "var(--ink-faint)"} style={{ flexShrink:0 }}/>
                        <span style={{ fontSize:"0.78rem", color: isActive ? "var(--teal)" : "var(--ink-muted)", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", fontWeight: isActive ? 600 : 400 }} title={form.title}>
                          {form.title}
                        </span>
                        {formResponseCount > 0 && (
                          <span style={{ fontSize:"0.65rem", background:"rgba(0,200,224,0.12)", color:"var(--teal)", borderRadius:10, padding:"1px 5px", fontWeight:600, flexShrink:0 }}>
                            {formResponseCount}
                          </span>
                        )}
                      </button>
                      <div style={{ display:"flex", gap:2, padding:"0 4px 4px" }}>
                        <button onClick={() => copyFormLink(form.blobId)} title="Copy link"
                          style={{ padding:"3px 5px", borderRadius:5, background:"none", border:"none", cursor:"pointer", color:"var(--ink-faint)" }}>
                          {copiedLink===form.blobId ? <Check size={11} color="#34d399"/> : <Copy size={11}/>}
                        </button>
                        <a href={`/builder?edit=${form.blobId}`} title="Edit form"
                          style={{ padding:"3px 5px", borderRadius:5, display:"flex", alignItems:"center", color:"var(--ink-faint)" }}>
                          <Pencil size={11}/>
                        </a>
                        <a href={`/forms/${form.blobId}`} target="_blank" rel="noreferrer"
                          style={{ padding:"3px 5px", borderRadius:5, display:"flex", alignItems:"center", color:"var(--ink-faint)" }}>
                          <ExternalLink size={11}/>
                        </a>
                        <button onClick={() => deleteForm(form.blobId)} title="Remove"
                          style={{ padding:"3px 5px", borderRadius:5, background:"none", border:"none", cursor:"pointer", color:"var(--ink-faint)" }}>
                          <Trash2 size={11}/>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          <div style={{ padding:12, borderTop:"1px solid var(--glass-border)" }}>
            <Link href="/analytics" style={{ textDecoration:"none" }}>
              <button className="nav-item"><BarChart3 size={14}/><span style={{ fontSize:"0.83rem" }}>Analytics</span></button>
            </Link>
          </div>
        </div>

        {/* Main */}
        <div className="main-content" style={{ padding:"24px 24px 0", display:"flex", flexDirection:"column", gap:16 }}>

          {!account && (
            <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:20, textAlign:"center" }}>
              <div style={{ width:72, height:72, borderRadius:20, background:"rgba(0,200,224,0.08)", border:"1px solid rgba(0,200,224,0.2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Zap size={30} color="var(--teal)"/>
              </div>
              <div>
                <h2 style={{ fontSize:"1.3rem", fontWeight:800, color:"var(--ink)", marginBottom:8 }}>Connect your wallet</h2>
                <p style={{ fontSize:"0.875rem", color:"var(--ink-muted)", maxWidth:340 }}>Connect your Sui wallet to view your forms and responses stored on Walrus.</p>
              </div>
              <Button onClick={() => setAuthOpen(true)} icon={<Zap size={14}/>}>Connect Wallet</Button>
            </div>
          )}

          {account && !loading && myForms.length === 0 && (
            <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:20, textAlign:"center" }}>
              <div style={{ width:72, height:72, borderRadius:20, background:"rgba(0,200,224,0.08)", border:"1px solid rgba(0,200,224,0.2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <FileText size={30} color="var(--teal)"/>
              </div>
              <div>
                <h2 style={{ fontSize:"1.3rem", fontWeight:800, color:"var(--ink)", marginBottom:8 }}>No forms yet</h2>
                <p style={{ fontSize:"0.875rem", color:"var(--ink-muted)", maxWidth:340 }}>Create your first form in the builder. It will be stored permanently on Walrus.</p>
              </div>
              <Link href="/builder"><Button icon={<Plus size={14}/>}>Create your first form</Button></Link>
            </div>
          )}

          {account && loading && (
            <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12 }}>
              <Loader2 size={28} color="var(--teal)" style={{ animation:"spin 1s linear infinite" }}/>
              <span style={{ fontSize:"0.875rem", color:"var(--ink-muted)" }}>Loading responses from Walrus…</span>
            </div>
          )}

          {account && !loading && myForms.length > 0 && (
            <>
              {/* Stats */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
                {stats.map(s => (
                  <div key={s.label} className="stat-card">
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                      <span style={{ fontSize:"0.68rem", fontWeight:600, color:"var(--ink-faint)", textTransform:"uppercase", letterSpacing:"0.06em" }}>{s.label}</span>
                      <s.icon size={15} color={s.color}/>
                    </div>
                    <div style={{ fontSize:"1.8rem", fontWeight:800, color:"var(--ink)", fontFamily:"var(--font-display)" }}>{s.val}</div>
                  </div>
                ))}
              </div>

              {/* Toolbar */}
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ flex:1, display:"flex", alignItems:"center", gap:8, padding:"8px 12px", borderRadius:10, background:"rgba(255,255,255,0.03)", border:"1px solid var(--glass-border)" }}>
                  <Search size={13} color="var(--ink-faint)"/>
                  <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search responses…"
                    style={{ background:"none", border:"none", outline:"none", fontSize:"0.83rem", color:"var(--ink)", flex:1 }} />
                </div>
                {selectedFormId && (
                  <div style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 10px", borderRadius:10, background:"rgba(0,200,224,0.08)", border:"1px solid rgba(0,200,224,0.25)", whiteSpace:"nowrap" }}>
                    <FileText size={12} color="var(--teal)"/>
                    <span style={{ fontSize:"0.78rem", color:"var(--teal)", fontWeight:600, maxWidth:140, overflow:"hidden", textOverflow:"ellipsis" }}>
                      {myForms.find(f => f.blobId === selectedFormId)?.title ?? "Form"}
                    </span>
                    <button onClick={() => setSelectedFormId(null)} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--teal)", display:"flex", lineHeight:1, padding:0 }}>×</button>
                  </div>
                )}

                {/* Sort */}
                <div style={{ position:"relative" }}>
                  <button onClick={() => setShowSort(s => !s)}
                    style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:10, background:"rgba(255,255,255,0.03)", border:"1px solid var(--glass-border)", color:"var(--ink-muted)", fontSize:"0.83rem", cursor:"pointer", whiteSpace:"nowrap" }}>
                    <ArrowUpDown size={13}/> {SORT_LABELS[sortKey]} <ChevronDown size={12}/>
                  </button>
                  {showSort && (
                    <div style={{ position:"absolute", top:"calc(100% + 6px)", right:0, zIndex:50, background:"var(--bg-alt)", border:"1px solid var(--glass-border)", borderRadius:12, padding:6, minWidth:160, boxShadow:"0 8px 24px rgba(0,0,0,0.4)" }}>
                      {(["newest","oldest","form"] as SortKey[]).map(k => (
                        <button key={k} onClick={() => { setSortKey(k); setShowSort(false); }}
                          style={{ display:"flex", alignItems:"center", gap:8, width:"100%", padding:"8px 12px", borderRadius:8, background:sortKey===k?"rgba(0,200,224,0.08)":"none", border:"none", color:sortKey===k?"var(--teal)":"var(--ink-muted)", fontSize:"0.83rem", cursor:"pointer" }}>
                          {k==="newest"?<SortDesc size={13}/>:k==="oldest"?<SortAsc size={13}/>:<ArrowUpDown size={13}/>}
                          {SORT_LABELS[k]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Export CSV */}
                <Button size="sm" variant="ghost" icon={<Download size={13}/>} onClick={exportCSV} disabled={!filtered.length}>
                  Export CSV
                </Button>
              </div>

              {/* Content panel */}
              <div style={{ flex:1, display:"flex", minHeight:0, overflow:"hidden", borderRadius:16, border:"1px solid var(--glass-border)", background:"rgba(9,16,31,0.5)", marginBottom:24 }}>

                {/* Response list */}
                <div style={{ width:340, flexShrink:0, borderRight:"1px solid var(--glass-border)", overflowY:"auto", display:"flex", flexDirection:"column" }}>
                  {filtered.length === 0 ? (
                    <div style={{ padding:40, textAlign:"center", color:"var(--ink-faint)", fontSize:"0.83rem" }}>
                      {responses.length===0?"No responses yet":"No matches"}
                    </div>
                  ) : (
                    filtered.map((r, i) => {
                      const firstText = r.responses?.find(f => !f.encrypted && f.value)?.value;
                      const isSel     = selIdx===i;
                      const pri       = priorities[r.responseBlobId] as Priority || "none";
                      const PriIcon   = PRIORITY_CONFIG[pri].icon;
                      return (
                        <div key={r.responseBlobId} onClick={() => setSelIdx(i)}
                          style={{ padding:"12px 14px", borderBottom:"1px solid var(--glass-border)", cursor:"pointer", background:isSel?"rgba(0,200,224,0.06)":"transparent", transition:"background 0.15s", position:"relative" }}>
                          {isSel && <div style={{ position:"absolute", left:0, top:0, bottom:0, width:2, background:"var(--teal)", borderRadius:"0 2px 2px 0" }}/>}
                          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
                            <PriIcon size={12} color={PRIORITY_CONFIG[pri].color} style={{ flexShrink:0 }}/>
                            <div style={{ fontSize:"0.83rem", fontWeight:600, color:"var(--ink)", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                              {r.formTitle || "Untitled form"}
                            </div>
                            <button onClick={e=>{e.stopPropagation();toggleStar(r.responseBlobId);}}
                              style={{ background:"none", border:"none", cursor:"pointer", color:starred.has(r.responseBlobId)?"#f59e0b":"var(--ink-faint)", flexShrink:0 }}>
                              <Star size={12} fill={starred.has(r.responseBlobId)?"#f59e0b":"none"}/>
                            </button>
                          </div>
                          <div style={{ display:"flex", alignItems:"center", gap:8, paddingLeft:20 }}>
                            <span style={{ fontSize:"0.7rem", color:"var(--ink-faint)" }}>{formatRelativeTime(new Date(r.respondedAt))}</span>
                            {notes[r.responseBlobId] && <MessageSquare size={10} color="var(--teal)" aria-label="Has note"/>}
                            {archived.has(r.responseBlobId) && <Archive size={10} color="var(--ink-faint)"/>}
                          </div>
                          {firstText && (
                            <div style={{ fontSize:"0.75rem", color:"var(--ink-muted)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", paddingLeft:20, marginTop:3 }}>
                              {String(firstText)}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Detail panel */}
                <div style={{ flex:1, overflowY:"auto" }}>
                  {sel ? (
                    <motion.div key={sel.responseBlobId} initial={{ opacity:0 }} animate={{ opacity:1 }} style={{ padding:24 }}>

                      {/* Header */}
                      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:20 }}>
                        <div>
                          <h3 style={{ fontSize:"1.05rem", fontWeight:800, color:"var(--ink)", marginBottom:4, fontFamily:"var(--font-display)" }}>{sel.formTitle}</h3>
                          <div style={{ fontSize:"0.75rem", color:"var(--ink-faint)" }}>{new Date(sel.respondedAt).toLocaleString()}</div>
                        </div>
                        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                          {/* Priority picker */}
                          <div style={{ position:"relative" }}>
                            <button onClick={() => setShowPriorityMenu(m => !m)}
                              style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 10px", borderRadius:8, background:PRIORITY_CONFIG[priorities[sel.responseBlobId]||"none"].bg, border:`1px solid ${PRIORITY_CONFIG[priorities[sel.responseBlobId]||"none"].border}`, color:PRIORITY_CONFIG[priorities[sel.responseBlobId]||"none"].color, fontSize:"0.75rem", fontWeight:600, cursor:"pointer" }}>
                              <Flag size={11}/> {PRIORITY_CONFIG[priorities[sel.responseBlobId]||"none"].label} <ChevronDown size={10}/>
                            </button>
                            {showPriorityMenu && (
                              <div style={{ position:"absolute", top:"calc(100% + 6px)", right:0, zIndex:50, background:"var(--bg-alt)", border:"1px solid var(--glass-border)", borderRadius:12, padding:6, minWidth:150, boxShadow:"0 8px 24px rgba(0,0,0,0.5)" }}>
                                {(Object.entries(PRIORITY_CONFIG) as [Priority, typeof PRIORITY_CONFIG[Priority]][]).map(([key, cfg]) => (
                                  <button key={key} onClick={() => setPriority(sel.responseBlobId, key)}
                                    style={{ display:"flex", alignItems:"center", gap:8, width:"100%", padding:"7px 10px", borderRadius:8, background:"none", border:"none", color:cfg.color, fontSize:"0.8rem", cursor:"pointer" }}>
                                    <cfg.icon size={12}/> {cfg.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <button onClick={() => toggleStar(sel.responseBlobId)}
                            style={{ padding:"5px 8px", borderRadius:8, background:"none", border:"1px solid var(--glass-border)", cursor:"pointer", color:starred.has(sel.responseBlobId)?"#f59e0b":"var(--ink-faint)" }}>
                            <Star size={13} fill={starred.has(sel.responseBlobId)?"#f59e0b":"none"}/>
                          </button>
                          <button onClick={() => toggleArchive(sel.responseBlobId)}
                            style={{ padding:"5px 8px", borderRadius:8, background:"none", border:"1px solid var(--glass-border)", cursor:"pointer", color:"var(--ink-faint)" }}
                            title={archived.has(sel.responseBlobId) ? "Unarchive" : "Archive"}>
                            <Archive size={13}/>
                          </button>
                          <span className="badge badge-cyan" style={{ display:"flex", alignItems:"center", gap:4 }}>
                            <Database size={10}/> Walrus
                          </span>
                        </div>
                      </div>

                      {/* Notes */}
                      <div style={{ marginBottom:20, padding:"14px 16px", borderRadius:14, background:"rgba(0,200,224,0.04)", border:"1px solid rgba(0,200,224,0.12)" }}>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:editingNote?10:notes[sel.responseBlobId]?8:0 }}>
                          <span style={{ fontSize:"0.72rem", fontWeight:600, color:"var(--teal)", textTransform:"uppercase", letterSpacing:"0.08em", display:"flex", alignItems:"center", gap:5 }}>
                            <MessageSquare size={11}/> Admin note
                          </span>
                          {!editingNote && (
                            <button onClick={() => { setEditingNote(true); setDraftNote(notes[sel.responseBlobId]||""); setTimeout(()=>noteRef.current?.focus(),50); }}
                              style={{ fontSize:"0.72rem", color:"var(--teal)", background:"none", border:"none", cursor:"pointer", fontWeight:600 }}>
                              {notes[sel.responseBlobId] ? "Edit" : "+ Add note"}
                            </button>
                          )}
                        </div>
                        {editingNote ? (
                          <div>
                            <textarea ref={noteRef} value={draftNote} onChange={e=>setDraftNote(e.target.value)}
                              placeholder="Add a private note about this submission…"
                              style={{ width:"100%", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(0,200,224,0.2)", borderRadius:10, color:"var(--ink)", fontSize:"0.85rem", padding:"10px 12px", outline:"none", resize:"vertical", minHeight:80, fontFamily:"var(--font-body)", lineHeight:1.6 }} />
                            <div style={{ display:"flex", gap:8, marginTop:8 }}>
                              <button onClick={() => saveNote(sel.responseBlobId, draftNote)} className="btn btn-primary btn-sm">Save note</button>
                              <button onClick={() => setEditingNote(false)} className="btn btn-ghost btn-sm">Cancel</button>
                            </div>
                          </div>
                        ) : notes[sel.responseBlobId] ? (
                          <p style={{ fontSize:"0.875rem", color:"var(--ink-muted)", lineHeight:1.6, margin:0 }}>{notes[sel.responseBlobId]}</p>
                        ) : (
                          <p style={{ fontSize:"0.8rem", color:"var(--ink-faint)", margin:0 }}>No note yet.</p>
                        )}
                      </div>

                      {/* Responses */}
                      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                        {/* Seal v3 decrypt button */}
                        {selHasV3(sel) && !sel.responses?.every(r => !r.encrypted || decrypted[r.fieldId]) && (
                          <div style={{ padding:"12px 16px", borderRadius:14, background:"rgba(123,45,139,0.06)", border:"1px solid rgba(123,45,139,0.2)", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                              <Lock size={14} color="#c084fc"/>
                              <div>
                                <div style={{ fontSize:"0.8rem", fontWeight:600, color:"#c084fc" }}>Sealed with Mysten Seal</div>
                                <div style={{ fontSize:"0.7rem", color:"var(--ink-faint)", marginTop:2 }}>
                                  {sealState === "signing" ? "Sign the message in your wallet…" :
                                   sealState === "decrypting" ? "Fetching decryption keys…" :
                                   sealState === "error" ? sealError :
                                   "Sign with your wallet to decrypt these fields"}
                                </div>
                              </div>
                            </div>
                            {(sealState === "idle" || sealState === "error") && (
                              <button onClick={() => decryptV3Fields(sel)}
                                style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", borderRadius:8, background:"rgba(123,45,139,0.15)", border:"1px solid rgba(123,45,139,0.3)", color:"#c084fc", fontSize:"0.78rem", fontWeight:600, cursor:"pointer", whiteSpace:"nowrap", flexShrink:0 }}>
                                <Lock size={11}/> Decrypt with wallet
                              </button>
                            )}
                            {(sealState === "signing" || sealState === "decrypting") && (
                              <Loader2 size={16} color="#c084fc" style={{ animation:"spin 1s linear infinite", flexShrink:0 }}/>
                            )}
                          </div>
                        )}

                        {sel.responses?.map(f => (
                          <div key={f.fieldId} style={{ padding:"14px 16px", borderRadius:14, background:"rgba(255,255,255,0.02)", border:`1px solid ${f.encrypted?"rgba(123,45,139,0.2)":"var(--glass-border)"}` }}>
                            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
                              <span style={{ fontSize:"0.7rem", fontWeight:600, color:"var(--ink-muted)", textTransform:"uppercase", letterSpacing:"0.06em" }}>{f.fieldLabel}</span>
                              {f.encrypted && (
                                <span style={{ display:"flex", alignItems:"center", gap:4, fontSize:"0.68rem", color:"#c084fc", background:"rgba(123,45,139,0.1)", border:"1px solid rgba(123,45,139,0.2)", padding:"2px 7px", borderRadius:20 }}>
                                  <Lock size={9}/> {isSealV3Value(String(f.value)) ? "Seal v3" : "Sealed"}
                                </span>
                              )}
                            </div>
                            {f.encrypted ? (
                              <div>
                                {decrypted[f.fieldId] ? (
                                  <div><FieldValue value={decrypted[f.fieldId]} /></div>
                                ) : (
                                  <div style={{ display:"flex", alignItems:"flex-start", gap:6, padding:"8px 10px", borderRadius:8, background:"rgba(123,45,139,0.06)", border:"1px solid rgba(123,45,139,0.15)" }}>
                                    <Lock size={11} color="#c084fc" style={{ marginTop:1, flexShrink:0 }}/>
                                    <span style={{ fontSize:"0.7rem", color:"var(--ink-muted)", lineHeight:1.5 }}>
                                      {isSealV3Value(String(f.value))
                                        ? "Click \"Decrypt with wallet\" above to reveal"
                                        : hasPrivateKey(sel.formId)
                                          ? "Decrypting…"
                                          : "Sealed · only accessible on the device that created this form"}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div>
                                {Array.isArray(f.value)
                                  ? <span style={{ fontSize:"0.9rem", color:"var(--ink)" }}>{f.value.join(", ")}</span>
                                  : <FieldValue value={String(f.value || "")} />}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Blob ID */}
                      <div style={{ marginTop:16, padding:"10px 14px", borderRadius:10, background:"rgba(255,255,255,0.02)", border:"1px solid var(--glass-border)" }}>
                        <div style={{ fontSize:"0.65rem", fontWeight:600, color:"var(--ink-faint)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>Response Blob ID</div>
                        <div style={{ fontSize:"0.7rem", color:"var(--ink-faint)", fontFamily:"monospace", wordBreak:"break-all" }}>{sel.responseBlobId}</div>
                      </div>
                    </motion.div>
                  ) : (
                    <div style={{ height:"100%", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12 }}>
                      <Eye size={28} color="var(--ink-faint)" style={{ opacity:0.4 }}/>
                      <span style={{ fontSize:"0.83rem", color:"var(--ink-faint)" }}>Select a response to view details</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
