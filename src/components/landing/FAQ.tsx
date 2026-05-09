"use client";
import { useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const FAQS = [
  { q:"What is TuskForm and how is it different from Google Forms?", a:"TuskForm is a decentralized AI-powered form platform built on Walrus and Seal protocols. Unlike Google Forms, your data is stored permanently on the Walrus decentralized network, sensitive fields can be end-to-end encrypted with Seal, and our AI engine automatically analyzes and summarizes your feedback. You own your data — always." },
  { q:"What is Walrus Protocol and why does it matter?", a:"Walrus is a decentralized storage network that stores data across hundreds of nodes with cryptographic redundancy. When you collect form responses through TuskForm, they're stored on Walrus — meaning no central server can lose, censor, or expose your data. Files are permanent, verifiable, and accessible forever." },
  { q:"How does Seal encryption work?", a:"Seal is a threshold encryption protocol built on Sui. When you mark a form field as 'encrypted', responses are encrypted using Seal before being uploaded to Walrus. Only users you authorize (with the right cryptographic keys) can decrypt and read those responses. Even TuskForm can't see encrypted data." },
  { q:"Do I need a crypto wallet to use TuskForm?", a:"No. TuskForm supports both wallet-based login (MetaMask, Sui Wallet, Phantom) and traditional email/password authentication. Wallet login gives you extra benefits like on-chain form ownership and Seal key management, but it's entirely optional." },
  { q:"How does the AI analysis work?", a:"Our AI (powered by GPT-4) reads every submission and automatically categorizes them by theme, detects sentiment, identifies urgent issues, and generates weekly digest reports. It groups similar feedback, surfaces trends, and suggests action items — saving your team hours of manual analysis every week." },
  { q:"What file types can respondents upload?", a:"TuskForm supports screenshots (PNG, JPG, WebP), videos (MP4, WebM), audio/voice notes (MP3, M4A, WAV), PDFs, and any document type. All uploads are stored permanently on Walrus with configurable size limits." },
];

export function FAQ() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once:true, margin:"-80px" });
  const [open, setOpen] = useState<number|null>(0);
  return (
    <section ref={ref} style={{ padding:"80px 24px" }}>
      <div style={{ maxWidth:700, margin:"0 auto" }}>
        <motion.div initial={{ opacity:0, y:28 }} animate={inView?{opacity:1,y:0}:{}} style={{ textAlign:"center", marginBottom:56 }}>
          <h2 className="text-section" style={{ color:"#fff", marginBottom:12 }}>Frequently asked <span className="gradient-text">questions</span></h2>
          <p className="prose">Everything you need to know about TuskForm.</p>
        </motion.div>
        <div>
          {FAQS.map((faq, i) => (
            <motion.div key={i} initial={{ opacity:0, y:12 }} animate={inView?{opacity:1,y:0}:{}} transition={{ delay:i*0.06 }}
              style={{ marginBottom:8, borderRadius:14, overflow:"hidden",
                background: open===i ? "rgba(99,102,241,0.06)" : "#0d1117",
                border: open===i ? "1px solid rgba(99,102,241,0.25)" : "1px solid rgba(255,255,255,0.07)",
                transition:"background 0.2s, border-color 0.2s" }}>
              <button onClick={() => setOpen(open===i ? null : i)}
                style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 22px", background:"none", border:"none", cursor:"pointer", textAlign:"left", gap:16 }}>
                <span style={{ fontSize:"0.9rem", fontWeight:600, color:"#fff", lineHeight:1.4 }}>{faq.q}</span>
                <ChevronDown size={17} color={open===i?"#6366f1":"#475569"} style={{ flexShrink:0, transition:"transform 0.25s", transform: open===i?"rotate(180deg)":"rotate(0deg)" }} />
              </button>
              <AnimatePresence>
                {open===i && (
                  <motion.div initial={{ height:0, opacity:0 }} animate={{ height:"auto", opacity:1 }} exit={{ height:0, opacity:0 }} transition={{ duration:0.22 }} style={{ overflow:"hidden" }}>
                    <div style={{ padding:"0 22px 18px", fontSize:"0.875rem", color:"#64748b", lineHeight:1.7 }}>{faq.a}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
