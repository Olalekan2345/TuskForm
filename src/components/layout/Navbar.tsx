"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { LogOut, Copy, Check, Menu, X } from "lucide-react";
import Image from "next/image";
import { useWalletStore } from "@/lib/walletStore";

const NAV = [
  { label: "Builder",   href: "/builder" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Analytics", href: "/analytics" },
];

export function Navbar({ onAuthOpen }: { onAuthOpen?: () => void }) {
  const [scrolled,    setScrolled]    = useState(false);
  const [copied,      setCopied]      = useState(false);
  const [menuOpen,    setMenuOpen]    = useState(false);

  const address    = useWalletStore(s => s.address);
  const disconnect = useWalletStore(s => s.disconnect);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // Close menu on route change / scroll
  useEffect(() => { if (scrolled) setMenuOpen(false); }, [scrolled]);

  const shortAddr = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : null;

  const copyAddr = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <nav style={{
        position:"fixed", top:0, left:0, right:0, zIndex:50, height:64,
        display:"flex", alignItems:"center", padding:"0 24px",
        transition:"background 0.3s, border-color 0.3s",
        background: scrolled ? "rgba(5,8,14,0.92)" : "transparent",
        backdropFilter: scrolled ? "blur(20px) saturate(180%)" : "none",
        borderBottom: scrolled ? "1px solid var(--glass-border)" : "1px solid transparent",
      }}>
        {/* Logo — navigates home; reloads page if already on "/" */}
        <Link href="/" onClick={(e) => { setMenuOpen(false); if (window.location.pathname === "/") { e.preventDefault(); window.location.reload(); } }}
          style={{ display:"flex", alignItems:"center", gap:10, textDecoration:"none", flexShrink:0 }}>
          <Image src="/logo.jpg" alt="TuskForm" width={20} height={20} style={{ borderRadius:5, objectFit:"cover" }} />
          <span style={{ fontWeight:800, fontSize:"1.1rem", color:"var(--ink)", letterSpacing:"-0.03em", fontFamily:"var(--font-display)" }}>
            Tusk<span style={{ color:"var(--teal)" }}>Form</span>
          </span>
          <span className="badge badge-primary" style={{ marginLeft:4 }}>Mainnet</span>
        </Link>

        {/* Desktop links */}
        <div className="nav-links" style={{ display:"flex", alignItems:"center", gap:4, margin:"0 auto" }}>
          {NAV.map(n => (
            <Link key={n.href} href={n.href}
              style={{ padding:"7px 14px", borderRadius:9, fontSize:"0.875rem", fontWeight:500, color:"var(--ink-muted)", textDecoration:"none", transition:"color 0.15s, background 0.15s" }}
              onMouseEnter={e=>{ (e.target as HTMLElement).style.color="var(--ink)"; (e.target as HTMLElement).style.background="rgba(255,255,255,0.05)"; }}
              onMouseLeave={e=>{ (e.target as HTMLElement).style.color="var(--ink-muted)"; (e.target as HTMLElement).style.background="transparent"; }}>
              {n.label}
            </Link>
          ))}
        </div>

        {/* Desktop wallet / CTA */}
        <div className="nav-links" style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
          {address ? (
            <>
              <button onClick={copyAddr}
                style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 12px", borderRadius:9, background:"rgba(0,200,224,0.08)", border:"1px solid rgba(0,200,224,0.2)", color:"var(--teal-pale)", fontSize:"0.8rem", fontWeight:600, cursor:"pointer", fontFamily:"monospace" }}>
                {copied ? <Check size={12} color="#34d399"/> : <Copy size={12}/>}
                {shortAddr}
              </button>
              <button onClick={() => disconnect?.()}
                style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 10px", borderRadius:9, background:"none", border:"1px solid var(--glass-border)", color:"var(--ink-muted)", fontSize:"0.8rem", cursor:"pointer" }}
                title="Disconnect wallet">
                <LogOut size={13}/> Disconnect
              </button>
            </>
          ) : (
            <>
              <button onClick={onAuthOpen} style={{ background:"none", border:"none", color:"var(--ink-muted)", fontSize:"0.875rem", cursor:"pointer" }}>
                Sign in
              </button>
              <button onClick={onAuthOpen} className="btn btn-primary btn-sm">
                Get started
              </button>
            </>
          )}
        </div>

        {/* Hamburger — mobile only */}
        <button
          className="nav-hamburger"
          onClick={() => setMenuOpen(o => !o)}
          style={{ display:"none", marginLeft:"auto", padding:8, borderRadius:9, background:"none", border:"1px solid var(--glass-border)", color:"var(--ink)", cursor:"pointer", alignItems:"center", justifyContent:"center" }}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="nav-mobile-menu" style={{ display:"none" }}>
          {NAV.map(n => (
            <Link key={n.href} href={n.href} onClick={() => setMenuOpen(false)}
              style={{ padding:"12px 16px", borderRadius:10, fontSize:"1rem", fontWeight:500, color:"var(--ink-muted)", textDecoration:"none", background:"rgba(255,255,255,0.03)", border:"1px solid var(--glass-border)" }}>
              {n.label}
            </Link>
          ))}
          <div style={{ borderTop:"1px solid var(--glass-border)", paddingTop:12, marginTop:4 }}>
            {address ? (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <button onClick={copyAddr}
                  style={{ display:"flex", alignItems:"center", gap:6, padding:"10px 14px", borderRadius:10, background:"rgba(0,200,224,0.08)", border:"1px solid rgba(0,200,224,0.2)", color:"var(--teal-pale)", fontSize:"0.85rem", fontWeight:600, cursor:"pointer", fontFamily:"monospace", width:"100%" }}>
                  {copied ? <Check size={13} color="#34d399"/> : <Copy size={13}/>}
                  {shortAddr}
                </button>
                <button onClick={() => { disconnect?.(); setMenuOpen(false); }}
                  style={{ display:"flex", alignItems:"center", gap:6, padding:"10px 14px", borderRadius:10, background:"none", border:"1px solid var(--glass-border)", color:"var(--ink-muted)", fontSize:"0.85rem", cursor:"pointer", width:"100%" }}>
                  <LogOut size={14}/> Disconnect
                </button>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <button onClick={() => { onAuthOpen?.(); setMenuOpen(false); }}
                  style={{ padding:"12px", borderRadius:10, background:"none", border:"1px solid var(--glass-border)", color:"var(--ink-muted)", fontSize:"0.95rem", cursor:"pointer", width:"100%" }}>
                  Sign in
                </button>
                <button onClick={() => { onAuthOpen?.(); setMenuOpen(false); }}
                  className="btn btn-primary"
                  style={{ width:"100%", justifyContent:"center", padding:"12px" }}>
                  Get started
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
