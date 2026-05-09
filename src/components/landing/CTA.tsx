"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { ArrowRight, Zap } from "lucide-react";
import Link from "next/link";

export function CTA({ onAuthOpen }: { onAuthOpen?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once:true, margin:"-80px" });
  return (
    <section ref={ref} style={{ padding:"100px 24px", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 80% 60% at 50% 50%,rgba(99,102,241,0.12),transparent)", pointerEvents:"none" }} />
      <div className="mesh-grid" style={{ position:"absolute", inset:0, opacity:0.2, pointerEvents:"none" }} />
      <motion.div animate={{ scale:[1,1.15,1], opacity:[0.2,0.35,0.2] }} transition={{ duration:7, repeat:Infinity }}
        style={{ position:"absolute", top:"50%", left:"25%", width:300, height:300, background:"rgba(99,102,241,0.12)", borderRadius:"50%", filter:"blur(80px)", pointerEvents:"none" }} />
      <motion.div animate={{ scale:[1.15,1,1.15], opacity:[0.12,0.25,0.12] }} transition={{ duration:9, repeat:Infinity, delay:2 }}
        style={{ position:"absolute", top:"50%", right:"20%", width:280, height:280, background:"rgba(139,92,246,0.12)", borderRadius:"50%", filter:"blur(80px)", pointerEvents:"none" }} />
      <motion.div initial={{ opacity:0, y:36 }} animate={inView?{opacity:1,y:0}:{}} transition={{ duration:0.65 }}
        style={{ maxWidth:720, margin:"0 auto", textAlign:"center", position:"relative", zIndex:1 }}>
        <div className="section-label" style={{ marginBottom:22 }}><Zap size={11} /> Powered by Walrus &amp; Sui</div>
        <h2 className="text-display" style={{ color:"#fff", marginBottom:20 }}>
          Ready to own your <span className="gradient-text">feedback?</span>
        </h2>
        <p style={{ fontSize:"1.1rem", color:"#64748b", marginBottom:44, lineHeight:1.7, maxWidth:500, margin:"0 auto 44px" }}>
          Connect your Sui wallet and start building decentralized forms in minutes. Your data lives on Walrus — permanently and verifiably.
        </p>
        <div style={{ display:"flex", flexWrap:"wrap", gap:14, justifyContent:"center", marginBottom:32 }}>
          <Button size="xl" onClick={onAuthOpen} iconRight={<ArrowRight size={19} />}>Connect Wallet</Button>
          <Link href="/builder">
            <Button variant="ghost" size="xl">Try the builder</Button>
          </Link>
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", justifyContent:"center", gap:20, fontSize:"0.82rem", color:"#334155" }}>
          {["No account needed","Wallet is your identity","Data stored on Walrus","Sui mainnet live"].map(t => (
            <div key={t} style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:"#34d399" }} />{t}
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
