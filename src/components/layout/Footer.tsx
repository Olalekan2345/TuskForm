import Link from "next/link";
import Image from "next/image";
import { X, Github, MessageSquare } from "lucide-react";

const SOCIAL = [
  { Icon: X,            href: "https://x.com/walrusprotocol",                  label: "X / Twitter" },
  { Icon: Github,       href: "https://github.com/Olalekan2345/TuskForm",       label: "GitHub" },
  { Icon: MessageSquare,href: "https://discord.gg/walrusprotocol",              label: "Discord" },
];

const LINKS = {
  Product:  [["Form Builder","/builder"],["Dashboard","/dashboard"],["Analytics","/analytics"],["Templates","#"],["Changelog","#"]],
  Platform: [
    ["Walrus Storage",   "https://walrus.xyz"],
    ["Seal Encryption",  "https://seal-docs.wal.app/"],
    ["AI Intelligence",  "/#ai"],
    ["Walrus Docs",      "https://docs.walrus.site/"],
    ["Sui Network",      "https://sui.io/"],
  ],
  Company:  [["About","#"],["Blog","#"],["Careers","#"],["Press","#"],["Contact","#"]],
  Legal:    [["Privacy","#"],["Terms","#"],["Security","#"],["Cookies","#"]],
};

export function Footer() {
  return (
    <footer style={{ borderTop:"1px solid var(--glass-border)", padding:"72px 24px 36px", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 60% 30% at 50% 100%,rgba(0,200,224,0.04),transparent)", pointerEvents:"none" }} />
      <div style={{ maxWidth:1100, margin:"0 auto", position:"relative" }}>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr", gap:40, marginBottom:60 }}>
          {/* Brand */}
          <div>
            <Link href="/" style={{ display:"flex", alignItems:"center", gap:10, textDecoration:"none", marginBottom:14 }}>
              <Image src="/logo.jpg" alt="TuskForm" width={28} height={28} style={{ borderRadius:8, objectFit:"cover" }} />
              <span style={{ fontWeight:800, fontSize:"1rem", color:"var(--ink)", fontFamily:"var(--font-display)", letterSpacing:"-0.03em" }}>
                Tusk<span style={{ color:"var(--teal)" }}>Form</span>
              </span>
            </Link>
            <p style={{ fontSize:"0.82rem", color:"var(--ink-muted)", lineHeight:1.7, maxWidth:220, marginBottom:20 }}>
              The decentralized AI-powered form platform for Web3 teams, DAOs, and enterprises.
            </p>
            <div style={{ display:"flex", gap:8 }}>
              {SOCIAL.map(({ Icon, href, label }) => (
                <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label}
                  style={{ width:34, height:34, borderRadius:9, background:"rgba(255,255,255,0.04)", border:"1px solid var(--glass-border)", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--ink-muted)", textDecoration:"none", transition:"all 0.2s" }}
                  onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.color="var(--teal)"; (e.currentTarget as HTMLElement).style.borderColor="rgba(0,200,224,0.25)"; }}
                  onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.color="var(--ink-muted)"; (e.currentTarget as HTMLElement).style.borderColor="var(--glass-border)"; }}>
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>
          {/* Link groups */}
          {Object.entries(LINKS).map(([group, links]) => (
            <div key={group}>
              <div style={{ fontSize:"0.72rem", fontWeight:700, color:"var(--ink-faint)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:16 }}>{group}</div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {links.map(([label, href]) => {
                  const external = href.startsWith("http");
                  return external ? (
                    <a key={label} href={href} target="_blank" rel="noreferrer"
                      style={{ fontSize:"0.83rem", color:"var(--ink-muted)", textDecoration:"none", transition:"color 0.15s" }}
                      onMouseEnter={e=>{ (e.target as HTMLElement).style.color="var(--ink)"; }}
                      onMouseLeave={e=>{ (e.target as HTMLElement).style.color="var(--ink-muted)"; }}>{label}
                    </a>
                  ) : (
                    <Link key={label} href={href}
                      style={{ fontSize:"0.83rem", color:"var(--ink-muted)", textDecoration:"none", transition:"color 0.15s" }}
                      onMouseEnter={e=>{ (e.target as HTMLElement).style.color="var(--ink)"; }}
                      onMouseLeave={e=>{ (e.target as HTMLElement).style.color="var(--ink-muted)"; }}>{label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div style={{ paddingTop:24, borderTop:"1px solid var(--glass-border)", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
          <div style={{ fontSize:"0.75rem", color:"var(--ink-faint)" }}>© 2025 TuskForm. Built on Walrus + Seal. All rights reserved.</div>
          <div style={{ display:"flex", alignItems:"center", gap:12, fontSize:"0.75rem", color:"var(--ink-faint)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:"#34d399" }} /> All systems operational
            </div>
            <span>·</span>
            <span>Stored on Walrus · Protected by Seal</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
