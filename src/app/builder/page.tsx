"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/Button";
import { AuthModal } from "@/components/auth/AuthModal";
import { generateId } from "@/lib/utils";
import { storeOnWalrusWithWallet, fetchFromWalrus } from "@/lib/walrus";
import { generateFormKeyPair } from "@/lib/seal";
import { useWalletStore } from "@/lib/walletStore";
import type { FormSchema, StoredForm } from "@/lib/types";
import {
  Type, AlignLeft, ChevronDown, CheckSquare, Star, Link2, Wallet,
  Upload, Calendar, FileText, ImageIcon, Video, Mic,
  Plus, Trash2, GripVertical, Copy, Eye, Settings, Save,
  Lock, Globe, Shield, ArrowRight, Check, ToggleLeft, ListFilter,
  Share2, ExternalLink, Database, AlertCircle
} from "lucide-react";

type FieldType = "short_text"|"long_text"|"dropdown"|"multi_select"|"checkbox"|"star_rating"|"url"|"wallet_address"|"file_upload"|"image_upload"|"video_upload"|"audio_upload"|"date"|"rich_text"|"confirmation";
interface FormField { id:string; type:FieldType; label:string; placeholder?:string; required:boolean; privacy:"public"|"encrypted"|"admin_only"; options?:string[]; }

const FIELD_TYPES = [
  { type:"short_text" as FieldType,    label:"Short Text",     icon:Type,        group:"Basic" },
  { type:"long_text" as FieldType,     label:"Long Text",      icon:AlignLeft,   group:"Basic" },
  { type:"rich_text" as FieldType,     label:"Rich Text",      icon:FileText,    group:"Basic" },
  { type:"dropdown" as FieldType,      label:"Dropdown",       icon:ChevronDown, group:"Choice" },
  { type:"multi_select" as FieldType,  label:"Multi-Select",   icon:ListFilter,  group:"Choice" },
  { type:"checkbox" as FieldType,      label:"Checkbox",       icon:CheckSquare, group:"Choice" },
  { type:"star_rating" as FieldType,   label:"Star Rating",    icon:Star,        group:"Rating" },
  { type:"url" as FieldType,           label:"URL Input",      icon:Link2,       group:"Special" },
  { type:"wallet_address" as FieldType,label:"Wallet Address", icon:Wallet,      group:"Web3" },
  { type:"file_upload" as FieldType,   label:"File Upload",    icon:Upload,      group:"Media" },
  { type:"image_upload" as FieldType,  label:"Image Upload",   icon:ImageIcon,   group:"Media" },
  { type:"video_upload" as FieldType,  label:"Video Upload",   icon:Video,       group:"Media" },
  { type:"audio_upload" as FieldType,  label:"Voice Note",     icon:Mic,         group:"Media" },
  { type:"date" as FieldType,          label:"Date Picker",    icon:Calendar,    group:"Special" },
  { type:"confirmation" as FieldType,  label:"Confirmation",   icon:ToggleLeft,  group:"Special" },
];

const GROUPS = [...new Set(FIELD_TYPES.map(f => f.group))];

const PRIVACY = [
  { value:"public" as const,     label:"Public",     icon:Globe,  color:"#64748b" },
  { value:"encrypted" as const,  label:"Encrypted",  icon:Lock,   color:"#a78bfa" },
  { value:"admin_only" as const, label:"Admin Only", icon:Shield, color:"#fbbf24" },
];

export default function BuilderPage() {
  const [authOpen, setAuthOpen] = useState(false);
  const [fields, setFields] = useState<FormField[]>([
    { id:generateId(), type:"short_text",  label:"Your name",          placeholder:"Enter your full name",    required:true,  privacy:"public" },
    { id:generateId(), type:"long_text",   label:"Describe the issue", placeholder:"Please provide details...",required:true,  privacy:"public" },
    { id:generateId(), type:"star_rating", label:"Rate your experience",                                       required:false, privacy:"public" },
  ]);
  const [selected, setSelected] = useState<string|null>(fields[0]?.id);
  const [tab, setTab] = useState<"build"|"preview">("build");
  const [title, setTitle] = useState("Untitled Form");
  const [desc, setDesc]   = useState("Share your thoughts with us.");
  const [saving, setSaving]   = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>("Storing on Walrus…");
  const [saved, setSaved]     = useState(false);
  const [saveError, setSaveError] = useState<string|null>(null);
  const [shareUrl, setShareUrl]   = useState<string|null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink]         = useState(false);
  const [emailSent, setEmailSent]           = useState(false);

  const address             = useWalletStore(s => s.address);
  const signAndExecuteAsync = useWalletStore(s => s.signAndExecuteAsync);
  const searchParams = useSearchParams();
  const editBlobId   = searchParams.get("edit");
  const [editLoading, setEditLoading] = useState(false);

  // Load existing form when ?edit=blobId is in URL
  useEffect(() => {
    if (!editBlobId) return;
    setEditLoading(true);
    fetchFromWalrus<FormSchema>(editBlobId)
      .then(schema => {
        setTitle(schema.title);
        setDesc(schema.description);
        setFields(schema.fields as FormField[]);
        setSelected(schema.fields[0]?.id ?? null);
      })
      .catch(() => {})
      .finally(() => setEditLoading(false));
  }, [editBlobId]);

  // Prompt for email inline if not yet saved
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const [emailInput, setEmailInput]           = useState("");

  const handleSave = async () => {
    if (!address) { setAuthOpen(true); return; }
    setSaving(true);
    setSaveError(null);
    try {
      // Generate a temporary blobId placeholder to key the ECDH pair,
      // then replace with the real blobId after Walrus storage.
      const tempId = generateId();
      const encryptionPublicKey = fields.some(f => f.privacy !== "public")
        ? await generateFormKeyPair(tempId)
        : undefined;

      const schema: FormSchema = {
        id: generateId(),
        title,
        description: desc,
        fields,
        createdBy: address,
        createdAt: Date.now(),
        version: 1,
        encryptionPublicKey,
      };
      const blobId = await storeOnWalrusWithWallet(schema, address, signAndExecuteAsync, setSaveStatus);

      // Move the private key from tempId → real blobId in localStorage
      if (encryptionPublicKey) {
        const priv = localStorage.getItem(`tuskform_ecdhpriv_${tempId}`);
        if (priv) {
          localStorage.setItem(`tuskform_ecdhpriv_${blobId}`, priv);
          localStorage.removeItem(`tuskform_ecdhpriv_${tempId}`);
        }
      }
      const key = `tuskform_forms_${address}`;
      const existing: StoredForm[] = JSON.parse(localStorage.getItem(key) || "[]");
      const storedForm: StoredForm = { blobId, title, description: desc, createdAt: schema.createdAt, owner: address };
      // If editing, replace the old entry; otherwise append
      const updated = editBlobId
        ? existing.map(f => f.blobId === editBlobId ? storedForm : f)
        : [...existing, storedForm];
      localStorage.setItem(key, JSON.stringify(updated));
      const url = `${window.location.origin}/forms/${blobId}`;
      setShareUrl(url);
      setSaved(true);
      setShowShareModal(true);
      setTimeout(() => setSaved(false), 3000);
      // Send confirmation email if creator has one saved
      const creatorEmail = localStorage.getItem(`tuskform_email_${address}`);
      if (creatorEmail) {
        fetch("/api/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "form_created",
            to: creatorEmail,
            formTitle: title,
            formDescription: desc,
            formFields: fields.map(f => ({ label: f.label, type: f.type })),
            shareUrl: url,
          }),
        }).then(r => r.ok && setEmailSent(true)).catch(() => {});
      } else {
        // Show inline email prompt so user can add email now
        setShowEmailPrompt(true);
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save form");
    } finally {
      setSaving(false);
    }
  };

  const copyShareLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const addField = (type: FieldType) => {
    const def = FIELD_TYPES.find(f => f.type === type)!;
    const nf: FormField = { id:generateId(), type, label:def.label, placeholder:"Enter your answer", required:false, privacy:"public", options:["dropdown","multi_select"].includes(type)?["Option 1","Option 2","Option 3"]:undefined };
    setFields(p => [...p, nf]);
    setSelected(nf.id);
  };
  const removeField = (id:string) => { setFields(p => p.filter(f => f.id!==id)); if(selected===id) setSelected(null); };
  const dupField = (id:string) => {
    const f = fields.find(x => x.id===id); if(!f) return;
    const copy = { ...f, id:generateId(), label:f.label+" (copy)" };
    setFields(p => { const i = p.findIndex(x=>x.id===id); return [...p.slice(0,i+1),copy,...p.slice(i+1)]; });
  };
  const updField = (id:string, u:Partial<FormField>) => setFields(p => p.map(f => f.id===id?{...f,...u}:f));
  const sel = fields.find(f => f.id===selected);

  const s = { sidebar:{ width:220, flexShrink:0, background:"#0d1117", borderRight:"1px solid rgba(255,255,255,0.07)", overflowY:"auto" as const, padding:16 },
    canvas:{ flex:1, overflowY:"auto" as const, padding:24, background:"#070c18" },
    panel:{ width:260, flexShrink:0, background:"#0d1117", borderLeft:"1px solid rgba(255,255,255,0.07)", overflowY:"auto" as const, padding:16 } };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh", background:"#050814", color:"#e2e8f0", overflow:"hidden" }}>
      <Navbar onAuthOpen={() => setAuthOpen(true)} />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />

      {/* Topbar */}
      <div style={{ height:52, flexShrink:0, marginTop:64, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 20px", background:"rgba(5,8,20,0.95)", borderBottom:"1px solid rgba(255,255,255,0.07)", backdropFilter:"blur(20px)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <input value={title} onChange={e=>setTitle(e.target.value)} style={{ fontWeight:700, fontSize:"0.95rem", color:"#fff", background:"none", border:"none", outline:"none", padding:"4px 8px", borderRadius:7 }} />
          <span className={`badge ${saved?"badge-success":"badge-primary"}`}>{saved?"Saved":"Draft"}</span>
          {!address && <span style={{ fontSize:"0.72rem", color:"#64748b" }}>Connect wallet to save</span>}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ display:"flex", padding:4, borderRadius:9, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", gap:2 }}>
            {(["build","preview"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding:"5px 14px", borderRadius:7, border:"none", cursor:"pointer", fontSize:"0.8rem", fontWeight:600, textTransform:"capitalize", transition:"all 0.2s",
                  background:tab===t?"rgba(255,255,255,0.1)":"transparent", color:tab===t?"#fff":"#64748b" }}>
                {t==="build" ? <><Settings size={12} style={{ verticalAlign:"middle", marginRight:5 }} />Build</> : <><Eye size={12} style={{ verticalAlign:"middle", marginRight:5 }} />Preview</>}
              </button>
            ))}
          </div>
          {shareUrl && (
            <Button size="sm" variant="ghost" icon={<Share2 size={13}/>} onClick={() => setShowShareModal(true)}>
              Share
            </Button>
          )}
          {saveError && (
            <span style={{ fontSize:"0.75rem", color:"#f87171", display:"flex", alignItems:"center", gap:4 }}>
              <AlertCircle size={12}/> {saveError}
            </span>
          )}
          {editBlobId && (
            <span style={{ fontSize:"0.72rem", color:"var(--teal)", background:"rgba(0,200,224,0.08)", border:"1px solid rgba(0,200,224,0.2)", padding:"3px 10px", borderRadius:20, fontWeight:600 }}>
              Editing
            </span>
          )}
          <Button size="sm" loading={saving || editLoading} onClick={handleSave}
            icon={saved ? <Check size={13}/> : <Save size={13}/>}
            style={saved ? {background:"linear-gradient(135deg,#10b981,#059669)"} : {}}>
            {editLoading ? "Loading…" : saving ? saveStatus : saved ? "Saved!" : editBlobId ? "Save changes" : "Save"}
          </Button>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && shareUrl && (
        <div style={{ position:"fixed", inset:0, zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div onClick={() => setShowShareModal(false)} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(6px)" }} />
          <motion.div initial={{ opacity:0, scale:0.94, y:16 }} animate={{ opacity:1, scale:1, y:0 }}
            style={{ position:"relative", width:"100%", maxWidth:480, background:"#0d1117", border:"1px solid rgba(16,185,129,0.3)", borderRadius:20, padding:32, boxShadow:"0 24px 60px rgba(0,0,0,0.6)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
              <div style={{ width:44, height:44, borderRadius:12, background:"rgba(16,185,129,0.15)", border:"1px solid rgba(16,185,129,0.3)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Database size={20} color="#34d399" />
              </div>
              <div>
                <h3 style={{ fontSize:"1.1rem", fontWeight:800, color:"#fff", marginBottom:2 }}>Form stored on Walrus</h3>
                <p style={{ fontSize:"0.78rem", color:"#64748b" }}>Permanently saved on Walrus mainnet · Share the link below</p>
              </div>
            </div>
            <div style={{ display:"flex", gap:8, marginBottom:20 }}>
              <input readOnly value={shareUrl} style={{ flex:1, padding:"10px 14px", borderRadius:10, border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.03)", color:"#94a3b8", fontSize:"0.78rem", fontFamily:"monospace", outline:"none" }} />
              <Button size="sm" icon={copiedLink?<Check size={13}/>:<Copy size={13}/>} onClick={copyShareLink}
                style={copiedLink?{background:"linear-gradient(135deg,#10b981,#059669)"}:{}}>
                {copiedLink?"Copied!":"Copy"}
              </Button>
            </div>
            <a href={shareUrl} target="_blank" rel="noreferrer"
              style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:"0.82rem", color:"var(--teal)", textDecoration:"none", marginBottom: showEmailPrompt || emailSent ? 20 : 0 }}>
              <ExternalLink size={13}/> Open form in new tab
            </a>

            {/* Email prompt for creators who haven't added email yet */}
            {showEmailPrompt && !emailSent && (
              <div style={{ marginTop:16, padding:"14px 16px", borderRadius:14, background:"rgba(0,200,224,0.05)", border:"1px solid rgba(0,200,224,0.15)" }}>
                <p style={{ fontSize:"0.78rem", color:"var(--teal)", fontWeight:600, marginBottom:10 }}>
                  Want a confirmation email?
                </p>
                <div style={{ display:"flex", gap:8 }}>
                  <input type="email" className="input" placeholder="your@email.com" value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    style={{ flex:1, fontSize:"0.83rem" }} />
                  <Button size="sm" onClick={() => {
                    if (!emailInput || !address) return;
                    localStorage.setItem(`tuskform_email_${address}`, emailInput);
                    fetch("/api/email", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        type: "form_created",
                        to: emailInput,
                        formTitle: title,
                        formDescription: desc,
                        formFields: fields.map(f => ({ label: f.label, type: f.type })),
                        shareUrl,
                      }),
                    }).then(r => r.ok && setEmailSent(true)).catch(() => setEmailSent(true));
                    setShowEmailPrompt(false);
                  }}>Send</Button>
                </div>
              </div>
            )}

            {emailSent && (
              <div style={{ marginTop:12, display:"flex", alignItems:"center", gap:6, fontSize:"0.82rem", color:"#34d399" }}>
                <Check size={13}/> Confirmation email sent!
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Body */}
      <div style={{ flex:1, display:"flex", overflow:"hidden", marginTop:0 }}>
        {/* Left: field palette */}
        <div style={s.sidebar}>
          <div style={{ fontSize:"0.68rem", fontWeight:700, color:"#334155", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:14 }}>Add Fields</div>
          {GROUPS.map(group => (
            <div key={group} style={{ marginBottom:18 }}>
              <div style={{ fontSize:"0.7rem", color:"#334155", fontWeight:600, marginBottom:6 }}>{group}</div>
              {FIELD_TYPES.filter(f=>f.group===group).map(fd => (
                <button key={fd.type} onClick={() => addField(fd.type)} className="nav-item" style={{ marginBottom:2 }}>
                  <fd.icon size={13} color="#475569" />
                  <span style={{ flex:1, fontSize:"0.82rem" }}>{fd.label}</span>
                  <Plus size={11} color="#334155" />
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Canvas */}
        <div style={s.canvas}>
          {tab==="build" ? (
            <div style={{ maxWidth:640, margin:"0 auto" }}>
              {/* Form header */}
              <div className="card" style={{ padding:22, marginBottom:18 }}>
                <input value={title} onChange={e=>setTitle(e.target.value)} style={{ fontSize:"1.3rem", fontWeight:800, color:"#fff", background:"none", border:"none", outline:"none", width:"100%", marginBottom:6 }} />
                <input value={desc}  onChange={e=>setDesc(e.target.value)}  style={{ fontSize:"0.875rem", color:"#64748b", background:"none", border:"none", outline:"none", width:"100%" }} />
              </div>

              <Reorder.Group axis="y" values={fields} onReorder={setFields} style={{ listStyle:"none", padding:0, margin:0 }}>
                {fields.map(field => {
                  const fd = FIELD_TYPES.find(f=>f.type===field.type);
                  const Icon = fd?.icon ?? Type;
                  const isSel = selected===field.id;
                  return (
                    <Reorder.Item key={field.id} value={field} style={{ marginBottom:10 }}>
                      <div onClick={() => setSelected(field.id)} className={`field-card ${isSel?"selected":""}`} style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                        <div style={{ color:"#334155", cursor:"grab", marginTop:2 }}><GripVertical size={15} /></div>
                        <div style={{ width:32, height:32, borderRadius:9, background:"rgba(99,102,241,0.1)", border:"1px solid rgba(99,102,241,0.2)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                          <Icon size={14} color="#818cf8" />
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:4 }}>
                            <span style={{ fontSize:"0.875rem", fontWeight:600, color:"#fff" }}>{field.label}</span>
                            {field.required && <span className="badge badge-danger">Required</span>}
                            {field.privacy==="encrypted" && <span className="badge badge-violet">🔒 Encrypted</span>}
                            {field.privacy==="admin_only" && <span className="badge badge-warning">Admin only</span>}
                          </div>
                          <div style={{ fontSize:"0.72rem", color:"#475569" }}>{fd?.label}</div>
                        </div>
                        <div style={{ display:"flex", gap:4, opacity: isSel?1:0, transition:"opacity 0.15s" }}>
                          <button onClick={e=>{e.stopPropagation();dupField(field.id);}} style={{ padding:"4px 6px", borderRadius:7, background:"none", border:"none", cursor:"pointer", color:"#475569" }}><Copy size={13}/></button>
                          <button onClick={e=>{e.stopPropagation();removeField(field.id);}} style={{ padding:"4px 6px", borderRadius:7, background:"none", border:"none", cursor:"pointer", color:"#475569" }}><Trash2 size={13}/></button>
                        </div>
                      </div>
                    </Reorder.Item>
                  );
                })}
              </Reorder.Group>

              <button onClick={() => addField("short_text")} style={{ width:"100%", padding:"14px 0", borderRadius:14, border:"2px dashed rgba(255,255,255,0.1)", background:"none", color:"#475569", fontSize:"0.85rem", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginTop:4, transition:"all 0.2s" }}
                onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor="rgba(99,102,241,0.3)";(e.currentTarget as HTMLElement).style.color="#818cf8";}}
                onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor="rgba(255,255,255,0.1)";(e.currentTarget as HTMLElement).style.color="#475569";}}>
                <Plus size={15}/> Add a field
              </button>
              <div style={{ display:"flex", justifyContent:"flex-end", marginTop:24 }}>
                <Button size="md" iconRight={<ArrowRight size={16}/>} style={{ opacity:0.75, pointerEvents:"none" }}>Submit response</Button>
              </div>
            </div>
          ) : (
            <FormPreview title={title} description={desc} fields={fields} />
          )}
        </div>

        {/* Right: settings */}
        <div style={s.panel}>
          <AnimatePresence mode="wait">
            {sel ? (
              <motion.div key={sel.id} initial={{ opacity:0, x:8 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0 }}>
                <div style={{ fontSize:"0.68rem", fontWeight:700, color:"#334155", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:16 }}>Field Settings</div>
                <div style={{ marginBottom:14 }}>
                  <label style={{ display:"block", fontSize:"0.72rem", fontWeight:600, color:"#64748b", marginBottom:6 }}>Label</label>
                  <input className="input" value={sel.label} onChange={e=>updField(sel.id,{label:e.target.value})} />
                </div>
                {!["star_rating","checkbox","confirmation","date"].includes(sel.type) && (
                  <div style={{ marginBottom:14 }}>
                    <label style={{ display:"block", fontSize:"0.72rem", fontWeight:600, color:"#64748b", marginBottom:6 }}>Placeholder</label>
                    <input className="input" value={sel.placeholder||""} onChange={e=>updField(sel.id,{placeholder:e.target.value})} />
                  </div>
                )}
                {sel.options && (
                  <div style={{ marginBottom:14 }}>
                    <label style={{ display:"block", fontSize:"0.72rem", fontWeight:600, color:"#64748b", marginBottom:6 }}>Options</label>
                    {sel.options.map((opt,i) => (
                      <div key={i} style={{ display:"flex", gap:6, marginBottom:6 }}>
                        <input className="input" value={opt} style={{ flex:1 }} onChange={e=>{ const o=[...(sel.options||[])];o[i]=e.target.value;updField(sel.id,{options:o}); }} />
                        <button onClick={()=>updField(sel.id,{options:sel.options?.filter((_,j)=>j!==i)})} style={{ padding:"0 8px", borderRadius:7, border:"none", background:"none", cursor:"pointer", color:"#475569" }}><Trash2 size={13}/></button>
                      </div>
                    ))}
                    <button onClick={()=>updField(sel.id,{options:[...(sel.options||[]),`Option ${(sel.options?.length||0)+1}`]})}
                      style={{ fontSize:"0.78rem", color:"#818cf8", background:"none", border:"none", cursor:"pointer", padding:"4px 0", display:"flex", alignItems:"center", gap:4 }}>
                      <Plus size={11}/> Add option
                    </button>
                  </div>
                )}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 0", borderTop:"1px solid rgba(255,255,255,0.07)", marginBottom:4 }}>
                  <div>
                    <div style={{ fontSize:"0.85rem", fontWeight:600, color:"#fff" }}>Required</div>
                    <div style={{ fontSize:"0.72rem", color:"#475569" }}>Must be answered</div>
                  </div>
                  <button onClick={()=>updField(sel.id,{required:!sel.required})} className={`toggle ${sel.required?"on":""}`} />
                </div>
                <div style={{ borderTop:"1px solid rgba(255,255,255,0.07)", paddingTop:14 }}>
                  <label style={{ display:"block", fontSize:"0.72rem", fontWeight:600, color:"#64748b", marginBottom:8 }}>Data Privacy</label>
                  {PRIVACY.map(p => (
                    <button key={p.value} onClick={()=>updField(sel.id,{privacy:p.value})}
                      style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10, border:`1px solid ${sel.privacy===p.value?"rgba(99,102,241,0.35)":"rgba(255,255,255,0.07)"}`, background:sel.privacy===p.value?"rgba(99,102,241,0.1)":"rgba(255,255,255,0.03)", cursor:"pointer", marginBottom:6, transition:"all 0.15s" }}>
                      <p.icon size={13} color={p.color} />
                      <span style={{ fontSize:"0.83rem", fontWeight:600, color:sel.privacy===p.value?"#fff":"#94a3b8", flex:1, textAlign:"left" }}>{p.label}</span>
                      {sel.privacy===p.value && <Check size={13} color="#818cf8" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity:0 }} animate={{ opacity:1 }} style={{ textAlign:"center", paddingTop:60, color:"#334155" }}>
                <Settings size={28} style={{ marginBottom:10, opacity:0.3 }} />
                <p style={{ fontSize:"0.82rem" }}>Select a field to configure</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function FormPreview({ title, description, fields }: { title:string; description:string; fields:FormField[] }) {
  const [step, setStep] = useState(0);
  const [rating, setRating] = useState(0);
  const cur = fields[step];
  const fd = FIELD_TYPES.find(f=>f.type===cur?.type);
  return (
    <div style={{ maxWidth:560, margin:"0 auto" }}>
      <motion.div key={step} initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
        className="card" style={{ overflow:"visible" }}>
        <div style={{ height:3, background:"rgba(255,255,255,0.05)", borderRadius:"16px 16px 0 0" }}>
          <motion.div animate={{ width:`${((step+1)/fields.length)*100}%` }} transition={{ duration:0.5 }}
            style={{ height:"100%", background:"linear-gradient(90deg,#6366f1,#8b5cf6)", borderRadius:"16px 16px 0 0" }} />
        </div>
        <div style={{ padding:32 }}>
          {step===0 && <div style={{ marginBottom:28 }}>
            <h1 style={{ fontSize:"1.5rem", fontWeight:800, color:"#fff", marginBottom:8 }}>{title}</h1>
            <p style={{ fontSize:"0.875rem", color:"#64748b" }}>{description}</p>
          </div>}
          {cur && <>
            <div style={{ fontSize:"0.72rem", color:"#334155", marginBottom:8 }}>{step+1} of {fields.length}</div>
            <label style={{ display:"block", fontSize:"1.1rem", fontWeight:700, color:"#fff", marginBottom:20 }}>
              {cur.label}{cur.required && <span style={{ color:"#f87171" }}> *</span>}
            </label>
            {cur.type==="short_text"   && <input className="input" style={{ fontSize:"1rem" }} placeholder={cur.placeholder} />}
            {cur.type==="long_text"    && <textarea className="input" rows={4} placeholder={cur.placeholder} style={{ resize:"none", fontSize:"0.95rem" }} />}
            {cur.type==="wallet_address"&&<input className="input" style={{ fontFamily:"monospace" }} placeholder="0x..." />}
            {cur.type==="date"         && <input type="date" className="input" />}
            {cur.type==="star_rating"  && (
              <div style={{ display:"flex", gap:12 }}>
                {[1,2,3,4,5].map(s => (
                  <motion.button key={s} whileHover={{ scale:1.3 }} whileTap={{ scale:0.85 }} onClick={()=>setRating(s)}
                    style={{ background:"none", border:"none", cursor:"pointer", fontSize:"2rem", color:s<=rating?"#f59e0b":"#334155", transition:"color 0.15s" }}>★</motion.button>
                ))}
              </div>
            )}
            {["dropdown","multi_select"].includes(cur.type) && (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {cur.options?.map(opt => (
                  <button key={opt} className="choice-btn">{opt}</button>
                ))}
              </div>
            )}
            {["file_upload","image_upload","video_upload","audio_upload"].includes(cur.type) && (
              <div style={{ border:"2px dashed rgba(255,255,255,0.1)", borderRadius:16, padding:40, textAlign:"center", color:"#475569", fontSize:"0.875rem" }}>
                <Upload size={28} style={{ marginBottom:8, opacity:0.4 }} />
                <div>Drop file here or click to upload</div>
                <div style={{ fontSize:"0.72rem", marginTop:4, color:"#334155" }}>Stored permanently on Walrus</div>
              </div>
            )}
          </>}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:28 }}>
            <button onClick={()=>setStep(Math.max(0,step-1))} disabled={step===0}
              style={{ background:"none", border:"none", color:"#475569", cursor:"pointer", fontSize:"0.875rem", opacity:step===0?0.3:1 }}>← Back</button>
            <Button onClick={()=>{ if(step<fields.length-1) setStep(step+1); }}
              iconRight={step===fields.length-1?<Check size={15}/>:<ArrowRight size={15}/>}>
              {step===fields.length-1?"Submit":"Next"}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
