# TuskForm — Decentralized Forms on Walrus + Sui

> Build forms. Store responses forever. Gate access with wallet addresses. No servers. No databases. No middlemen.

**Live app:** [tuskform-production.up.railway.app](https://tuskform-production.up.railway.app)

---

## What it does

TuskForm is an on-chain form infrastructure built on Sui. Form schemas and responses are stored as immutable blobs on Walrus decentralized storage, with optional field-level threshold encryption via Mysten Seal. Respondents can optionally authenticate with their Sui wallet, giving creators verifiable, wallet-linked submissions.

| Feature | How it works |
|---|---|
| **Form builder** | Drag-and-drop fields (text, email, file upload, checkbox, dropdown, rating, wallet address…) |
| **Permanent storage** | Form schema + each response stored on Walrus mainnet (~1 year, 52 epochs) |
| **Wallet-gated fields** | Mark any field "private" — encrypted with **Mysten Seal** (threshold IBE), only the form owner's wallet can decrypt |
| **File uploads** | Respondents can attach images/files — blobs stored directly on Walrus |
| **Response dashboard** | Owner connects wallet, dashboard fetches + decrypts all responses on-chain |
| **Email notifications** | Respondents get a copy; form owner notified on creation — via Brevo SMTP |
| **Response index** | Upstash Redis maps `formId → [responseBlobId…]` so the dashboard can find all responses without scanning the chain |

---

## Stack

- **Next.js 15** — frontend + API routes
- **Walrus** (`@mysten/walrus`) — blob storage for forms and responses
- **Sui** (`@mysten/sui`, `@mysten/dapp-kit`) — wallet connection, transaction signing
- **Mysten Seal** (`@mysten/seal`) — threshold IBE encryption for private fields
- **Upstash Redis** — lightweight response index (blob ID lists per form)
- **Brevo SMTP / Nodemailer** — transactional email (no domain verification needed)
- **Railway** — deployment

---

## How Seal encryption works

Private fields are encrypted client-side before upload using the Seal SDK:

1. Form owner marks fields as private in the builder
2. On submit, each private value is encrypted with `SealClient.encrypt({ threshold: 1, packageId, id })` against the Mysten Labs testnet key servers
3. Encrypted bytes are stored in the Walrus response blob
4. On the dashboard, owner signs a `SessionKey` transaction, the Seal SDK fetches the decryption key from the key servers, and values are decrypted locally

Package deployed to Sui mainnet: `0x3b179126a88104d254ffdea2157e173fe715b0d8acf7306c50b03076fa0fe14b`

---

## Run locally

```bash
git clone https://github.com/olalekan2345/tuskform.git
cd tuskform
npm install
cp .env.example .env.local   # fill in your keys
npm run dev
```

**Required env vars:**

| Variable | Purpose |
|---|---|
| `BREVO_SMTP_USER` | Brevo login email (free at brevo.com) |
| `BREVO_SMTP_KEY` | Brevo SMTP key |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token |
| `SERVER_WALLET_KEY` | Sui wallet private key (`suiprivkey1…`) — needs SUI + WAL |
| `NEXT_PUBLIC_WALRUS_AGGREGATOR_URL` | Walrus aggregator endpoint |
| `NEXT_PUBLIC_SEAL_PACKAGE_ID` | Seal address_gate package on testnet |

---

## Project structure

```
src/
  app/
    builder/        # Form builder UI
    forms/[id]/     # Public form fill page
    dashboard/      # Owner dashboard (wallet-gated, decryption)
    analytics/      # Response analytics view
    api/
      email/        # Send confirmation emails via Brevo/nodemailer
      responses/    # Response index (Redis-backed)
      seal-proxy/   # CORS proxy for Mysten Seal key servers
      walrus/       # Walrus blob read/write helpers
  lib/
    seal.ts         # Seal encrypt/decrypt helpers
    walrus.ts       # Walrus upload/download helpers
```

---

## Demo

[Watch the demo video](https://tuskform-production.up.railway.app/api/download?blobId=lX9TPTOqkzunYeWdAb5qBRKFMZmzgdPv_CX8_uYQ_BE&fileName=TuskForm%20Demo%20Video(720P_HD).mp4&fileType=video%2Fmp4&inline=1)

---

## Hackathon

Built for the **Walrus Hackathon**. TuskForm demonstrates that a full-featured form platform can run entirely on decentralized infrastructure — Walrus for storage, Sui for identity, Seal for encryption — with no traditional backend database.
