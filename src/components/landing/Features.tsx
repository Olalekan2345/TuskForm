"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Brain, Database, Shield, Layers, Upload, BarChart3, Users, Globe, Workflow, Zap } from "lucide-react";

const F = [
  { icon: Brain,     title:"AI Feedback Intelligence",    desc:"GPT-4 powered analysis automatically summarizes, categorizes, and surfaces actionable insights from thousands of responses.", color:"#a78bfa", bg:"rgba(139,92,246,0.1)",  bd:"rgba(139,92,246,0.2)",  tags:["GPT-4","Auto-categorize","Trends"] },
  { icon: Database,  title:"Walrus Decentralized Storage", desc:"All responses and files stored permanently on the Walrus network. No central server, no data loss, no censorship.",          color:"#22d3ee", bg:"rgba(6,182,212,0.1)",   bd:"rgba(6,182,212,0.2)",   tags:["Permanent","Decentralized","Walrus"] },
  { icon: Shield,    title:"Seal End-to-End Encryption",   desc:"Mark sensitive fields as encrypted. Only authorized admins can decrypt private responses using Seal's access control.",       color:"#34d399", bg:"rgba(16,185,129,0.1)",  bd:"rgba(16,185,129,0.2)",  tags:["Seal","E2E","Access Control"] },
  { icon: Layers,    title:"Advanced Form Builder",        desc:"Drag-and-drop builder with 15+ field types. Multi-step flows, branching logic, conditional questions, and live preview.",      color:"#818cf8", bg:"rgba(99,102,241,0.1)",  bd:"rgba(99,102,241,0.2)",  tags:["Drag & Drop","15+ Fields","Logic"] },
  { icon: Upload,    title:"Rich Media Uploads",           desc:"Accept screenshots, videos, voice notes, and documents. Powered by Walrus for permanent decentralized storage.",               color:"#fbbf24", bg:"rgba(245,158,11,0.1)",  bd:"rgba(245,158,11,0.2)",  tags:["Video","Audio","Screenshots"] },
  { icon: BarChart3, title:"Real-time Analytics",          desc:"Beautiful dashboards with response trends, completion rates, drop-off tracking, sentiment analysis, and engagement metrics.",  color:"#f472b6", bg:"rgba(244,114,182,0.1)", bd:"rgba(244,114,182,0.2)", tags:["Live Charts","Sentiment","Engagement"] },
  { icon: Users,     title:"Team Collaboration",           desc:"Invite teammates, assign roles, leave internal notes, and collaborate in real-time on feedback triage.",                        color:"#60a5fa", bg:"rgba(96,165,250,0.1)",  bd:"rgba(96,165,250,0.2)",  tags:["Roles","Notes","Real-time"] },
  { icon: Globe,     title:"Web3 Native",                  desc:"Wallet-based authentication, on-chain form registry, DAO governance integrations, and Sui blockchain support.",                 color:"#2dd4bf", bg:"rgba(45,212,191,0.1)",  bd:"rgba(45,212,191,0.2)",  tags:["Sui","Wallets","DAO"] },
  { icon: Workflow,  title:"Workflow Automation",          desc:"Auto-route submissions, trigger webhooks, integrate with Slack, Discord, Notion, and 100+ tools via Zapier.",                  color:"#fb923c", bg:"rgba(251,146,60,0.1)",  bd:"rgba(251,146,60,0.2)",  tags:["Webhooks","Slack","Zapier"] },
];

export function Features() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <section ref={ref} id="features" style={{ padding:"100px 24px", position:"relative" }}>
      <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 60% 40% at 50% 50%, rgba(99,102,241,0.05), transparent)", pointerEvents:"none" }} />
      <div style={{ maxWidth:1100, margin:"0 auto" }}>
        {/* Header */}
        <motion.div initial={{ opacity:0, y:28 }} animate={inView?{opacity:1,y:0}:{}} transition={{ duration:0.55 }}
          style={{ textAlign:"center", marginBottom:70 }}>
          <div className="section-label" style={{ marginBottom:18 }}><Zap size={11} /> Everything you need</div>
          <h2 className="text-section" style={{ color:"#fff", marginBottom:14 }}>
            Built for the future of <span className="gradient-text">feedback collection</span>
          </h2>
          <p className="prose" style={{ maxWidth:520, margin:"0 auto" }}>
            TuskForm combines decentralized storage, AI intelligence, and enterprise collaboration into one seamless platform.
          </p>
        </motion.div>

        {/* Grid */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))", gap:20 }}>
          {F.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity:0, y:28 }} animate={inView?{opacity:1,y:0}:{}} transition={{ duration:0.45, delay:i*0.06 }}>
              <div className="card card-hover" style={{ padding:24, height:"100%", display:"flex", flexDirection:"column" }}>
                <div style={{ width:44, height:44, borderRadius:12, background:f.bg, border:`1px solid ${f.bd}`, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:18, flexShrink:0 }}>
                  <f.icon size={20} color={f.color} />
                </div>
                <div style={{ fontWeight:700, fontSize:"1rem", color:"#fff", marginBottom:8 }}>{f.title}</div>
                <p style={{ fontSize:"0.85rem", color:"#64748b", lineHeight:1.65, flex:1, marginBottom:16 }}>{f.desc}</p>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {f.tags.map(t => (
                    <span key={t} style={{ fontSize:"0.7rem", padding:"3px 9px", borderRadius:6, background:f.bg, color:f.color, fontWeight:600 }}>{t}</span>
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
