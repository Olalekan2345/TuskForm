"use client";
import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { CheckCircle2, Zap } from "lucide-react";

const PLANS = [
  { name:"Starter", monthly:0,  annual:0,  desc:"Perfect for solo builders", cta:"Get started free",  highlight:false, features:["3 active forms","500 responses/month","Walrus storage (1 GB)","Basic AI summaries","Email notifications","Community support"] },
  { name:"Pro",     monthly:29, annual:22, desc:"For growing teams",          cta:"Start free trial",  highlight:true,  badge:"Most Popular", features:["Unlimited forms","10,000 responses/month","Walrus storage (100 GB)","Full AI Intelligence","Seal encryption","Media uploads","5 team seats","Custom branding","Webhook integrations","Priority support"] },
  { name:"Enterprise",monthly:99,annual:79,desc:"For enterprises and DAOs",  cta:"Contact sales",     highlight:false, features:["Unlimited everything","Unlimited responses","Walrus storage (1 TB)","Custom AI models","Advanced Seal permissions","SSO & SAML","Unlimited seats","Custom domain","SLA guarantee","Dedicated support","On-chain audit logs"] },
];

export function Pricing({ onAuthOpen }: { onAuthOpen?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once:true, margin:"-80px" });
  const [annual, setAnnual] = useState(false);
  return (
    <section ref={ref} id="pricing" style={{ padding:"100px 24px", position:"relative" }}>
      <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 60% 40% at 50% 50%,rgba(99,102,241,0.06),transparent)", pointerEvents:"none" }} />
      <div style={{ maxWidth:1000, margin:"0 auto" }}>
        <motion.div initial={{ opacity:0, y:28 }} animate={inView?{opacity:1,y:0}:{}} transition={{ duration:0.55 }} style={{ textAlign:"center", marginBottom:60 }}>
          <div className="section-label" style={{ marginBottom:18 }}><Zap size={11} /> Simple pricing</div>
          <h2 className="text-section" style={{ color:"#fff", marginBottom:12 }}>Start free, scale as you <span className="gradient-text">grow</span></h2>
          <p className="prose" style={{ marginBottom:28 }}>No credit card required. Cancel anytime.</p>
          {/* Toggle */}
          <div style={{ display:"inline-flex", padding:5, borderRadius:12, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)" }}>
            {["Monthly","Annual"].map((l,i) => (
              <button key={l} onClick={() => setAnnual(i===1)}
                style={{ padding:"8px 18px", borderRadius:9, border:"none", cursor:"pointer", fontSize:"0.85rem", fontWeight:600, transition:"all 0.2s",
                  background: (i===1)===annual ? "rgba(255,255,255,0.1)" : "transparent",
                  color: (i===1)===annual ? "#fff" : "#64748b" }}>
                {l} {i===1 && <span style={{ marginLeft:4, fontSize:"0.7rem", background:"rgba(16,185,129,0.2)", color:"#34d399", padding:"2px 6px", borderRadius:5 }}>-25%</span>}
              </button>
            ))}
          </div>
        </motion.div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:20 }}>
          {PLANS.map((p, i) => (
            <motion.div key={p.name} initial={{ opacity:0, y:28 }} animate={inView?{opacity:1,y:0}:{}} transition={{ duration:0.45, delay:i*0.1 }} style={{ position:"relative" }}>
              {p.badge && (
                <div style={{ position:"absolute", top:-14, left:"50%", transform:"translateX(-50%)", zIndex:1 }}>
                  <span style={{ padding:"4px 14px", borderRadius:100, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff", fontSize:"0.72rem", fontWeight:700, whiteSpace:"nowrap" }}>{p.badge}</span>
                </div>
              )}
              <div style={{
                height:"100%", borderRadius:18, padding:28,
                background: p.highlight ? "linear-gradient(160deg,rgba(99,102,241,0.1),rgba(139,92,246,0.05))" : "#0d1117",
                border: p.highlight ? "1px solid rgba(99,102,241,0.4)" : "1px solid rgba(255,255,255,0.08)",
                boxShadow: p.highlight ? "0 0 40px rgba(99,102,241,0.15)" : "none",
                display:"flex", flexDirection:"column",
              }}>
                {p.highlight && <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:"linear-gradient(90deg,transparent,#6366f1,transparent)", borderRadius:"18px 18px 0 0" }} />}
                <div style={{ marginBottom:24 }}>
                  <div style={{ fontSize:"0.72rem", fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>{p.name}</div>
                  <div style={{ display:"flex", alignItems:"baseline", gap:6, marginBottom:6 }}>
                    <span style={{ fontSize:"2.5rem", fontWeight:900, color:"#fff" }}>${annual ? p.annual : p.monthly}</span>
                    {p.monthly > 0 && <span style={{ fontSize:"0.85rem", color:"#475569" }}>/mo</span>}
                  </div>
                  <div style={{ fontSize:"0.82rem", color:"#64748b" }}>{p.desc}</div>
                </div>
                <Button variant={p.highlight?"primary":"ghost"} className="w-full" style={{ width:"100%", marginBottom:24, justifyContent:"center" }} onClick={onAuthOpen}>{p.cta}</Button>
                <div style={{ flex:1 }}>
                  {p.features.map(f => (
                    <div key={f} style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:10 }}>
                      <CheckCircle2 size={14} color="#6366f1" style={{ flexShrink:0, marginTop:2 }} />
                      <span style={{ fontSize:"0.83rem", color:"#94a3b8" }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
