import { NextRequest, NextResponse } from "next/server";

// Allowed upstream key server hostnames — never proxy arbitrary URLs
const ALLOWED_HOSTS = [
  "open-seal-mainnet.nodeinfra.com",
  "seal-mainnet.nodeinfra.com",
  "seal-mainnet.mystenlabs.com",
];

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    // Include all headers the Seal SDK may send
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, Client-Sdk-Version, Client-Sdk-Type, Client-Target-Api-Version, X-Api-Key",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

async function proxy(req: NextRequest, method: "GET" | "POST") {
  const target = req.nextUrl.searchParams.get("target");
  if (!target) {
    return NextResponse.json({ error: "missing target" }, { status: 400 });
  }

  let url: URL;
  try {
    url = new URL(target);
  } catch {
    return NextResponse.json({ error: "invalid target url" }, { status: 400 });
  }

  if (!ALLOWED_HOSTS.includes(url.hostname)) {
    return NextResponse.json({ error: "forbidden host" }, { status: 403 });
  }

  const body = method === "POST" ? await req.arrayBuffer() : undefined;

  // Forward all request headers except host/connection so the key server
  // receives SDK headers like Client-Sdk-Version, Client-Sdk-Type, etc.
  const forwardHeaders: Record<string, string> = {};
  const skip = new Set(["host", "connection", "transfer-encoding"]);
  req.headers.forEach((value, key) => {
    if (!skip.has(key.toLowerCase())) forwardHeaders[key] = value;
  });

  const upstream = await fetch(target, {
    method,
    headers: forwardHeaders,
    ...(body ? { body } : {}),
  });

  const data = await upstream.arrayBuffer();
  return new NextResponse(data, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "application/octet-stream",
      ...corsHeaders(),
    },
  });
}

export async function GET(req: NextRequest) {
  return proxy(req, "GET");
}

export async function POST(req: NextRequest) {
  return proxy(req, "POST");
}
