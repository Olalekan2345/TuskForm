"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import Image from "next/image";
import { fetchFromWalrus, storeOnWalrus, storeFileOnWalrus } from "@/lib/walrus";
import { isEncryptedField, encryptField, encryptFieldSeal } from "@/lib/seal";
import { Button } from "@/components/ui/Button";
import { useWalletStore } from "@/lib/walletStore";
import type { FormSchema, FormResponse, FieldResponse } from "@/lib/types";
import {
  ArrowRight, Check, Star, Upload, Shield, Database,
  ChevronLeft, Keyboard, AlertCircle, Loader2, Lock, Wallet, LogOut, Copy
} from "lucide-react";

const WalrusWatermark = dynamic(() => import("@/components/WalrusWatermark"), { ssr: false });

export default function FormViewerPage() {
  const params    = useParams();
  const blobId    = params.id as string;

  const address        = useWalletStore(s => s.address);
  const wallets        = useWalletStore(s => s.wallets);
  const connect        = useWalletStore(s => s.connect);
  const disconnect     = useWalletStore(s => s.disconnect);
  const isConnecting   = useWalletStore(s => s.isConnecting);

  const [schema, setSchema]       = useState<FormSchema|null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string|null>(null);
  const [step, setStep]           = useState(-1); // -1 = welcome screen
  const [answers, setAnswers]     = useState<Record<string, string|string[]>>({});
  const [rating, setRating]       = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [selected, setSelected]   = useState<string>("");
  const [multiSel, setMultiSel]   = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string|null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [responseBlobId, setResponseBlobId] = useState<string|null>(null);
  const [respondentEmail, setRespondentEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);
  const [addrCopied, setAddrCopied] = useState(false);

  useEffect(() => {
    if (!blobId) return;
    fetchFromWalrus<FormSchema>(blobId)
      .then(data => { setSchema(data); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [blobId]);

  if (loading) {
    return (
      <div style={{ minHeight:"100vh", background:"#050814", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ textAlign:"center", color:"#475569" }}>
          <Loader2 size={32} style={{ margin:"0 auto 16px", animation:"spin 1s linear infinite" }} color="#818cf8" />
          <p style={{ fontSize:"0.9rem" }}>Loading form from Walrus…</p>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (error || !schema) {
    return (
      <div style={{ minHeight:"100vh", background:"#050814", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ textAlign:"center", color:"#475569", maxWidth:400, padding:24 }}>
          <AlertCircle size={40} color="#f87171" style={{ margin:"0 auto 16px" }} />
          <h2 style={{ fontSize:"1.2rem", fontWeight:700, color:"#fff", marginBottom:8 }}>Form not found</h2>
          <p style={{ fontSize:"0.85rem", marginBottom:4 }}>Could not load form from Walrus.</p>
          <p style={{ fontSize:"0.75rem", color:"#334155" }}>{error}</p>
        </div>
      </div>
    );
  }

  const fields     = schema.fields;
  const field      = step >= 0 ? fields[step] : null;
  const progress   = step < 0 ? 0 : (step + 1) / fields.length;
  const isLastStep = step === fields.length - 1;

  const goNext = () => {
    if (step < fields.length - 1) { setStep(s => s + 1); setSelected(""); setRating(0); setHoverRating(0); setUploadedFile(null); setUploadProgress(0); }
    else handleSubmit();
  };

  const handleFileSelect = async (file: File) => {
    if (!field) return;
    setUploading(true);
    setUploadedFile(file.name);
    try {
      const result = await storeFileOnWalrus(file, pct => setUploadProgress(pct));
      // Store blobId + metadata as the answer so it can be retrieved later
      setAnswer(JSON.stringify({ blobId: result.blobId, fileName: result.fileName, fileType: result.fileType, fileSize: result.fileSize }));
    } catch (err) {
      alert("Upload failed: " + (err instanceof Error ? err.message : "Unknown error"));
      setUploadedFile(null);
    } finally {
      setUploading(false);
    }
  };
  const goPrev = () => {
    if (step > 0) setStep(s => s - 1);
    else setStep(-1);
  };

  const setAnswer = (val: string|string[]) => {
    if (!field) return;
    setAnswers(prev => ({ ...prev, [field.id]: val }));
  };

  const handleSubmit = async () => {
    if (!schema) return;
    setSubmitting(true);
    try {
      const responses: FieldResponse[] = await Promise.all(
        schema.fields.map(async f => {
          const raw = answers[f.id] ?? "";
          const shouldEncrypt = isEncryptedField(f.privacy) && raw !== "";
          let value: string;
          if (shouldEncrypt) {
            if (schema.sealPackageId) {
              // v3: Seal threshold IBE
              value = await encryptFieldSeal(String(raw), schema.createdBy, schema.sealPackageId);
            } else if (schema.encryptionPublicKey) {
              // v2: ECDH fallback
              value = await encryptField(String(raw), schema.encryptionPublicKey);
            } else {
              value = String(raw); // No encryption key — store plaintext
            }
          } else {
            value = String(raw);
          }
          return { fieldId: f.id, fieldLabel: f.label, fieldType: f.type, value, encrypted: isEncryptedField(f.privacy) };
        })
      );

      const response: FormResponse = {
        formId:      blobId,
        formTitle:   schema.title,
        respondedAt: Date.now(),
        responses,
        ...(address ? { respondentWallet: address } : {}),
      };

      const rBlobId = await storeOnWalrus(response);
      setResponseBlobId(rBlobId);

      await fetch("/api/responses", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ formId: blobId, responseBlobId: rBlobId }),
      });

      // Send email copy to respondent if they provided an email
      if (respondentEmail) {
        const publicResponses = responses
          .filter(r => !r.encrypted)
          .map(r => ({ label: r.fieldLabel, value: r.value }));
        fetch("/api/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "response_copy",
            to: respondentEmail,
            formTitle: schema.title,
            responses: publicResponses,
            respondedAt: response.respondedAt,
          }),
        }).then(() => setEmailSent(true)).catch(() => {});
      }

      setSubmitted(true);
    } catch (err) {
      alert("Submission failed: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", position:"relative", overflow:"hidden", display:"flex", flexDirection:"column" }}>
      <WalrusWatermark />
      {/* Background orbs */}
      <div style={{ position:"absolute", inset:0, pointerEvents:"none" }}>
        <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 80% 60% at 50% -20%,rgba(99,102,241,0.12),transparent)" }} />
        <motion.div animate={{ scale:[1,1.2,1], opacity:[0.15,0.3,0.15] }} transition={{ duration:10, repeat:Infinity }}
          style={{ position:"absolute", top:"20%", left:"30%", width:400, height:400, background:"rgba(99,102,241,0.08)", borderRadius:"50%", filter:"blur(80px)" }} />
      </div>

      {/* Header */}
      <div style={{ position:"relative", zIndex:10, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 24px", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <Image src="/logo.jpg" alt="TuskForm" width={22} height={22} style={{ borderRadius:6, objectFit:"cover" }} />
          <span style={{ fontSize:"1rem", fontWeight:800, color:"var(--ink)", fontFamily:"var(--font-display)", letterSpacing:"-0.03em" }}>Tusk<span style={{ color:"var(--teal)" }}>Form</span></span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:20, background:"rgba(6,182,212,0.1)", border:"1px solid rgba(6,182,212,0.2)", fontSize:"0.7rem", fontWeight:600, color:"#22d3ee" }}>
            <Database size={10}/> Walrus
          </div>
          {schema.fields.some(f => isEncryptedField(f.privacy)) && (
            <div style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:20, background:"rgba(139,92,246,0.1)", border:"1px solid rgba(139,92,246,0.2)", fontSize:"0.7rem", fontWeight:600, color:"#a78bfa" }}>
              <Shield size={10}/> Seal
            </div>
          )}
          {/* Wallet connect — header */}
          {address ? (
            <div style={{ position:"relative" }}>
              <button
                onClick={() => setWalletMenuOpen(o => !o)}
                style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:20, background:"rgba(0,200,224,0.08)", border:"1px solid rgba(0,200,224,0.25)", fontSize:"0.7rem", fontWeight:600, color:"var(--teal-pale)", cursor:"pointer", fontFamily:"monospace" }}>
                <Wallet size={10}/> {address.slice(0,6)}…{address.slice(-4)}
              </button>
              {walletMenuOpen && (
                <div style={{ position:"absolute", top:"calc(100% + 8px)", right:0, background:"rgba(9,16,31,0.98)", border:"1px solid var(--glass-border)", borderRadius:12, padding:8, zIndex:100, minWidth:160, backdropFilter:"blur(20px)" }}>
                  <button onClick={() => { navigator.clipboard.writeText(address); setAddrCopied(true); setTimeout(()=>setAddrCopied(false),2000); }}
                    style={{ display:"flex", alignItems:"center", gap:8, width:"100%", padding:"8px 12px", borderRadius:8, background:"none", border:"none", color:"var(--ink-muted)", fontSize:"0.78rem", cursor:"pointer", textAlign:"left" }}>
                    <Copy size={12}/> {addrCopied ? "Copied!" : "Copy address"}
                  </button>
                  <button onClick={() => { disconnect?.(); setWalletMenuOpen(false); }}
                    style={{ display:"flex", alignItems:"center", gap:8, width:"100%", padding:"8px 12px", borderRadius:8, background:"none", border:"none", color:"#f87171", fontSize:"0.78rem", cursor:"pointer", textAlign:"left" }}>
                    <LogOut size={12}/> Disconnect
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ position:"relative" }}>
              <button
                onClick={() => setWalletMenuOpen(o => !o)}
                style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:20, background:"rgba(255,255,255,0.04)", border:"1px solid var(--glass-border)", fontSize:"0.7rem", fontWeight:600, color:"var(--ink-muted)", cursor:"pointer" }}>
                <Wallet size={10}/> Connect wallet
              </button>
              {walletMenuOpen && wallets.length > 0 && (
                <div style={{ position:"absolute", top:"calc(100% + 8px)", right:0, background:"rgba(9,16,31,0.98)", border:"1px solid var(--glass-border)", borderRadius:12, padding:8, zIndex:100, minWidth:180, backdropFilter:"blur(20px)" }}>
                  <p style={{ fontSize:"0.68rem", color:"var(--ink-faint)", padding:"4px 12px 8px", margin:0 }}>Optional — links your wallet to this response</p>
                  {wallets.map(w => (
                    <button key={w.name} onClick={() => { connect?.(w.name); setWalletMenuOpen(false); }}
                      style={{ display:"flex", alignItems:"center", gap:8, width:"100%", padding:"8px 12px", borderRadius:8, background:"none", border:"none", color:"var(--ink)", fontSize:"0.82rem", cursor:"pointer", textAlign:"left" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {w.icon && <img src={w.icon} alt={w.name} width={18} height={18} style={{ borderRadius:4 }}/>}
                      {isConnecting === w.name ? "Connecting…" : w.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {step >= 0 && !submitted && (
        <div style={{ position:"relative", zIndex:10, height:2, background:"rgba(255,255,255,0.05)" }}>
          <motion.div animate={{ width:`${progress*100}%` }} transition={{ duration:0.5 }}
            style={{ height:"100%", background:"linear-gradient(90deg,#6366f1,#8b5cf6)" }} />
        </div>
      )}

      {/* Main content */}
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"40px 16px", position:"relative", zIndex:10 }}>
        <AnimatePresence mode="wait">

          {/* Welcome */}
          {step === -1 && (
            <motion.div key="welcome"
              initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-20 }}
              style={{ width:"100%", maxWidth:560, textAlign:"center" }}>
              <motion.div initial={{ scale:0.8, opacity:0 }} animate={{ scale:1, opacity:1 }} transition={{ delay:0.1 }}
                style={{ width:80, height:80, margin:"0 auto 28px", borderRadius:24, overflow:"hidden", boxShadow:"0 24px 60px rgba(0,200,224,0.3)" }}>
                <Image src="/logo.jpg" alt="TuskForm" width={80} height={80} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              </motion.div>
              <h1 style={{ fontSize:"2rem", fontWeight:900, color:"#fff", marginBottom:16, lineHeight:1.2 }}>{schema.title}</h1>
              {schema.description && (
                <p style={{ color:"#94a3b8", marginBottom:36, fontSize:"1rem", lineHeight:1.7 }}>{schema.description}</p>
              )}
              <Button size="lg" onClick={() => setStep(0)} iconRight={<ArrowRight size={18}/>}>
                Start · {fields.length} {fields.length===1?"question":"questions"}
              </Button>

              {/* Optional wallet connect on welcome */}
              <div style={{ marginTop:20 }}>
                {address ? (
                  <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"8px 16px", borderRadius:20, background:"rgba(0,200,224,0.08)", border:"1px solid rgba(0,200,224,0.2)", fontSize:"0.78rem", color:"var(--teal-pale)" }}>
                    <Wallet size={13}/> Wallet connected: {address.slice(0,8)}…{address.slice(-4)}
                    <button onClick={() => disconnect?.()} style={{ background:"none", border:"none", color:"#f87171", cursor:"pointer", fontSize:"0.72rem", padding:0 }}>Disconnect</button>
                  </div>
                ) : (
                  <div>
                    {wallets.length > 0 ? (
                      <div>
                        <p style={{ fontSize:"0.75rem", color:"#475569", marginBottom:10 }}>
                          <Wallet size={11} style={{ display:"inline", marginRight:4 }}/>
                          Connect wallet <span style={{ color:"#334155" }}>(optional)</span> — links your identity to this response
                        </p>
                        <div style={{ display:"flex", flexWrap:"wrap", justifyContent:"center", gap:8 }}>
                          {wallets.map(w => (
                            <button key={w.name} onClick={() => connect?.(w.name)}
                              style={{ display:"inline-flex", alignItems:"center", gap:7, padding:"6px 14px", borderRadius:20, background:"rgba(255,255,255,0.04)", border:"1px solid var(--glass-border)", color:"var(--ink-muted)", fontSize:"0.78rem", cursor:"pointer" }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              {w.icon && <img src={w.icon} alt={w.name} width={16} height={16} style={{ borderRadius:3 }}/>}
                              {isConnecting === w.name ? "Connecting…" : w.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p style={{ fontSize:"0.72rem", color:"#334155" }}>
                        <Wallet size={11} style={{ display:"inline", marginRight:4 }}/>
                        Install a Sui wallet to optionally link your identity
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div style={{ marginTop:20, display:"flex", alignItems:"center", justifyContent:"center", gap:16, fontSize:"0.75rem", color:"#334155" }}>
                <span style={{ display:"flex", alignItems:"center", gap:5 }}><Database size={11} color="#22d3ee"/> Stored on Walrus</span>
                <span>·</span>
                <span style={{ display:"flex", alignItems:"center", gap:5 }}><Shield size={11} color="#a78bfa"/> Seal protected</span>
              </div>
            </motion.div>
          )}

          {/* Success */}
          {submitted && (
            <motion.div key="success"
              initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0 }}
              style={{ width:"100%", maxWidth:520, textAlign:"center" }}>
              <motion.div initial={{ scale:0, opacity:0 }} animate={{ scale:1, opacity:1 }} transition={{ type:"spring", damping:15, stiffness:200 }}
                style={{ width:88, height:88, margin:"0 auto 28px", borderRadius:"50%", background:"linear-gradient(135deg,#10b981,#0d9488)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 24px 60px rgba(16,185,129,0.35)" }}>
                <Check size={44} color="#fff" />
              </motion.div>
              <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.25 }}>
                <h2 style={{ fontSize:"2rem", fontWeight:900, color:"#fff", marginBottom:12 }}>Response submitted!</h2>
                <p style={{ color:"var(--ink-muted)", fontSize:"1rem", marginBottom: emailSent ? 16 : 36, lineHeight:1.7 }}>
                  Your response has been permanently stored on Walrus.
                </p>
                {emailSent && (
                  <p style={{ fontSize:"0.85rem", color:"var(--teal)", marginBottom:36, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                    <Check size={14}/> Copy sent to {respondentEmail}
                  </p>
                )}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, maxWidth:300, margin:"0 auto 36px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", borderRadius:14, background:"rgba(6,182,212,0.06)", border:"1px solid rgba(6,182,212,0.2)" }}>
                    <Database size={15} color="#22d3ee"/>
                    <div style={{ textAlign:"left" }}>
                      <div style={{ fontSize:"0.75rem", fontWeight:700, color:"#fff" }}>Walrus</div>
                      <div style={{ fontSize:"0.68rem", color:"#475569" }}>Stored ✓</div>
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", borderRadius:14, background:"rgba(139,92,246,0.06)", border:"1px solid rgba(139,92,246,0.2)" }}>
                    <Shield size={15} color="#a78bfa"/>
                    <div style={{ textAlign:"left" }}>
                      <div style={{ fontSize:"0.75rem", fontWeight:700, color:"#fff" }}>Seal</div>
                      <div style={{ fontSize:"0.68rem", color:"#475569" }}>Protected ✓</div>
                    </div>
                  </div>
                </div>
                {responseBlobId && (
                  <p style={{ fontSize:"0.7rem", color:"#334155", fontFamily:"monospace", wordBreak:"break-all" }}>
                    Response ID: {responseBlobId}
                  </p>
                )}
              </motion.div>
            </motion.div>
          )}

          {/* Active field */}
          {step >= 0 && !submitted && field && (
            <motion.div key={`field-${step}`}
              initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-24 }}
              transition={{ type:"spring", damping:25, stiffness:300 }}
              style={{ width:"100%", maxWidth:580 }}>

              <div style={{ fontSize:"0.72rem", color:"#475569", marginBottom:14 }}>
                {step+1} of {fields.length}
              </div>
              <h2 style={{ fontSize:"1.7rem", fontWeight:900, color:"#fff", marginBottom: field.type==="long_text"?8:32, lineHeight:1.25 }}>
                {field.label}
                {field.required && <span style={{ color:"#f87171" }}> *</span>}
              </h2>
              {!field.required && field.type === "long_text" && (
                <p style={{ fontSize:"0.75rem", color:"#475569", marginBottom:24 }}>Optional</p>
              )}

              {/* Encrypted notice */}
              {isEncryptedField(field.privacy) && (
                <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", borderRadius:10, background:"rgba(139,92,246,0.08)", border:"1px solid rgba(139,92,246,0.2)", marginBottom:20 }}>
                  <Lock size={12} color="#a78bfa"/>
                  <span style={{ fontSize:"0.72rem", color:"#a78bfa" }}>This field is Seal-encrypted. Only the form owner can decrypt it.</span>
                </div>
              )}

              {/* Short text */}
              {(field.type==="short_text"||field.type==="url") && (
                <input autoFocus className="form-underline-input"
                  placeholder={field.placeholder || "Your answer…"}
                  value={(answers[field.id] as string) || ""}
                  onChange={e => setAnswer(e.target.value)}
                  onKeyDown={e => e.key==="Enter" && goNext()} />
              )}

              {/* Long text */}
              {(field.type==="long_text"||field.type==="rich_text") && (
                <textarea autoFocus rows={5}
                  style={{ width:"100%", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:16, padding:16, color:"#fff", fontSize:"1rem", resize:"none", outline:"none", fontFamily:"inherit", boxSizing:"border-box" }}
                  placeholder={field.placeholder || "Your answer…"}
                  value={(answers[field.id] as string) || ""}
                  onChange={e => setAnswer(e.target.value)}
                  onFocus={e => (e.currentTarget.style.borderColor="rgba(99,102,241,0.5)")}
                  onBlur={e  => (e.currentTarget.style.borderColor="rgba(255,255,255,0.1)")} />
              )}

              {/* Wallet address */}
              {field.type==="wallet_address" && (
                <input autoFocus className="form-underline-input"
                  placeholder="0x…"
                  style={{ fontFamily:"monospace" }}
                  value={(answers[field.id] as string) || ""}
                  onChange={e => setAnswer(e.target.value)}
                  onKeyDown={e => e.key==="Enter" && goNext()} />
              )}

              {/* Date */}
              {field.type==="date" && (
                <input type="date" className="input"
                  style={{ fontSize:"1rem", padding:"12px 16px" }}
                  value={(answers[field.id] as string) || ""}
                  onChange={e => setAnswer(e.target.value)} />
              )}

              {/* Checkbox / confirmation */}
              {(field.type==="checkbox"||field.type==="confirmation") && (
                <button onClick={() => setAnswer(answers[field.id]==="yes"?"":"yes")}
                  style={{ display:"flex", alignItems:"center", gap:14, padding:"16px 20px", borderRadius:16, border:`1px solid ${answers[field.id]==="yes"?"rgba(99,102,241,0.5)":"rgba(255,255,255,0.1)"}`, background:answers[field.id]==="yes"?"rgba(99,102,241,0.12)":"rgba(255,255,255,0.03)", cursor:"pointer" }}>
                  <div style={{ width:22, height:22, borderRadius:6, border:`2px solid ${answers[field.id]==="yes"?"#818cf8":"rgba(255,255,255,0.2)"}`, background:answers[field.id]==="yes"?"#6366f1":"none", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {answers[field.id]==="yes" && <Check size={13} color="#fff"/>}
                  </div>
                  <span style={{ fontSize:"1rem", color:answers[field.id]==="yes"?"#fff":"#94a3b8" }}>I confirm</span>
                </button>
              )}

              {/* Star rating */}
              {field.type==="star_rating" && (
                <div style={{ display:"flex", gap:14, marginBottom:16 }}>
                  {[1,2,3,4,5].map(s => (
                    <motion.button key={s} whileHover={{ scale:1.3 }} whileTap={{ scale:0.9 }}
                      onMouseEnter={() => setHoverRating(s)} onMouseLeave={() => setHoverRating(0)}
                      onClick={() => { setRating(s); setAnswer(String(s)); setTimeout(goNext, 400); }}
                      style={{ background:"none", border:"none", cursor:"pointer", padding:4 }}>
                      <Star size={46} fill={s<=(hoverRating||rating)?"#f59e0b":"none"} color={s<=(hoverRating||rating)?"#f59e0b":"#334155"}/>
                    </motion.button>
                  ))}
                </div>
              )}

              {/* Dropdown / multi_select */}
              {(field.type==="dropdown"||field.type==="multi_select") && (
                <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:8 }}>
                  {field.options?.map(opt => {
                    const isMulti = field.type==="multi_select";
                    const active  = isMulti ? multiSel.includes(opt) : selected===opt;
                    return (
                      <motion.button key={opt} whileHover={{ scale:1.01 }} whileTap={{ scale:0.99 }}
                        onClick={() => {
                          if (isMulti) {
                            const n = multiSel.includes(opt)?multiSel.filter(x=>x!==opt):[...multiSel,opt];
                            setMultiSel(n); setAnswer(n);
                          } else {
                            setSelected(opt); setAnswer(opt); if(field.type==="dropdown") setTimeout(goNext,300);
                          }
                        }}
                        style={{ display:"flex", alignItems:"center", justifyContent:"space-between", textAlign:"left", padding:"14px 20px", borderRadius:16, border:`1px solid ${active?"rgba(99,102,241,0.5)":"rgba(255,255,255,0.1)"}`, background:active?"rgba(99,102,241,0.12)":"rgba(255,255,255,0.03)", cursor:"pointer", color:active?"#fff":"#cbd5e1", fontSize:"0.95rem" }}>
                        {opt}
                        {active && <Check size={15} color="#818cf8"/>}
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {/* File upload */}
              {(field.type==="file_upload"||field.type==="image_upload"||field.type==="video_upload"||field.type==="audio_upload") && (
                <motion.div
                  onDragEnter={() => setIsDragging(true)} onDragLeave={() => setIsDragging(false)} onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); setIsDragging(false); const f=e.dataTransfer.files[0]; if(f) handleFileSelect(f); }}
                  animate={{ borderColor:isDragging?"rgba(99,102,241,0.6)":"rgba(255,255,255,0.1)" }}
                  style={{ position:"relative", border:"2px dashed rgba(255,255,255,0.1)", borderRadius:24, padding:"56px 32px", textAlign:"center", cursor: uploading ? "wait" : "pointer", background:isDragging?"rgba(99,102,241,0.05)":"rgba(255,255,255,0.02)" }}>
                  {uploading ? (
                    <>
                      <Loader2 size={38} color="#818cf8" style={{ margin:"0 auto 14px", animation:"spin 1s linear infinite" }} />
                      <div style={{ fontSize:"0.9rem", fontWeight:600, color:"#fff", marginBottom:8 }}>Uploading to Walrus…</div>
                      <div style={{ height:4, borderRadius:4, background:"rgba(255,255,255,0.08)", overflow:"hidden", maxWidth:240, margin:"0 auto" }}>
                        <motion.div animate={{ width:`${uploadProgress}%` }} style={{ height:"100%", background:"linear-gradient(90deg,#6366f1,#22d3ee)", borderRadius:4 }} />
                      </div>
                      <div style={{ fontSize:"0.72rem", color:"#475569", marginTop:8 }}>{uploadProgress}%</div>
                    </>
                  ) : uploadedFile ? (
                    <>
                      <div style={{ width:48, height:48, margin:"0 auto 14px", borderRadius:16, background:"rgba(16,185,129,0.15)", border:"1px solid rgba(16,185,129,0.3)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <Check size={24} color="#34d399"/>
                      </div>
                      <div style={{ fontSize:"0.9rem", fontWeight:600, color:"#fff", marginBottom:4 }}>{uploadedFile}</div>
                      <div style={{ fontSize:"0.72rem", color:"#34d399" }}>Stored on Walrus mainnet ✓</div>
                    </>
                  ) : (
                    <>
                      <Upload size={38} color="#334155" style={{ margin:"0 auto 14px" }}/>
                      <div style={{ fontSize:"0.95rem", fontWeight:500, color:"#94a3b8", marginBottom:4 }}>Drop your file here</div>
                      <div style={{ fontSize:"0.75rem", color:"#475569", marginBottom:12 }}>or click to browse · max 10 MiB</div>
                      <div style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:"0.72rem", color:"#22d3ee" }}>
                        <Database size={11}/> Stored permanently on Walrus
                      </div>
                    </>
                  )}
                  <input type="file" disabled={uploading} style={{ position:"absolute", inset:0, opacity:0, cursor: uploading ? "wait" : "pointer" }}
                    onChange={e => { if(e.target.files?.[0]) handleFileSelect(e.target.files[0]); }} />
                </motion.div>
              )}

              {/* Optional email capture on last step */}
              {isLastStep && (
                <div style={{ marginTop:24, padding:"16px", borderRadius:14, border:"1px solid rgba(0,200,224,0.15)", background:"rgba(0,200,224,0.04)" }}>
                  <label style={{ display:"block", fontSize:"0.72rem", fontWeight:600, color:"var(--teal)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>
                    Email me a copy (optional)
                  </label>
                  <input
                    type="email"
                    className="input"
                    placeholder="you@example.com"
                    value={respondentEmail}
                    onChange={e => setRespondentEmail(e.target.value)}
                    style={{ fontSize:"0.9rem" }}
                  />
                  <p style={{ fontSize:"0.72rem", color:"var(--ink-muted)", marginTop:6 }}>
                    We'll send you a copy of your responses. No sign-up required.
                  </p>
                </div>
              )}

              {/* Nav buttons */}
              {field.type !== "star_rating" && field.type !== "dropdown" && (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:32 }}>
                  <button onClick={goPrev}
                    style={{ display:"flex", alignItems:"center", gap:6, fontSize:"0.85rem", color:"#64748b", background:"none", border:"none", cursor:"pointer" }}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color="#fff"}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color="#64748b"}>
                    <ChevronLeft size={16}/> Back
                  </button>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    {(field.type==="short_text"||field.type==="url"||field.type==="wallet_address") && (
                      <span style={{ fontSize:"0.7rem", color:"#334155", display:"flex", alignItems:"center", gap:4 }}>
                        <Keyboard size={11}/> Enter
                      </span>
                    )}
                    <Button loading={submitting && isLastStep} onClick={goNext} iconRight={<ArrowRight size={15}/>}>
                      {isLastStep ? (submitting ? "Submitting…" : "Submit") : (field.required ? "Continue" : "Skip or Continue")}
                    </Button>
                  </div>
                </div>
              )}
              {field.type === "star_rating" && (
                <div style={{ marginTop:8 }}>
                  <button onClick={goPrev}
                    style={{ display:"flex", alignItems:"center", gap:6, fontSize:"0.85rem", color:"#64748b", background:"none", border:"none", cursor:"pointer" }}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color="#fff"}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color="#64748b"}>
                    <ChevronLeft size={16}/> Back
                  </button>
                </div>
              )}
              {field.type === "multi_select" && (
                <div style={{ display:"flex", justifyContent:"flex-end", marginTop:16 }}>
                  <Button onClick={goNext} iconRight={<ArrowRight size={15}/>}>Continue</Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div style={{ position:"relative", zIndex:10, textAlign:"center", padding:"14px", fontSize:"0.72rem", color:"#1e293b", borderTop:"1px solid rgba(255,255,255,0.04)" }}>
        Powered by <span style={{ color:"#818cf8" }}>TuskForm</span> · Stored on <span style={{ color:"#22d3ee" }}>Walrus</span> · Protected by <span style={{ color:"#a78bfa" }}>Seal</span>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
