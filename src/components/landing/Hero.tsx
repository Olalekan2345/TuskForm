"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { ArrowRight, Database, Shield, Zap, Star } from "lucide-react";
import Link from "next/link";

export function Hero({ onAuthOpen }: { onAuthOpen?: () => void }) {
  return (
    <section style={{ position:"relative", minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", paddingTop:100, paddingBottom:80, overflow:"hidden", zIndex:2 }}>
      {/* BG layers */}
      <div style={{ position:"absolute", inset:0, pointerEvents:"none" }}>
        <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0,200,224,0.12), transparent)" }} />
        <div className="mesh-grid" style={{ position:"absolute", inset:0, opacity:0.4 }} />
        <motion.div animate={{ scale:[1,1.2,1], opacity:[0.2,0.35,0.2] }} transition={{ duration:9, repeat:Infinity }}
          style={{ position:"absolute", top:"25%", left:"20%", width:420, height:420, background:"rgba(0,200,224,0.06)", borderRadius:"50%", filter:"blur(80px)" }} />
        <motion.div animate={{ scale:[1.2,1,1.2], opacity:[0.12,0.22,0.12] }} transition={{ duration:11, repeat:Infinity, delay:2 }}
          style={{ position:"absolute", bottom:"20%", right:"18%", width:350, height:350, background:"rgba(67,97,238,0.07)", borderRadius:"50%", filter:"blur(80px)" }} />
      </div>

      {/* Hero content */}
      <div style={{ position:"relative", zIndex:3, textAlign:"center", maxWidth:840, margin:"0 auto", padding:"0 24px" }}>
        {/* Announcement pill */}
        <motion.div initial={{ opacity:0, y:-12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }} style={{ marginBottom:28, display:"flex", justifyContent:"center" }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"6px 16px", borderRadius:100, background:"rgba(0,200,224,0.08)", border:"1px solid rgba(0,200,224,0.2)", color:"#5ee8ff", fontSize:"0.78rem", fontWeight:600 }}>
            <span style={{ width:7, height:7, borderRadius:"50%", background:"#00c8e0", display:"inline-block" }} />
            Now live on Sui mainnet · Powered by Walrus Protocol
            <ArrowRight size={13} />
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1 initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }}
          className="text-display" style={{ color:"var(--ink)", marginBottom:20 }}>
          Build secure forms.<br />
          <span className="gradient-text">Collect smarter feedback.</span><br />
          Own your data.
        </motion.h1>

        {/* Sub */}
        <motion.p initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3 }}
          style={{ fontSize:"1.1rem", color:"var(--ink-muted)", maxWidth:580, margin:"0 auto 40px", lineHeight:1.7 }}>
          The decentralized AI-powered form platform built for Web3 teams, DAOs, and enterprises.
          Powered by <span style={{ color:"var(--teal)", fontWeight:600 }}>Walrus</span> storage and <span style={{ color:"#c084fc", fontWeight:600 }}>Seal</span> encryption.
        </motion.p>

        {/* CTAs */}
        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.4 }}
          style={{ display:"flex", flexWrap:"wrap", gap:14, justifyContent:"center", marginBottom:56 }}>
          <Button size="lg" onClick={onAuthOpen} iconRight={<ArrowRight size={18} />}>
            Start building free
          </Button>
          <Link href="/builder">
            <Button variant="ghost" size="lg" iconRight={<ArrowRight size={16} />}>Try the builder</Button>
          </Link>
        </motion.div>

        {/* Social proof */}
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.55 }}
          style={{ display:"flex", flexWrap:"wrap", alignItems:"center", justifyContent:"center", gap:20, color:"var(--ink-faint)", fontSize:"0.82rem" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ display:"flex" }}>
              {["#00c8e0","#4361ee","#7b2d8b","#10b981","#f59e0b"].map((c,i) => (
                <div key={i} style={{ width:26, height:26, borderRadius:"50%", background:c, border:"2px solid var(--bg)", marginLeft: i>0 ? -8 : 0 }} />
              ))}
            </div>
            <span>Built for <strong style={{ color:"var(--ink)" }}>Web3</strong> teams &amp; DAOs</span>
          </div>
          <span style={{ color:"var(--border)" }}>·</span>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:"#34d399" }}/>
            <span><strong style={{ color:"var(--ink)" }}>Mainnet live</strong> · Sui + Walrus</span>
          </div>
          <span style={{ color:"var(--border)" }}>·</span>
          <span>Data stored <strong style={{ color:"var(--ink)" }}>on-chain</strong>, forever</span>
        </motion.div>
      </div>

      {/* Dashboard preview */}
      <motion.div initial={{ opacity:0, y:60 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.6, type:"spring", damping:22 }}
        style={{ position:"relative", zIndex:3, marginTop:80, width:"100%", maxWidth:1000, padding:"0 24px" }}>
        {/* Browser frame */}
        <div style={{ borderRadius:16, overflow:"hidden", border:"1px solid rgba(0,200,224,0.15)", boxShadow:"0 40px 80px rgba(0,0,0,0.5), 0 0 60px rgba(0,200,224,0.06)" }}>
          {/* Chrome bar */}
          <div style={{ background:"var(--bg-alt)", padding:"12px 16px", borderBottom:"1px solid var(--glass-border)", display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ display:"flex", gap:6 }}>
              {["#ef4444","#f59e0b","#22c55e"].map((c,i) => <div key={i} style={{ width:12,height:12,borderRadius:"50%",background:c,opacity:0.7 }} />)}
            </div>
            <div style={{ flex:1, maxWidth:280, margin:"0 auto", background:"rgba(255,255,255,0.04)", border:"1px solid var(--glass-border)", borderRadius:7, padding:"5px 12px", fontSize:"0.72rem", color:"var(--ink-faint)", textAlign:"center" }}>
              app.tuskform.io/dashboard
            </div>
          </div>
          {/* Content */}
          <div style={{ background:"var(--bg-alt)", padding:24 }}>
            <DashboardPreview />
          </div>
        </div>

        {/* Floating badges */}
        {[
          { label:"Walrus Storage", val:"Decentralized", icon:<Database size={14} color="#00c8e0" />, bg:"rgba(0,200,224,0.08)", bd:"rgba(0,200,224,0.2)", pos:{ top:-20, left:-10 } },
          { label:"Seal Encrypted", val:"End-to-end",   icon:<Shield size={14} color="#c084fc" />,  bg:"rgba(123,45,139,0.1)",  bd:"rgba(123,45,139,0.2)",  pos:{ top:-20, right:-10 } },
          { label:"AI Insights",    val:"32 detected",  icon:<Zap size={14} color="#fbbf24" />,    bg:"rgba(245,158,11,0.08)", bd:"rgba(245,158,11,0.2)",  pos:{ bottom:-20, left:40 } },
          { label:"Response Rate",  val:"94.2%",        icon:<Star size={14} color="#34d399" fill="#34d399"/>, bg:"rgba(16,185,129,0.08)", bd:"rgba(16,185,129,0.2)", pos:{ bottom:-20, right:40 } },
        ].map((f) => (
          <motion.div key={f.label} initial={{ opacity:0, scale:0.8 }} animate={{ opacity:1, scale:1 }} transition={{ delay:1, type:"spring" }}
            className="animate-float hero-badge"
            style={{ position:"absolute", ...f.pos, display:"flex", alignItems:"center", gap:10, padding:"10px 14px", borderRadius:12, background:f.bg, border:`1px solid ${f.bd}`, backdropFilter:"blur(20px)", boxShadow:"0 8px 24px rgba(0,0,0,0.3)" }}>
            <div style={{ width:32, height:32, borderRadius:9, background:"rgba(0,0,0,0.25)", display:"flex", alignItems:"center", justifyContent:"center" }}>{f.icon}</div>
            <div>
              <div style={{ fontSize:"0.68rem", color:"var(--ink-muted)" }}>{f.label}</div>
              <div style={{ fontSize:"0.85rem", fontWeight:700, color:"var(--ink)" }}>{f.val}</div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

function DashboardPreview() {
  const stats = [
    { label:"Total Responses", val:"12,847", chg:"+23%", color:"#5ee8ff" },
    { label:"Active Forms",    val:"48",     chg:"+5",   color:"#00c8e0" },
    { label:"Completion Rate", val:"78.3%",  chg:"+4.1%",color:"#34d399" },
    { label:"AI Insights",     val:"156",    chg:"new",  color:"#c084fc" },
  ];
  const rows = [
    { name:"Aiko Tanaka",   form:"Product Feedback", time:"2m ago",  status:"new",      sc:"badge-primary" },
    { name:"Marcus Chen",   form:"Bug Report",       time:"8m ago",  status:"urgent",   sc:"badge-danger" },
    { name:"Sofia Reyes",   form:"Feature Request",  time:"15m ago", status:"reviewed", sc:"badge-cyan" },
    { name:"James Okafor",  form:"User Survey",      time:"1h ago",  status:"new",      sc:"badge-primary" },
  ];
  const colors = ["#00c8e0","#4361ee","#7b2d8b","#10b981"];
  return (
    <div>
      <div className="dash-preview-grid" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
        {stats.map((s,i) => (
          <div key={s.label} style={{ background:"rgba(255,255,255,0.02)", border:"1px solid var(--glass-border)", borderRadius:12, padding:"14px 16px" }}>
            <div style={{ fontSize:"0.7rem", color:"var(--ink-muted)", marginBottom:4 }}>{s.label}</div>
            <div style={{ fontSize:"1.4rem", fontWeight:800, color:"var(--ink)", fontFamily:"var(--font-display)" }}>{s.val}</div>
            <div style={{ fontSize:"0.72rem", color:s.color, marginTop:2, fontWeight:600 }}>{s.chg}</div>
          </div>
        ))}
      </div>
      <div style={{ background:"rgba(255,255,255,0.01)", border:"1px solid var(--glass-border)", borderRadius:12, overflow:"hidden" }}>
        <div style={{ padding:"12px 16px", borderBottom:"1px solid var(--glass-border)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:"#34d399" }} />
            <span style={{ fontSize:"0.85rem", fontWeight:600, color:"var(--ink)" }}>Live submissions</span>
          </div>
          <span className="badge badge-success">Live</span>
        </div>
        {rows.map((r,i) => (
          <div key={r.name} style={{ padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom: i<rows.length-1 ? "1px solid var(--glass-border)" : "none" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:32, height:32, borderRadius:9, background:colors[i%colors.length], display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.75rem", fontWeight:700, color:"#fff" }}>
                {r.name.charAt(0)}
              </div>
              <div>
                <div style={{ fontSize:"0.85rem", fontWeight:600, color:"var(--ink)" }}>{r.name}</div>
                <div style={{ fontSize:"0.72rem", color:"var(--ink-muted)" }}>{r.form}</div>
              </div>
            </div>
            <div className="dash-preview-meta" style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:"0.72rem", color:"var(--ink-faint)" }}>{r.time}</span>
              <span className={`badge ${r.sc}`}>{r.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
