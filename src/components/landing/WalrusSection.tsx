"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Database, CheckCircle2, Globe, Lock, Zap, HardDrive } from "lucide-react";

export function WalrusSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once:true, margin:"-80px" });
  const files = [
    { name:"user_feedback_q4.json",  size:"2.4 MB", pct:100, done:true,  color:"#22d3ee" },
    { name:"product_screenshot.png", size:"1.8 MB", pct:100, done:true,  color:"#818cf8" },
    { name:"voice_note_37.m4a",      size:"5.2 MB", pct:78,  done:false, color:"#a78bfa" },
    { name:"survey_data_export.csv", size:"840 KB", pct:45,  done:false, color:"#34d399" },
  ];
  return (
    <section ref={ref} id="walrus" style={{ padding:"100px 24px", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", right:0, top:"50%", transform:"translateY(-50%)", width:600, height:600, background:"rgba(6,182,212,0.04)", borderRadius:"50%", filter:"blur(80px)", pointerEvents:"none" }} />
      <div style={{ maxWidth:1100, margin:"0 auto", display:"grid", gridTemplateColumns:"1fr 1fr", gap:80, alignItems:"center" }}>
        {/* Left */}
        <motion.div initial={{ opacity:0, x:-40 }} animate={inView?{opacity:1,x:0}:{}} transition={{ duration:0.65 }}>
          <span className="badge badge-cyan" style={{ marginBottom:18 }}>Powered by Walrus Protocol</span>
          <h2 className="text-section" style={{ color:"#fff", marginBottom:18 }}>
            Your data lives <span style={{ color:"#22d3ee" }}>forever</span>, decentralized
          </h2>
          <p className="prose" style={{ marginBottom:32 }}>
            Every form submission, media upload, and response is stored permanently on the Walrus decentralized storage network. No central servers, no data loss, no corporate control.
          </p>
          {[
            { icon:Globe,    text:"Content-addressed permanent storage" },
            { icon:Lock,     text:"Censorship-resistant decentralized network" },
            { icon:Zap,      text:"Sub-second upload and retrieval speeds" },
            { icon:HardDrive,text:"Up to 1TB per file with redundancy" },
          ].map((f,i) => (
            <motion.div key={f.text} initial={{ opacity:0, x:-16 }} animate={inView?{opacity:1,x:0}:{}} transition={{ delay:0.3+i*0.1 }}
              style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
              <div style={{ width:34, height:34, borderRadius:9, background:"rgba(6,182,212,0.1)", border:"1px solid rgba(6,182,212,0.2)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <f.icon size={15} color="#22d3ee" />
              </div>
              <span style={{ fontSize:"0.875rem", color:"#cbd5e1" }}>{f.text}</span>
            </motion.div>
          ))}
          <div style={{ display:"inline-flex", alignItems:"center", gap:10, padding:"12px 18px", borderRadius:12, background:"rgba(6,182,212,0.06)", border:"1px solid rgba(6,182,212,0.15)", marginTop:8 }}>
            <Database size={15} color="#22d3ee" />
            <span style={{ fontSize:"0.82rem", color:"#22d3ee", fontWeight:600 }}>Stored on Walrus · Verified on-chain · Forever</span>
          </div>
        </motion.div>

        {/* Right */}
        <motion.div initial={{ opacity:0, x:40 }} animate={inView?{opacity:1,x:0}:{}} transition={{ duration:0.65, delay:0.15 }} style={{ position:"relative" }}>
          <div style={{ background:"#0d1117", border:"1px solid rgba(6,182,212,0.2)", borderRadius:18, padding:24, boxShadow:"0 24px 60px rgba(0,0,0,0.4)" }}>
            <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:"linear-gradient(90deg, transparent, rgba(6,182,212,0.6), transparent)", borderRadius:"18px 18px 0 0" }} />
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:22 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <Database size={17} color="#22d3ee" />
                <span style={{ fontWeight:700, color:"#fff" }}>Walrus Storage</span>
              </div>
              <span className="badge badge-cyan">Active</span>
            </div>
            <div style={{ marginBottom:22 }}>
              {files.map((file, i) => (
                <motion.div key={file.name} initial={{ opacity:0, x:16 }} animate={inView?{opacity:1,x:0}:{}} transition={{ delay:0.4+i*0.1 }} style={{ marginBottom:14 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                    <span style={{ fontSize:"0.78rem", color:"#cbd5e1", fontWeight:500 }}>{file.name}</span>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:"0.72rem", color:"#475569" }}>{file.size}</span>
                      {file.done ? <CheckCircle2 size={13} color="#34d399" /> : <span style={{ fontSize:"0.72rem", color:"#22d3ee" }}>{file.pct}%</span>}
                    </div>
                  </div>
                  <div style={{ height:5, background:"rgba(255,255,255,0.05)", borderRadius:3, overflow:"hidden" }}>
                    <motion.div initial={{ width:0 }} animate={inView?{width:`${file.pct}%`}:{}} transition={{ duration:1, delay:0.6+i*0.15, ease:"easeOut" }}
                      style={{ height:"100%", background:file.color, borderRadius:3 }} />
                  </div>
                </motion.div>
              ))}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, paddingTop:18, borderTop:"1px solid rgba(255,255,255,0.06)" }}>
              {[{ label:"Stored", val:"1.2 TB" }, { label:"Blobs", val:"48,291" }, { label:"Uptime", val:"99.9%" }].map(s => (
                <div key={s.label} style={{ textAlign:"center" }}>
                  <div style={{ fontSize:"1.1rem", fontWeight:800, color:"#fff" }}>{s.val}</div>
                  <div style={{ fontSize:"0.7rem", color:"#475569" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <motion.div animate={{ y:[0,-7,0] }} transition={{ duration:3, repeat:Infinity }}
            style={{ position:"absolute", bottom:-14, right:-10, display:"flex", alignItems:"center", gap:8, padding:"10px 16px", borderRadius:11, background:"#0d1117", border:"1px solid rgba(6,182,212,0.3)", boxShadow:"0 8px 24px rgba(0,0,0,0.4)" }}>
            <div style={{ width:7, height:7, borderRadius:"50%", background:"#22d3ee" }} />
            <span style={{ fontSize:"0.82rem", fontWeight:700, color:"#fff" }}>Stored on Walrus</span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
