import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get("domain");
  if (!domain) return NextResponse.json({ error: "Missing domain" }, { status: 400 });

  const key = process.env.OPENPAGERANK_KEY;
  if (!key) return NextResponse.json({ error: "OPENPAGERANK_KEY not set" }, { status: 503 });

  try {
    const res = await fetch(
      `https://openpagerank.com/api/v1.0/getPageRank?domains[]=${encodeURIComponent(domain)}`,
      { headers: { "API-OPR": key } },
    );
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch PageRank data" }, { status: 502 });
  }
}
