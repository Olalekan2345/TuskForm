import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";

const UPSTASH_URL   = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const USE_REDIS     = !!(UPSTASH_URL && UPSTASH_TOKEN);

interface AdminFormEntry {
  blobId: string;
  title: string;
  description: string;
  createdAt: number;
  owner: string;
}

async function redisPipeline(cmds: (string | number)[][]): Promise<unknown[]> {
  const res = await fetch(`${UPSTASH_URL}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmds),
  });
  const json = await res.json();
  return Array.isArray(json) ? json.map((r: { result: unknown }) => r.result) : [];
}

async function redisGet(key: string): Promise<AdminFormEntry[]> {
  const [result] = await redisPipeline([["GET", key]]);
  if (typeof result !== "string") return [];
  try { return JSON.parse(result); } catch { return []; }
}

async function redisSet(key: string, val: AdminFormEntry[]): Promise<void> {
  await redisPipeline([["SET", key, JSON.stringify(val)]]);
}

const INDEX_DIR = path.join(process.cwd(), ".walrus-index");

async function fsGet(wallet: string): Promise<AdminFormEntry[]> {
  try {
    const data = await readFile(path.join(INDEX_DIR, `admin_${wallet}.json`), "utf-8");
    return JSON.parse(data) ?? [];
  } catch { return []; }
}

async function fsAdd(wallet: string, entry: AdminFormEntry): Promise<void> {
  await mkdir(INDEX_DIR, { recursive: true });
  const file = path.join(INDEX_DIR, `admin_${wallet}.json`);
  let entries: AdminFormEntry[] = [];
  try { entries = JSON.parse(await readFile(file, "utf-8")) ?? []; } catch { /* new */ }
  if (!entries.find(e => e.blobId === entry.blobId)) entries.push(entry);
  await writeFile(file, JSON.stringify(entries), "utf-8");
}

async function fsRemove(wallet: string, blobId: string): Promise<void> {
  await mkdir(INDEX_DIR, { recursive: true });
  const file = path.join(INDEX_DIR, `admin_${wallet}.json`);
  let entries: AdminFormEntry[] = [];
  try { entries = JSON.parse(await readFile(file, "utf-8")) ?? []; } catch { return; }
  await writeFile(file, JSON.stringify(entries.filter(e => e.blobId !== blobId)), "utf-8");
}

// GET /api/admin-forms?wallet=0x...
export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet) return NextResponse.json({ error: "wallet required" }, { status: 400 });
  const key = `admin_forms:${wallet}`;
  const entries = USE_REDIS ? await redisGet(key) : await fsGet(wallet);
  return NextResponse.json({ forms: entries });
}

// POST /api/admin-forms  { adminWallet, blobId, title, description, createdAt, owner }
export async function POST(req: NextRequest) {
  const { adminWallet, blobId, title, description, createdAt, owner } = await req.json();
  if (!adminWallet || !blobId || !owner) {
    return NextResponse.json({ error: "adminWallet, blobId, and owner are required" }, { status: 400 });
  }
  const entry: AdminFormEntry = { blobId, title, description, createdAt, owner };
  const key = `admin_forms:${adminWallet}`;
  if (USE_REDIS) {
    const entries = await redisGet(key);
    if (!entries.find(e => e.blobId === blobId)) {
      entries.push(entry);
      await redisSet(key, entries);
    }
  } else {
    await fsAdd(adminWallet, entry);
  }
  return NextResponse.json({ ok: true });
}

// DELETE /api/admin-forms?wallet=0x...&blobId=...
export async function DELETE(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  const blobId = req.nextUrl.searchParams.get("blobId");
  if (!wallet || !blobId) return NextResponse.json({ error: "wallet and blobId required" }, { status: 400 });
  const key = `admin_forms:${wallet}`;
  if (USE_REDIS) {
    const entries = await redisGet(key);
    await redisSet(key, entries.filter(e => e.blobId !== blobId));
  } else {
    await fsRemove(wallet, blobId);
  }
  return NextResponse.json({ ok: true });
}
