"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Pencil, Share2, BarChart3, Database, Shield, Zap } from "lucide-react";

const STEPS = [
  {
    n: "01",
    icon: Pencil,
    color: "#818cf8",
    bg: "rgba(99,102,241,0.1)",
    bd: "rgba(99,102,241,0.2)",
    title: "Build",
    desc: "Drag-and-drop your fields in the visual builder. Set per-field privacy levels — public, Seal-encrypted, or admin-only. No code required.",
    tags: [{ icon:Zap, label:"15+ field types" }, { icon:Shield, label:"Per-field encryption" }],
  },
  {
    n: "02",
    icon: Share2,
    color: "#22d3ee",
    bg: "rgba(6,182,212,0.1)",
    bd: "rgba(6,182,212,0.2)",
    title: "Share",
    desc: "Saving your form writes it to Walrus as an immutable blob and generates a permanent link. Share it — responses go straight back to Walrus.",
    tags: [{ icon:Database, label:"Walrus storage" }, { icon:Zap, label:"Permanent link" }],
  },
  {
    n: "03",
    icon: BarChart3,
    color: "#34d399",
    bg: "rgba(16,185,129,0.1)",
    bd: "rgba(16,185,129,0.2)",
    title: "Analyze",
    desc: "Your dashboard and analytics load real responses fetched from Walrus. No middleman, no data lock-in. Encrypted fields stay Seal-protected.",
    tags: [{ icon:BarChart3, label:"Live analytics" }, { icon:Shield, label:"Seal protected" }],
  },
];

export function Testimonials() {
  const ref    = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once:true, margin:"-80px" });

  return (
    <section ref={ref} style={{ padding:"100px 24px", background:"rgba(5,8,20,0.6)" }}>
      <div style={{ maxWidth:1100, margin:"0 auto" }}>
        <motion.div initial={{ opacity:0, y:24 }} animate={inView?{ opacity:1, y:0 }:{}}
          transition={{ duration:0.6 }} style={{ textAlign:"center", marginBottom:64 }}>
          <div className="section-label" style={{ justifyContent:"center" }}>How It Works</div>
          <h2 style={{ fontSize:"clamp(1.8rem,3.5vw,2.6rem)", fontWeight:900, color:"#fff", marginTop:12, marginBottom:14 }}>
            Build → Share → Analyze
          </h2>
          <p style={{ fontSize:"1.05rem", color:"#64748b", maxWidth:520, margin:"0 auto", lineHeight:1.7 }}>
            Three steps from form idea to permanent decentralized data. Everything runs on Walrus and Sui mainnet.
          </p>
        </motion.div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:24 }}>
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div key={step.n}
                initial={{ opacity:0, y:32 }} animate={inView?{ opacity:1, y:0 }:{}}
                transition={{ delay:i*0.12, duration:0.6 }}
                className="card card-hover"
                style={{ padding:32, position:"relative", overflow:"hidden" }}>
                <div style={{ position:"absolute", top:-10, right:16, fontSize:"5rem", fontWeight:900, color:"rgba(255,255,255,0.03)", lineHeight:1, userSelect:"none" }}>
                  {step.n}
                </div>
                <div style={{ width:52, height:52, borderRadius:15, background:step.bg, border:`1px solid ${step.bd}`, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:20 }}>
                  <Icon size={22} color={step.color}/>
                </div>
                <div style={{ fontSize:"0.72rem", fontWeight:700, color:step.color, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>
                  Step {step.n}
                </div>
                <h3 style={{ fontSize:"1.4rem", fontWeight:800, color:"#fff", marginBottom:12 }}>{step.title}</h3>
                <p style={{ fontSize:"0.875rem", color:"#64748b", lineHeight:1.7, marginBottom:20 }}>{step.desc}</p>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {step.tags.map(tag => (
                    <span key={tag.label} style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:20, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", fontSize:"0.72rem", fontWeight:600, color:"#64748b" }}>
                      <tag.icon size={10}/> {tag.label}
                    </span>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
