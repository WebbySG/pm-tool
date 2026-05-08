import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("query");
  if (!query) return NextResponse.json({ error: "Missing query" }, { status: 400 });

  const token = process.env.META_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ error: "META_ACCESS_TOKEN not set" }, { status: 503 });

  try {
    const params = new URLSearchParams({
      access_token: token,
      search_terms: query,
      ad_active_status: "ALL",
      ad_reached_countries: '["SG","US","GB","AU"]',
      fields: [
        "id",
        "ad_creation_time",
        "ad_creative_bodies",
        "ad_creative_link_titles",
        "ad_snapshot_url",
        "impressions",
        "spend",
        "publisher_platforms",
        "page_name",
      ].join(","),
      limit: "20",
    });

    const res = await fetch(`https://graph.facebook.com/v19.0/ads_archive?${params}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch Meta ads data" }, { status: 502 });
  }
}
