"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { AuthModal } from "@/components/auth/AuthModal";
import { Button } from "@/components/ui/Button";
import { fetchFromWalrus } from "@/lib/walrus";
import { useWalletStore } from "@/lib/walletStore";
import type { StoredForm, FormResponse } from "@/lib/types";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import {
  TrendingUp, Users, BarChart3, Star, Zap, Loader2,
  FileText, Database, ArrowUpRight, RefreshCw
} from "lucide-react";
import Link from "next/link";

const Tip = ({ active, payload, label }: { active?:boolean; payload?:{value:number;name:string;color:string}[]; label?:string }) => {
  if (!active||!payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div style={{ fontSize:"0.72rem", color:"#475569", marginBottom:8 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ display:"flex", alignItems:"center", gap:8, fontSize:"0.83rem" }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:p.color }}/>
          <span style={{ color:"#94a3b8" }}>{p.name}:</span>
          <strong style={{ color:"#fff" }}>{p.value}</strong>
        </div>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const address = useWalletStore(s => s.address);
  const account = address ? { address } : null;

  const [authOpen, setAuthOpen]   = useState(false);
  const [myForms, setMyForms]     = useState<StoredForm[]>([]);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    if (!account?.address) { setMyForms([]); setResponses([]); return; }
    const key = `tuskform_forms_${account.address}`;
    const stored: StoredForm[] = JSON.parse(localStorage.getItem(key) || "[]");
    setMyForms(stored);
  }, [account?.address]);

  useEffect(() => {
    if (!myForms.length) { setResponses([]); return; }
    setLoading(true);
    Promise.all(
      myForms.map(async form => {
        try {
          const { responseBlobIds = [] }: { responseBlobIds: string[] } =
            await fetch(`/api/responses?formId=${form.blobId}`).then(r => r.json());
          return await Promise.all(
            responseBlobIds.map(id => fetchFromWalrus<FormResponse>(id).catch(() => null))
          );
        } catch { return []; }
      })
    )
      .then(nested => setResponses(nested.flat().filter(Boolean) as FormResponse[]))
      .finally(() => setLoading(false));
  }, [myForms]);

  // Compute chart data from real responses
  const byDay = responses.reduce<Record<string,number>>((acc, r) => {
    const d = new Date(r.respondedAt).toLocaleDateString("en-US", { month:"short", day:"numeric" });
    acc[d] = (acc[d]||0)+1; return acc;
  }, {});
  const areaData = Object.entries(byDay).map(([d,n]) => ({ d, n }));

  const byForm = myForms.map(f => ({
    name: f.title.length>18?f.title.slice(0,18)+"…":f.title,
    count: responses.filter(r=>r.formId===f.blobId).length,
  }));

  const ratingValues = responses.flatMap(r =>
    r.responses?.filter(f=>f.fieldType==="star_rating"&&!f.encrypted).map(f=>Number(f.value)).filter(n=>!isNaN(n)) || []
  );
  const avgRating = ratingValues.length ? (ratingValues.reduce((a,b)=>a+b,0)/ratingValues.length).toFixed(1) : "—";

  const sentimentData = [
    { name:"5 stars", value:ratingValues.filter(r=>r===5).length, color:"#10b981" },
    { name:"4 stars", value:ratingValues.filter(r=>r===4).length, color:"#6366f1" },
    { name:"3 stars", value:ratingValues.filter(r=>r===3).length, color:"#f59e0b" },
    { name:"1-2 stars",value:ratingValues.filter(r=>r<=2).length, color:"#ef4444" },
  ].filter(s=>s.value>0);

  const kpis = [
    { icon:Users,    label:"Total Responses", val:responses.length.toString(),   color:"#818cf8" },
    { icon:FileText, label:"Forms",           val:myForms.length.toString(),     color:"#34d399" },
    { icon:Star,     label:"Avg Rating",      val:avgRating,                     color:"#fbbf24" },
    { icon:Zap,      label:"Last 24h",        val:responses.filter(r=>Date.now()-r.respondedAt<86400000).length.toString(), color:"#a78bfa" },
  ];

  // Empty state — not connected
  if (!account) {
    return (
      <div style={{ display:"flex", flexDirection:"column", minHeight:"100vh", background:"#050814", color:"#e2e8f0" }}>
        <Navbar onAuthOpen={() => setAuthOpen(true)} />
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:20, padding:40, marginTop:64, textAlign:"center" }}>
          <div style={{ width:72, height:72, borderRadius:20, background:"rgba(99,102,241,0.1)", border:"1px solid rgba(99,102,241,0.2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <BarChart3 size={30} color="#818cf8"/>
          </div>
          <div>
            <h2 style={{ fontSize:"1.3rem", fontWeight:800, color:"#fff", marginBottom:8 }}>Connect your wallet</h2>
            <p style={{ fontSize:"0.875rem", color:"#64748b", maxWidth:360 }}>Connect your Sui wallet to view analytics for your Walrus-stored forms and responses.</p>
          </div>
          <Button onClick={() => setAuthOpen(true)} icon={<Zap size={14}/>}>Connect Wallet</Button>
        </div>
      </div>
    );
  }

  // Empty state — no forms
  if (!loading && myForms.length === 0) {
    return (
      <div style={{ display:"flex", flexDirection:"column", minHeight:"100vh", background:"#050814", color:"#e2e8f0" }}>
        <Navbar onAuthOpen={() => setAuthOpen(true)} />
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:20, padding:40, marginTop:64, textAlign:"center" }}>
          <div style={{ width:72, height:72, borderRadius:20, background:"rgba(99,102,241,0.1)", border:"1px solid rgba(99,102,241,0.2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Database size={30} color="#818cf8"/>
          </div>
          <div>
            <h2 style={{ fontSize:"1.3rem", fontWeight:800, color:"#fff", marginBottom:8 }}>No data yet</h2>
            <p style={{ fontSize:"0.875rem", color:"#64748b", maxWidth:360 }}>Create a form and collect responses to see analytics here. All data is stored on Walrus.</p>
          </div>
          <Link href="/builder">
            <Button>Build your first form</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", minHeight:"100vh", background:"#050814", color:"#e2e8f0" }}>
      <Navbar onAuthOpen={() => setAuthOpen(true)} />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />

      <div style={{ maxWidth:1200, width:"100%", margin:"0 auto", padding:"96px 24px 60px" }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:32 }}>
          <div>
            <h1 style={{ fontSize:"1.6rem", fontWeight:900, color:"#fff", marginBottom:4 }}>Analytics</h1>
            <p style={{ fontSize:"0.875rem", color:"#475569" }}>Real data from your Walrus-stored responses</p>
          </div>
          <Button variant="ghost" size="sm" icon={loading?<Loader2 size={13} style={{ animation:"spin 1s linear infinite" }}/>:<RefreshCw size={13}/>}
            onClick={() => { setMyForms([]); setTimeout(() => { if(account?.address){const k=`tuskform_forms_${account.address}`;setMyForms(JSON.parse(localStorage.getItem(k)||"[]")); }}, 100); }}>
            {loading?"Loading…":"Refresh"}
          </Button>
        </div>

        {/* KPIs */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:32 }}>
          {kpis.map(k => (
            <div key={k.label} className="stat-card">
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                <span style={{ fontSize:"0.72rem", fontWeight:600, color:"#475569", textTransform:"uppercase", letterSpacing:"0.06em" }}>{k.label}</span>
                <k.icon size={16} color={k.color}/>
              </div>
              <div style={{ fontSize:"2rem", fontWeight:800, color:"#fff" }}>{k.val}</div>
            </div>
          ))}
        </div>

        {/* Charts row 1 */}
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:20, marginBottom:20 }}>
          {/* Area chart */}
          <div className="card" style={{ padding:24 }}>
            <div style={{ fontSize:"0.83rem", fontWeight:700, color:"#fff", marginBottom:20 }}>Responses over time</div>
            {areaData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={areaData}>
                  <defs>
                    <linearGradient id="gr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                  <XAxis dataKey="d" tick={{ fill:"#475569", fontSize:11 }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fill:"#475569", fontSize:11 }} axisLine={false} tickLine={false}/>
                  <Tooltip content={<Tip/>}/>
                  <Area type="monotone" dataKey="n" name="Responses" stroke="#6366f1" fill="url(#gr)" strokeWidth={2}/>
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height:220, display:"flex", alignItems:"center", justifyContent:"center", color:"#334155", fontSize:"0.83rem" }}>
                Responses will appear here as they come in
              </div>
            )}
          </div>

          {/* Rating pie chart */}
          <div className="card" style={{ padding:24 }}>
            <div style={{ fontSize:"0.83rem", fontWeight:700, color:"#fff", marginBottom:20 }}>Rating distribution</div>
            {sentimentData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={sentimentData} cx="50%" cy="50%" innerRadius={45} outerRadius={68} dataKey="value" paddingAngle={3}>
                      {sentimentData.map((s,i) => <Cell key={i} fill={s.color}/>)}
                    </Pie>
                    <Tooltip content={<Tip/>}/>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:12 }}>
                  {sentimentData.map(s => (
                    <div key={s.name} style={{ display:"flex", alignItems:"center", gap:8, fontSize:"0.78rem" }}>
                      <div style={{ width:8, height:8, borderRadius:"50%", background:s.color, flexShrink:0 }}/>
                      <span style={{ color:"#64748b", flex:1 }}>{s.name}</span>
                      <span style={{ color:"#fff", fontWeight:600 }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ height:200, display:"flex", alignItems:"center", justifyContent:"center", color:"#334155", fontSize:"0.83rem", textAlign:"center" }}>
                Add a star rating field to see distribution
              </div>
            )}
          </div>
        </div>

        {/* Responses by form */}
        {byForm.length > 0 && byForm.some(f=>f.count>0) && (
          <div className="card" style={{ padding:24, marginBottom:20 }}>
            <div style={{ fontSize:"0.83rem", fontWeight:700, color:"#fff", marginBottom:20 }}>Responses by form</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={byForm} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false}/>
                <XAxis type="number" tick={{ fill:"#475569", fontSize:11 }} axisLine={false} tickLine={false}/>
                <YAxis dataKey="name" type="category" tick={{ fill:"#94a3b8", fontSize:12 }} axisLine={false} tickLine={false} width={140}/>
                <Tooltip content={<Tip/>}/>
                <Bar dataKey="count" name="Responses" fill="#6366f1" radius={[0,6,6,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Walrus note */}
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"14px 18px", borderRadius:14, background:"rgba(6,182,212,0.06)", border:"1px solid rgba(6,182,212,0.15)" }}>
          <Database size={16} color="#22d3ee"/>
          <div>
            <div style={{ fontSize:"0.83rem", fontWeight:600, color:"#fff", marginBottom:2 }}>All data on Walrus mainnet</div>
            <div style={{ fontSize:"0.75rem", color:"#64748b" }}>
              Response data is stored as immutable blobs on Walrus. The response index is local to this device.
              Responses submitted from other devices appear once the response blobIds are shared with you or indexed via Sui events (mainnet).
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
