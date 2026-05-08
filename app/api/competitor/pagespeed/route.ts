import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  const key = process.env.GOOGLE_PAGESPEED_KEY ?? "";
  const keyParam = key ? `&key=${key}` : "";
  const base = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

  try {
    const [mobileRes, desktopRes] = await Promise.all([
      fetch(`${base}?url=${encodeURIComponent(url)}&strategy=mobile${keyParam}`),
      fetch(`${base}?url=${encodeURIComponent(url)}&strategy=desktop${keyParam}`),
    ]);
    const [mobile, desktop] = await Promise.all([mobileRes.json(), desktopRes.json()]);
    return NextResponse.json({ mobile, desktop });
  } catch {
    return NextResponse.json({ error: "Failed to fetch PageSpeed data" }, { status: 502 });
  }
}
