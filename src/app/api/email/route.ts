import { NextRequest, NextResponse } from "next/server";

const RESEND_API = "https://api.resend.com/emails";

interface EmailPayload {
  type: "form_created" | "response_copy";
  to: string;
  // form_created
  formTitle?: string;
  formDescription?: string;
  formFields?: { label: string; type: string }[];
  shareUrl?: string;
  // response_copy
  responses?: { label: string; value: string | string[] }[];
  respondedAt?: number;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY;
  const from   = process.env.RESEND_FROM || "TuskForm <onboarding@resend.dev>";

  if (!apiKey || apiKey === "re_your_api_key_here") {
    return NextResponse.json({ error: "Email not configured" }, { status: 503 });
  }

  const body: EmailPayload = await req.json();
  const { type, to } = body;

  if (!to || !type) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  let subject = "";
  let html    = "";

  if (type === "form_created") {
    const { formTitle, formDescription, formFields = [], shareUrl } = body;
    subject = `Your form "${formTitle}" is live on TuskForm`;
    html = `
      <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;background:#05080e;color:#e8f0fa;border-radius:16px;overflow:hidden;border:1px solid #131e35">
        <div style="background:linear-gradient(135deg,#00c8e0,#4361ee);padding:32px;text-align:center">
          <h1 style="margin:0;font-size:1.5rem;font-weight:800;color:#fff">Your form is live!</h1>
        </div>
        <div style="padding:32px">
          <h2 style="font-size:1.2rem;font-weight:700;color:#fff;margin:0 0 8px">${formTitle}</h2>
          ${formDescription ? `<p style="color:#7a8eb0;margin:0 0 24px;line-height:1.6">${formDescription}</p>` : ""}
          <div style="background:#09101f;border-radius:12px;padding:20px;margin-bottom:24px;border:1px solid #131e35">
            <p style="font-size:0.78rem;color:#7a8eb0;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 12px;font-weight:600">Fields (${formFields.length})</p>
            ${formFields.map(f => `
              <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #131e35">
                <span style="color:#5ee8ff;font-size:0.85rem">•</span>
                <span style="color:#e8f0fa;font-size:0.9rem">${f.label}</span>
                <span style="color:#2c3a54;font-size:0.75rem;margin-left:auto">${f.type.replace(/_/g," ")}</span>
              </div>`).join("")}
          </div>
          ${shareUrl ? `
          <div style="text-align:center;margin-bottom:24px">
            <a href="${shareUrl}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#00c8e0,#4361ee);color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:0.95rem">
              View &amp; Share Form →
            </a>
          </div>
          <p style="font-size:0.8rem;color:#2c3a54;word-break:break-all;text-align:center">${shareUrl}</p>
          ` : ""}
          <p style="font-size:0.8rem;color:#2c3a54;margin:24px 0 0;text-align:center">
            Form stored permanently on Walrus · Sui mainnet
          </p>
        </div>
      </div>`;
  }

  if (type === "response_copy") {
    const { formTitle, responses = [], respondedAt } = body;
    const date = respondedAt ? new Date(respondedAt).toLocaleString() : new Date().toLocaleString();
    subject = `Your response to "${formTitle}" — copy`;
    html = `
      <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;background:#05080e;color:#e8f0fa;border-radius:16px;overflow:hidden;border:1px solid #131e35">
        <div style="background:linear-gradient(135deg,#00c8e0,#4361ee);padding:32px;text-align:center">
          <h1 style="margin:0;font-size:1.5rem;font-weight:800;color:#fff">Your response copy</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:0.9rem">${formTitle}</p>
        </div>
        <div style="padding:32px">
          <p style="color:#7a8eb0;font-size:0.85rem;margin:0 0 24px">Submitted on ${date}</p>
          ${responses.map(r => `
            <div style="margin-bottom:20px;padding:16px;background:#09101f;border-radius:12px;border:1px solid #131e35">
              <p style="font-size:0.75rem;color:#7a8eb0;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 8px;font-weight:600">${r.label}</p>
              <p style="font-size:0.95rem;color:#e8f0fa;margin:0;line-height:1.5">${Array.isArray(r.value) ? r.value.join(", ") : r.value || "—"}</p>
            </div>`).join("")}
          <p style="font-size:0.8rem;color:#2c3a54;margin:24px 0 0;text-align:center">
            Response stored permanently on Walrus · Sui mainnet
          </p>
        </div>
      </div>`;
  }

  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ error: err.message || "Send failed" }, { status: res.status });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Network error" }, { status: 500 });
  }
}
