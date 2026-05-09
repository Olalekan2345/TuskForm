"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Shield, Lock, Eye, EyeOff, Key, Users, CheckCircle2 } from "lucide-react";

const FIELDS = [
  { label:"Name",           type:"Short text", enc:false },
  { label:"Email",          type:"Email",      enc:false },
  { label:"Wallet Address", type:"Wallet",     enc:true  },
  { label:"Medical History",type:"Long text",  enc:true  },
  { label:"Payment Info",   type:"Text",       enc:true  },
];

export function SealSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once:true, margin:"-80px" });
  return (
    <section ref={ref} id="seal" style={{ padding:"100px 24px", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", left:0, top:"50%", transform:"translateY(-50%)", width:500, height:500, background:"rgba(139,92,246,0.04)", borderRadius:"50%", filter:"blur(80px)", pointerEvents:"none" }} />
      <div style={{ maxWidth:1100, margin:"0 auto", display:"grid", gridTemplateColumns:"1fr 1fr", gap:80, alignItems:"center" }}>
        {/* Visual */}
        <motion.div initial={{ opacity:0, x:-40 }} animate={inView?{opacity:1,x:0}:{}} transition={{ duration:0.65 }} style={{ position:"relative" }}>
          <div style={{ background:"#0d1117", border:"1px solid rgba(139,92,246,0.2)", borderRadius:18, padding:24, boxShadow:"0 24px 60px rgba(0,0,0,0.4)" }}>
            <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:"linear-gradient(90deg,transparent,rgba(139,92,246,0.6),transparent)", borderRadius:"18px 18px 0 0" }} />
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}><Shield size={17} color="#a78bfa" /><span style={{ fontWeight:700, color:"#fff" }}>Seal Encryption</span></div>
              <span className="badge badge-violet">Protected</span>
            </div>
            {FIELDS.map((f, i) => (
              <motion.div key={f.label} initial={{ opacity:0, x:-14 }} animate={inView?{opacity:1,x:0}:{}} transition={{ delay:0.3+i*0.08 }}
                style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"11px 14px", borderRadius:11, marginBottom:8, background: f.enc?"rgba(139,92,246,0.07)":"rgba(255,255,255,0.03)", border: f.enc?"1px solid rgba(139,92,246,0.2)":"1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  {f.enc ? <EyeOff size={14} color="#a78bfa" /> : <Eye size={14} color="#475569" />}
                  <div>
                    <div style={{ fontSize:"0.85rem", fontWeight:600, color:"#fff" }}>{f.label}</div>
                    <div style={{ fontSize:"0.7rem", color:"#475569" }}>{f.type}</div>
                  </div>
                </div>
                {f.enc
                  ? <span className="badge badge-violet">Encrypted</span>
                  : <span className="badge badge-ghost">Public</span>}
              </motion.div>
            ))}
            <div style={{ paddingTop:16, borderTop:"1px solid rgba(255,255,255,0.06)", marginTop:4 }}>
              <div style={{ fontSize:"0.68rem", fontWeight:700, color:"#475569", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Access Control</div>
              {[
                { role:"Creator",   access:"Full decrypt + admin", color:"#a78bfa" },
                { role:"Admin",     access:"Decrypt + view",        color:"#818cf8" },
                { role:"Reviewer",  access:"View public only",      color:"#22d3ee" },
                { role:"Respondent",access:"Submit only",           color:"#64748b" },
              ].map((r, i) => (
                <motion.div key={r.role} initial={{ opacity:0 }} animate={inView?{opacity:1}:{}} transition={{ delay:0.7+i*0.08 }}
                  style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <Users size={11} color={r.color} />
                    <span style={{ fontSize:"0.82rem", color:"#cbd5e1" }}>{r.role}</span>
                  </div>
                  <span style={{ fontSize:"0.72rem", color:r.color, padding:"2px 8px", borderRadius:6, background:`${r.color}15` }}>{r.access}</span>
                </motion.div>
              ))}
            </div>
          </div>
          <motion.div animate={{ y:[0,-7,0] }} transition={{ duration:3.5, repeat:Infinity, delay:1 }}
            style={{ position:"absolute", top:-14, left:-10, display:"flex", alignItems:"center", gap:8, padding:"10px 16px", borderRadius:11, background:"#0d1117", border:"1px solid rgba(139,92,246,0.3)", boxShadow:"0 8px 24px rgba(0,0,0,0.4)" }}>
            <Lock size={13} color="#a78bfa" />
            <span style={{ fontSize:"0.82rem", fontWeight:700, color:"#fff" }}>Seal encrypted</span>
          </motion.div>
        </motion.div>

        {/* Content */}
        <motion.div initial={{ opacity:0, x:40 }} animate={inView?{opacity:1,x:0}:{}} transition={{ duration:0.65, delay:0.15 }}>
          <span className="badge badge-violet" style={{ marginBottom:18 }}>Seal Protocol Integration</span>
          <h2 className="text-section" style={{ color:"#fff", marginBottom:18 }}>
            Privacy-first by <span style={{ color:"#a78bfa" }}>design</span>
          </h2>
          <p className="prose" style={{ marginBottom:32 }}>
            TuskForm integrates Seal&apos;s threshold encryption to give you granular, cryptographic control over who can read what. Mark any field as encrypted — only authorized admins can access sensitive data.
          </p>
          {[
            { icon:Lock,         title:"Field-level encryption",    desc:"Encrypt specific fields while keeping others public. Mix privacy levels within a single form." },
            { icon:Key,          title:"Threshold key management",  desc:"Decryption requires M-of-N key holders, preventing any single point of compromise." },
            { icon:Users,        title:"Role-based access control", desc:"Assign Creator, Admin, and Reviewer roles with cryptographically enforced permissions." },
            { icon:CheckCircle2, title:"Compliance-ready",          desc:"Meet GDPR, HIPAA, and SOC 2 requirements with verifiable on-chain access logs." },
          ].map((item, i) => (
            <motion.div key={item.title} initial={{ opacity:0, y:12 }} animate={inView?{opacity:1,y:0}:{}} transition={{ delay:0.35+i*0.08 }}
              style={{ display:"flex", gap:14, marginBottom:20 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:"rgba(139,92,246,0.1)", border:"1px solid rgba(139,92,246,0.2)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2 }}>
                <item.icon size={15} color="#a78bfa" />
              </div>
              <div>
                <div style={{ fontSize:"0.9rem", fontWeight:700, color:"#fff", marginBottom:4 }}>{item.title}</div>
                <div style={{ fontSize:"0.83rem", color:"#64748b", lineHeight:1.6 }}>{item.desc}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
