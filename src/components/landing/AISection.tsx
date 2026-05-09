"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Brain, TrendingUp, AlertCircle, Star, ArrowUpRight, Sparkles } from "lucide-react";

const INSIGHTS = [
  { icon:TrendingUp, color:"#34d399", bg:"rgba(16,185,129,0.08)", bd:"rgba(16,185,129,0.2)",  title:"Feature request surge",        desc:"Dark mode requests increased 47% this week",                cnt:"+47%",  cntColor:"#34d399" },
  { icon:AlertCircle,color:"#f87171", bg:"rgba(239,68,68,0.08)",   bd:"rgba(239,68,68,0.2)",   title:"Critical: Wallet connection",   desc:"32 users reported wallet disconnection on mobile",          cnt:"32",    cntColor:"#f87171" },
  { icon:Star,       color:"#fbbf24", bg:"rgba(245,158,11,0.08)",  bd:"rgba(245,158,11,0.2)",  title:"Positive sentiment spike",      desc:"NPS score improved from 42 to 67 after v2 launch",          cnt:"+25pt", cntColor:"#fbbf24" },
  { icon:Brain,      color:"#a78bfa", bg:"rgba(139,92,246,0.08)",  bd:"rgba(139,92,246,0.2)",  title:"AI recommendation",             desc:"Consider adding mobile wallet support — top requested",      cnt:"Action",cntColor:"#a78bfa" },
];

const ACTIONS = [
  "Auto-categorize feedback into themes",
  "Detect sentiment and urgency in real-time",
  "Generate weekly summary reports",
  "Surface top action items automatically",
  "Compare trends across time periods",
  "Export insights to Notion or Linear",
];

export function AISection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once:true, margin:"-80px" });
  return (
    <section ref={ref} id="ai" style={{ padding:"100px 24px", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 50% 40% at 50% 50%, rgba(139,92,246,0.06), transparent)", pointerEvents:"none" }} />
      <div style={{ maxWidth:1100, margin:"0 auto" }}>
        <motion.div initial={{ opacity:0, y:28 }} animate={inView?{opacity:1,y:0}:{}} transition={{ duration:0.55 }} style={{ textAlign:"center", marginBottom:70 }}>
          <div className="section-label" style={{ marginBottom:18 }}><Sparkles size={11} /> AI Feedback Intelligence</div>
          <h2 className="text-section" style={{ color:"#fff", marginBottom:14 }}>
            Turn feedback into <span className="gradient-text">actionable intelligence</span>
          </h2>
          <p className="prose" style={{ maxWidth:520, margin:"0 auto" }}>
            Our AI reads every submission, identifies patterns, detects urgent issues, and surfaces the insights that matter — so your team can act, not analyze.
          </p>
        </motion.div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:60, alignItems:"start" }}>
          {/* Left: insights */}
          <div>
            {/* Summary card */}
            <motion.div initial={{ opacity:0, y:16 }} animate={inView?{opacity:1,y:0}:{}} transition={{ delay:0.2 }}
              style={{ background:"#0d1117", border:"1px solid rgba(139,92,246,0.2)", borderRadius:16, padding:20, marginBottom:14 }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:"rgba(139,92,246,0.15)", border:"1px solid rgba(139,92,246,0.25)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Brain size={17} color="#a78bfa" />
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:"0.875rem", fontWeight:700, color:"#fff" }}>AI Weekly Digest</div>
                  <div style={{ fontSize:"0.7rem", color:"#475569" }}>284 responses analyzed</div>
                </div>
                <span className="badge badge-violet">New</span>
              </div>
              <div style={{ padding:14, borderRadius:12, background:"rgba(139,92,246,0.06)", border:"1px solid rgba(139,92,246,0.15)", marginBottom:14 }}>
                <p style={{ fontSize:"0.83rem", color:"#cbd5e1", lineHeight:1.65 }}>
                  <span style={{ color:"#c4b5fd", fontWeight:600 }}>Summary:</span> User satisfaction improved significantly this week.
                  Top complaint shifted to &ldquo;mobile wallet issues.&rdquo; Dark mode and CSV export surged in requests. Recommend prioritizing mobile wallet fix in next sprint.
                </p>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
                {[{l:"Responses",v:"284"},{l:"Themes",v:"12"},{l:"Urgent",v:"3"},{l:"NPS",v:"67"}].map(s => (
                  <div key={s.l} style={{ textAlign:"center", padding:"10px 0", background:"rgba(255,255,255,0.03)", borderRadius:9, border:"1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize:"1.1rem", fontWeight:800, color:"#fff" }}>{s.v}</div>
                    <div style={{ fontSize:"0.68rem", color:"#475569" }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {INSIGHTS.map((ins, i) => (
              <motion.div key={ins.title} initial={{ opacity:0, y:12 }} animate={inView?{opacity:1,y:0}:{}} transition={{ delay:0.3+i*0.08 }}
                style={{ display:"flex", alignItems:"flex-start", gap:14, padding:16, borderRadius:14, background:ins.bg, border:`1px solid ${ins.bd}`, marginBottom:10, cursor:"pointer" }}>
                <div style={{ width:36, height:36, borderRadius:10, background:"rgba(0,0,0,0.2)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <ins.icon size={16} color={ins.color} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontSize:"0.875rem", fontWeight:700, color:"#fff" }}>{ins.title}</span>
                    <span style={{ fontSize:"0.85rem", fontWeight:800, color:ins.cntColor }}>{ins.cnt}</span>
                  </div>
                  <div style={{ fontSize:"0.78rem", color:"#64748b" }}>{ins.desc}</div>
                </div>
                <ArrowUpRight size={13} color="#334155" style={{ flexShrink:0 }} />
              </motion.div>
            ))}
          </div>

          {/* Right: content */}
          <motion.div initial={{ opacity:0, x:30 }} animate={inView?{opacity:1,x:0}:{}} transition={{ delay:0.25 }}>
            <h3 style={{ fontSize:"1.4rem", fontWeight:800, color:"#fff", marginBottom:18, letterSpacing:"-0.01em" }}>AI that actually understands your users</h3>
            <p className="prose" style={{ marginBottom:28 }}>
              Powered by GPT-4, our AI reads between the lines, detects urgency, groups related feedback, and delivers prioritized action lists — so you spend time building, not sifting through spreadsheets.
            </p>
            <div style={{ marginBottom:32 }}>
              {ACTIONS.map((a, i) => (
                <motion.div key={a} initial={{ opacity:0, x:16 }} animate={inView?{opacity:1,x:0}:{}} transition={{ delay:0.4+i*0.07 }}
                  style={{ display:"flex", alignItems:"center", gap:12, fontSize:"0.875rem", color:"#cbd5e1", marginBottom:12 }}>
                  <div style={{ width:20, height:20, borderRadius:"50%", background:"rgba(139,92,246,0.2)", border:"1px solid rgba(139,92,246,0.3)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <div style={{ width:7, height:7, borderRadius:"50%", background:"#a78bfa" }} />
                  </div>
                  {a}
                </motion.div>
              ))}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {[{v:"10x",l:"faster feedback processing"},{v:"89%",l:"accuracy in issue detection"},{v:"3hrs",l:"saved per week per team"},{v:"47%",l:"more actionable insights"}].map(s => (
                <div key={s.l} style={{ padding:16, borderRadius:12, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)" }}>
                  <div className="gradient-text" style={{ fontSize:"1.6rem", fontWeight:900, marginBottom:4 }}>{s.v}</div>
                  <div style={{ fontSize:"0.78rem", color:"#475569" }}>{s.l}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
