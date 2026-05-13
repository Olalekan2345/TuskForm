import { NextRequest, NextResponse } from "next/server";

// Allowed upstream key server hostnames — never proxy arbitrary URLs
const ALLOWED_HOSTS = [
  // Mysten Labs testnet open-mode servers
  "seal-key-server-testnet-1.mystenlabs.com",
  "seal-key-server-testnet-2.mystenlabs.com",
  // NodeInfra mainnet (kept for legacy; these return duplicate CORS headers)
  "open-seal-mainnet.nodeinfra.com",
  "seal-mainnet.nodeinfra.com",
  "seal-mainnet.mystenlabs.com",
];

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, Client-Sdk-Version, Client-Sdk-Type, Client-Target-Api-Version, Request-Id, X-Api-Key",
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

  // Forward all request headers except hop-by-hop ones
  const forwardHeaders: Record<string, string> = {};
  const skipRequest = new Set(["host", "connection", "transfer-encoding"]);
  req.headers.forEach((value, key) => {
    if (!skipRequest.has(key.toLowerCase())) forwardHeaders[key] = value;
  });

  const body = method === "POST" ? await req.arrayBuffer() : undefined;

  const upstream = await fetch(target, {
    method,
    headers: forwardHeaders,
    ...(body ? { body } : {}),
  });

  const data = await upstream.arrayBuffer();

  // Forward all upstream response headers except CORS ones (we set our own).
  // Critically, X-KeyServer-Version must be forwarded — the Seal SDK reads it
  // to verify the key server meets the minimum version requirement.
  const responseHeaders: Record<string, string> = {};
  const skipResponse = new Set(["access-control-allow-origin", "access-control-allow-methods", "access-control-allow-headers", "access-control-expose-headers"]);
  upstream.headers.forEach((value, key) => {
    if (!skipResponse.has(key.toLowerCase())) {
      responseHeaders[key] = value;
    }
  });

  return new NextResponse(data, {
    status: upstream.status,
    headers: {
      ...responseHeaders,
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
