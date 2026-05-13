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
// Uses the Upstash REST pipeline endpoint so values containing special
// characters are sent in the JSON body rather than URL path segments.
// Storage model: one Redis STRING key per form, value = JSON array of blob IDs.
// (Previously used RPUSH → LIST type, which caused WRONGTYPE errors on GET.)

async function redisPipeline(cmds: (string | number)[][]): Promise<unknown[]> {
  const res = await fetch(`${UPSTASH_URL}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cmds),
  });
  const json = await res.json();
  return Array.isArray(json) ? json.map((r: { result: unknown }) => r.result) : [];
}

async function redisGetList(key: string): Promise<string[]> {
  const [result] = await redisPipeline([["GET", key]]);
  if (typeof result !== "string") return [];
  try { return JSON.parse(result); } catch { return []; }
}

async function redisSetList(key: string, ids: string[]): Promise<void> {
  await redisPipeline([["SET", key, JSON.stringify(ids)]]);
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
      const ids = await redisGetList(`responses:${formId}`);
      return NextResponse.json({ responseBlobIds: ids });
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
      const key = `responses:${formId}`;
      const ids = await redisGetList(key);
      if (!ids.includes(responseBlobId)) {
        ids.push(responseBlobId);
        await redisSetList(key, ids);
      }
      return NextResponse.json({ ok: true, count: ids.length });
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
