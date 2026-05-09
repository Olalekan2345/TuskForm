"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { WalrusSection } from "@/components/landing/WalrusSection";
import { SealSection } from "@/components/landing/SealSection";
import { AISection } from "@/components/landing/AISection";
import { Testimonials } from "@/components/landing/Testimonials";
import { FAQ } from "@/components/landing/FAQ";
import { CTA } from "@/components/landing/CTA";
import { AuthModal } from "@/components/auth/AuthModal";
import { ArrowUp } from "lucide-react";

const WalrusWatermark = dynamic(() => import("@/components/WalrusWatermark"), { ssr: false });

export default function Home() {
  const [authOpen, setAuthOpen] = useState(false);
  const [showTop, setShowTop]   = useState(false);

  useEffect(() => {
    const fn = () => setShowTop(window.scrollY > 400);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <main className="relative overflow-x-hidden" style={{ background: "var(--bg)", color: "var(--ink)" }}>
      <WalrusWatermark />
      <Navbar onAuthOpen={() => setAuthOpen(true)} />
      <Hero onAuthOpen={() => setAuthOpen(true)} />
      <Features />
      <WalrusSection />
      <SealSection />
      <AISection />
      <Testimonials />
      <FAQ />
      <CTA onAuthOpen={() => setAuthOpen(true)} />
      <Footer />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />

      {/* Back to top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        style={{
          position: "fixed",
          bottom: 32,
          right: 32,
          zIndex: 99,
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: "linear-gradient(135deg,#00c8e0,#4361ee)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 20px rgba(0,200,224,0.4)",
          opacity: showTop ? 1 : 0,
          transform: showTop ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 0.25s ease, transform 0.25s ease",
          pointerEvents: showTop ? "auto" : "none",
        }}
        aria-label="Back to top"
      >
        <ArrowUp size={18} color="#fff" />
      </button>
    </main>
  );
}
