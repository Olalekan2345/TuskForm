import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";

// File-based index: maps formId (Walrus blobId) → responseBlobIds[]
// Data lives on Walrus; this index only stores the IDs.
// On mainnet this would be replaced by Sui event indexing.
const INDEX_DIR = path.join(process.cwd(), ".walrus-index");

async function getIndexPath(formId: string) {
  await mkdir(INDEX_DIR, { recursive: true });
  return path.join(INDEX_DIR, `${formId}.json`);
}

export async function GET(req: NextRequest) {
  const formId = req.nextUrl.searchParams.get("formId");
  if (!formId) {
    return NextResponse.json({ error: "formId query param required" }, { status: 400 });
  }
  try {
    const file = await getIndexPath(formId);
    const data = await readFile(file, "utf-8");
    return NextResponse.json(JSON.parse(data));
  } catch {
    return NextResponse.json({ responseBlobIds: [] });
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
    const file = await getIndexPath(formId);
    let index: { responseBlobIds: string[] } = { responseBlobIds: [] };
    try {
      index = JSON.parse(await readFile(file, "utf-8"));
    } catch { /* first response for this form */ }

    if (!index.responseBlobIds.includes(responseBlobId)) {
      index.responseBlobIds.push(responseBlobId);
    }
    await writeFile(file, JSON.stringify(index), "utf-8");
    return NextResponse.json({ ok: true, count: index.responseBlobIds.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
