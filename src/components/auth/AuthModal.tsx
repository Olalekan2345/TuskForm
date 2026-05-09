"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWalletStore } from "@/lib/walletStore";
import { Shield, Wallet, ExternalLink, ArrowRight, Loader2, Mail, Check } from "lucide-react";
import Image from "next/image";

interface AuthModalProps { open: boolean; onClose: () => void; }

export function AuthModal({ open, onClose }: AuthModalProps) {
  const wallets      = useWalletStore(s => s.wallets);
  const connect      = useWalletStore(s => s.connect);
  const address      = useWalletStore(s => s.address);
  const isConnecting = useWalletStore(s => s.isConnecting);

  const [step, setStep]       = useState<"connect" | "email">("connect");
  const [email, setEmail]     = useState("");
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  // When wallet connects, move to email step
  useEffect(() => {
    if (address && open && step === "connect") setStep("email");
  }, [address, open, step]);

  // Reset when modal closes
  useEffect(() => {
    if (!open) { setStep("connect"); setEmail(""); setSaved(false); }
  }, [open]);

  const saveEmail = async () => {
    if (!address) return;
    if (email) localStorage.setItem(`tuskform_email_${address}`, email);
    setSaving(true);
    await new Promise(r => setTimeout(r, 300));
    setSaving(false);
    setSaved(true);
    setTimeout(() => onClose(), 900);
  };

  const skipEmail = () => onClose();

  if (!open) return null;

  return (
    <div style={{ position:"fixed", inset:0, zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} onClick={step === "connect" ? onClose : undefined}
        style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.8)", backdropFilter:"blur(8px)" }} />

      <motion.div initial={{ opacity:0, scale:0.94, y:20 }} animate={{ opacity:1, scale:1, y:0 }}
        transition={{ type:"spring", damping:28, stiffness:300 }}
        style={{ position:"relative", width:"100%", maxWidth:420, background:"var(--bg-alt)", border:"1px solid var(--glass-border-hover)", borderRadius:20, overflow:"hidden", boxShadow:"0 32px 80px rgba(0,0,0,0.7), var(--glow-sm)" }}>

        <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:"linear-gradient(90deg,transparent,rgba(0,200,224,0.8),transparent)" }} />

        <AnimatePresence mode="wait">
          {step === "connect" && (
            <motion.div key="connect" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }}
              style={{ padding:32 }}>
              <div style={{ textAlign:"center", marginBottom:28 }}>
                <div style={{ width:52, height:52, margin:"0 auto 16px" }}>
                  <Image src="/logo.jpg" alt="TuskForm" width={52} height={52} style={{ borderRadius:14, objectFit:"cover" }} />
                </div>
                <h2 style={{ fontSize:"1.3rem", fontWeight:800, color:"var(--ink)", marginBottom:6 }}>Connect your wallet</h2>
                <p style={{ fontSize:"0.85rem", color:"var(--ink-muted)" }}>
                  Your Sui wallet is your identity on TuskForm. No account needed.
                </p>
              </div>

              {wallets.length > 0 ? (
                <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:20 }}>
                  {wallets.map(wallet => (
                    <button key={wallet.name} onClick={() => connect?.(wallet.name)} disabled={!!isConnecting}
                      style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px", borderRadius:13, border:"1px solid rgba(0,200,224,0.2)", background:isConnecting===wallet.name?"rgba(0,200,224,0.1)":"rgba(0,200,224,0.04)", cursor:isConnecting?"not-allowed":"pointer", transition:"all 0.2s", opacity:isConnecting&&isConnecting!==wallet.name?0.5:1, width:"100%" }}
                      onMouseEnter={e=>{ if(!isConnecting)(e.currentTarget as HTMLElement).style.borderColor="rgba(0,200,224,0.4)"; }}
                      onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.borderColor="rgba(0,200,224,0.2)"; }}>
                      {isConnecting === wallet.name
                        ? <Loader2 size={32} color="#5ee8ff" style={{ flexShrink:0, animation:"spin 0.7s linear infinite" }} />
                        : <img src={wallet.icon} alt={wallet.name} width={32} height={32} style={{ borderRadius:8, flexShrink:0 }} onError={e=>{ (e.target as HTMLImageElement).style.display="none"; }} />}
                      <div style={{ textAlign:"left", flex:1 }}>
                        <div style={{ fontSize:"0.9rem", fontWeight:700, color:"var(--ink)" }}>{wallet.name}</div>
                        <div style={{ fontSize:"0.72rem", color:"var(--ink-muted)" }}>Sui · Mainnet</div>
                      </div>
                      {isConnecting !== wallet.name && <ArrowRight size={14} color="var(--ink-muted)" />}
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ marginBottom:20 }}>
                  <div style={{ padding:"20px 16px", borderRadius:14, border:"1px solid rgba(0,200,224,0.1)", background:"rgba(0,200,224,0.03)", textAlign:"center", marginBottom:14 }}>
                    <Wallet size={32} color="var(--ink-muted)" style={{ margin:"0 auto 10px" }} />
                    <p style={{ fontSize:"0.875rem", fontWeight:600, color:"var(--ink-muted)", marginBottom:4 }}>No Sui wallet detected</p>
                    <p style={{ fontSize:"0.78rem", color:"var(--ink-faint)", marginBottom:16, lineHeight:1.5 }}>
                      Install a free Sui wallet extension to get started.
                    </p>
                    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                      <a href="https://chrome.google.com/webstore/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil"
                        target="_blank" rel="noreferrer"
                        style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"10px 16px", borderRadius:10, background:"rgba(0,200,224,0.1)", border:"1px solid rgba(0,200,224,0.2)", color:"var(--teal-pale)", fontSize:"0.83rem", fontWeight:600, textDecoration:"none" }}>
                        Install Sui Wallet (Chrome) <ExternalLink size={13} />
                      </a>
                      <a href="https://www.slush.io" target="_blank" rel="noreferrer"
                        style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"10px 16px", borderRadius:10, background:"rgba(255,255,255,0.03)", border:"1px solid var(--glass-border)", color:"var(--ink-muted)", fontSize:"0.83rem", fontWeight:600, textDecoration:"none" }}>
                        Try Slush Wallet <ExternalLink size={13} />
                      </a>
                    </div>
                  </div>
                  <p style={{ fontSize:"0.75rem", color:"var(--ink-faint)", textAlign:"center" }}>
                    After installing, refresh this page and connect here.
                  </p>
                </div>
              )}

              <div style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"12px 14px", borderRadius:12, background:"rgba(0,200,224,0.04)", border:"1px solid rgba(0,200,224,0.1)" }}>
                <Shield size={13} color="var(--teal)" style={{ marginTop:2, flexShrink:0 }} />
                <p style={{ fontSize:"0.75rem", color:"var(--ink-muted)", lineHeight:1.6 }}>
                  Your forms and responses are stored on Walrus (Sui mainnet). We never hold your private keys.
                </p>
              </div>
            </motion.div>
          )}

          {step === "email" && (
            <motion.div key="email" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }}
              style={{ padding:32 }}>
              <div style={{ textAlign:"center", marginBottom:24 }}>
                <div style={{ width:52, height:52, margin:"0 auto 16px", borderRadius:15, background:"rgba(0,200,224,0.1)", border:"1px solid rgba(0,200,224,0.2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {saved ? <Check size={24} color="#34d399" /> : <Mail size={24} color="var(--teal)" />}
                </div>
                <h2 style={{ fontSize:"1.2rem", fontWeight:800, color:"var(--ink)", marginBottom:6 }}>
                  {saved ? "You're all set!" : "Add your email (optional)"}
                </h2>
                <p style={{ fontSize:"0.85rem", color:"var(--ink-muted)", lineHeight:1.5 }}>
                  {saved
                    ? "Wallet connected. You'll receive form confirmations by email."
                    : "Get email confirmations when you create forms. Completely optional."}
                </p>
              </div>

              {!saved && (
                <>
                  <div style={{ marginBottom:16 }}>
                    <label style={{ display:"block", fontSize:"0.75rem", fontWeight:600, color:"var(--ink-muted)", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.06em" }}>
                      Email address
                    </label>
                    <div style={{ position:"relative" }}>
                      <Mail size={15} color="var(--ink-faint)" style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)" }} />
                      <input
                        type="email"
                        className="input"
                        placeholder="you@example.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        style={{ paddingLeft:36 }}
                        onKeyDown={e => e.key === "Enter" && saveEmail()}
                      />
                    </div>
                  </div>

                  <div style={{ display:"flex", gap:10 }}>
                    <button onClick={saveEmail} disabled={saving}
                      className="btn btn-primary btn-md"
                      style={{ flex:1, justifyContent:"center" }}>
                      {saving ? <Loader2 size={15} style={{ animation:"spin 0.7s linear infinite" }} /> : null}
                      {saving ? "Saving…" : email ? "Save & continue" : "Continue without email"}
                    </button>
                    {email && (
                      <button onClick={skipEmail}
                        className="btn btn-ghost btn-md"
                        style={{ flexShrink:0 }}>
                        Skip
                      </button>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </motion.div>
    </div>
  );
}
