import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

// ── Transport priority ─────────────────────────────────────────────────────
// 1. Brevo SMTP  — BREVO_SMTP_USER + BREVO_SMTP_KEY  (recommended, free)
// 2. Gmail SMTP  — GMAIL_USER + GMAIL_APP_PASSWORD   (requires 2FA enabled)
// 3. Generic SMTP— SMTP_HOST + SMTP_PORT + SMTP_USER + SMTP_PASS
// 4. Resend REST — RESEND_API_KEY (requires verified domain for other recipients)

const BREVO_USER = process.env.BREVO_SMTP_USER;
const BREVO_KEY  = process.env.BREVO_SMTP_KEY;
const USE_BREVO  = !!(BREVO_USER && BREVO_KEY);

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD;
const USE_GMAIL  = !USE_BREVO && !!(GMAIL_USER && GMAIL_PASS);

const SMTP_HOST  = process.env.SMTP_HOST;
const SMTP_PORT  = Number(process.env.SMTP_PORT || 587);
const SMTP_USER  = process.env.SMTP_USER;
const SMTP_PASS  = process.env.SMTP_PASS;
const USE_SMTP   = !USE_BREVO && !USE_GMAIL && !!(SMTP_HOST && SMTP_USER && SMTP_PASS);

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM    = process.env.RESEND_FROM || "TuskForm <onboarding@resend.dev>";
const USE_RESEND     = !USE_BREVO && !USE_GMAIL && !USE_SMTP &&
                       !!(RESEND_API_KEY && RESEND_API_KEY !== "re_your_api_key_here");

function buildTransport() {
  if (USE_BREVO) {
    return nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false,
      auth: { user: BREVO_USER, pass: BREVO_KEY },
    });
  }
  if (USE_GMAIL) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user: GMAIL_USER, pass: GMAIL_PASS },
    });
  }
  if (USE_SMTP) {
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return null;
}

function getSenderAddress() {
  if (USE_BREVO)  return `TuskForm <${BREVO_USER}>`;
  if (USE_GMAIL)  return `TuskForm <${GMAIL_USER}>`;
  if (USE_SMTP)   return `TuskForm <${SMTP_USER}>`;
  return RESEND_FROM;
}

async function sendEmail(to: string, subject: string, html: string) {
  const transport = buildTransport();
  if (transport) {
    await transport.sendMail({ from: getSenderAddress(), to, subject, html });
    return;
  }
  // Resend fallback
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: RESEND_FROM, to, subject, html }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Resend error ${res.status}`);
  }
}

// ── Email templates ────────────────────────────────────────────────────────

interface EmailPayload {
  type: "form_created" | "response_copy";
  to: string;
  formTitle?: string;
  formDescription?: string;
  formFields?: { label: string; type: string }[];
  shareUrl?: string;
  responses?: { label: string; value: string | string[] }[];
  respondedAt?: number;
}

function buildHtml(body: EmailPayload): { subject: string; html: string } | null {
  const { type } = body;

  if (type === "form_created") {
    const { formTitle, formDescription, formFields = [], shareUrl } = body;
    return {
      subject: `Your form "${formTitle}" is live on TuskForm`,
      html: `
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
                  <span style="color:#2c3a54;font-size:0.75rem;margin-left:auto">${f.type.replace(/_/g, " ")}</span>
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
        </div>`,
    };
  }

  if (type === "response_copy") {
    const { formTitle, responses = [], respondedAt } = body;
    const date = respondedAt ? new Date(respondedAt).toLocaleString() : new Date().toLocaleString();
    return {
      subject: `Your response to "${formTitle}" — copy`,
      html: `
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
        </div>`,
    };
  }

  return null;
}

// ── Route handler ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!USE_BREVO && !USE_GMAIL && !USE_SMTP && !USE_RESEND) {
    return NextResponse.json(
      { error: "Email not configured. Add BREVO_SMTP_USER + BREVO_SMTP_KEY (or GMAIL_USER + GMAIL_APP_PASSWORD) to env vars." },
      { status: 503 }
    );
  }

  const body: EmailPayload = await req.json();
  const { to, type } = body;

  if (!to || !type) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const email = buildHtml(body);
  if (!email) {
    return NextResponse.json({ error: "Unknown email type" }, { status: 400 });
  }

  try {
    await sendEmail(to, email.subject, email.html);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[email] send failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Send failed" },
      { status: 500 }
    );
  }
}
