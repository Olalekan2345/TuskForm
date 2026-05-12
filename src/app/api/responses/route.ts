import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";

// ── Storage backend ────────────────────────────────────────────────────────
// Production (Railway): set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
//   → responses persist across deploys in Upstash Redis (free tier)
// Local dev: falls back to filesystem in .walrus-index/

const UPSTASH_URL   = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const USE_REDIS     = !!(UPSTASH_URL && UPSTASH_TOKEN);

// ── Redis helpers ──────────────────────────────────────────────────────────
async function redisGet(key: string): Promise<string[] | null> {
  const res = await fetch(`${UPSTASH_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
  });
  const json = await res.json();
  if (!json.result) return null;
  try { return JSON.parse(json.result); } catch { return null; }
}

async function redisRpush(key: string, value: string): Promise<void> {
  await fetch(`${UPSTASH_URL}/rpush/${encodeURIComponent(key)}/${encodeURIComponent(value)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
  });
}

async function redisSismember(key: string, value: string): Promise<boolean> {
  // We store as a Redis list, so check with lrange + includes
  const items = await redisGet(key);
  return items?.includes(value) ?? false;
}

// ── Filesystem helpers (local dev only) ───────────────────────────────────
const INDEX_DIR = path.join(process.cwd(), ".walrus-index");

async function fsGet(formId: string): Promise<string[]> {
  try {
    await mkdir(INDEX_DIR, { recursive: true });
    const data = await readFile(path.join(INDEX_DIR, `${formId}.json`), "utf-8");
    return JSON.parse(data).responseBlobIds ?? [];
  } catch {
    return [];
  }
}

async function fsAdd(formId: string, responseBlobId: string): Promise<number> {
  await mkdir(INDEX_DIR, { recursive: true });
  const file = path.join(INDEX_DIR, `${formId}.json`);
  let ids: string[] = [];
  try { ids = JSON.parse(await readFile(file, "utf-8")).responseBlobIds ?? []; } catch { /* new */ }
  if (!ids.includes(responseBlobId)) ids.push(responseBlobId);
  await writeFile(file, JSON.stringify({ responseBlobIds: ids }), "utf-8");
  return ids.length;
}

// ── Route handlers ─────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const formId = req.nextUrl.searchParams.get("formId");
  if (!formId) {
    return NextResponse.json({ error: "formId query param required" }, { status: 400 });
  }
  try {
    if (USE_REDIS) {
      const items = await redisGet(`responses:${formId}`) ?? [];
      return NextResponse.json({ responseBlobIds: items });
    }
    return NextResponse.json({ responseBlobIds: await fsGet(formId) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { formId, responseBlobId } = await req.json();
    if (!formId || !responseBlobId) {
      return NextResponse.json(
        { error: "formId and responseBlobId are required" },
        { status: 400 }
      );
    }

    if (USE_REDIS) {
      const alreadyExists = await redisSismember(`responses:${formId}`, responseBlobId);
      if (!alreadyExists) {
        await redisRpush(`responses:${formId}`, responseBlobId);
      }
      const items = await redisGet(`responses:${formId}`) ?? [];
      return NextResponse.json({ ok: true, count: items.length });
    }

    const count = await fsAdd(formId, responseBlobId);
    return NextResponse.json({ ok: true, count });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
