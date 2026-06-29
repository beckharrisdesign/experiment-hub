import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getExperimentBySlug } from "@/lib/data";
import { upsertPullRequests } from "@/lib/supabase";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const cookieStore = await cookies();
  const editCookie = cookieStore.get("hub-edit");
  if (!editCookie || editCookie.value !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const experiment = await getExperimentBySlug(slug);
  if (!experiment) {
    return NextResponse.json(
      { error: "Experiment not found" },
      { status: 404 },
    );
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "GITHUB_TOKEN not configured" },
      { status: 503 },
    );
  }

  // Search for PRs referencing the experiment ID in title, body, or branch
  const q = `repo:beckharrisdesign/experiment-hub is:pr ${experiment.id}`;
  const res = await fetch(
    `https://api.github.com/search/issues?q=${encodeURIComponent(q)}&per_page=50&sort=updated`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("[PR sync] GitHub API error:", text);
    return NextResponse.json({ error: "GitHub API error" }, { status: 502 });
  }

  const json = await res.json();
  const items: Record<string, unknown>[] = json.items ?? [];

  if (items.length === 0) {
    return NextResponse.json({ success: true, pullRequests: [] });
  }

  const rows = items.map((item) => {
    const pr = item.pull_request as Record<string, unknown> | undefined;
    const mergedAt = (pr?.merged_at as string) ?? null;
    const state = mergedAt
      ? "merged"
      : (item.state as string) === "closed"
        ? "closed"
        : "open";
    return {
      experiment_id: experiment.id,
      repo: "beckharrisdesign/experiment-hub",
      pr_number: item.number as number,
      title: (item.title as string) ?? "",
      state,
      url: (item.html_url as string) ?? "",
      branch: "",
      author: ((item.user as Record<string, unknown>)?.login as string) ?? "",
      labels: ((item.labels as Record<string, unknown>[]) ?? []).map(
        (l) => (l.name as string) ?? "",
      ),
      opened_at: (item.created_at as string) ?? new Date().toISOString(),
      merged_at: mergedAt,
    };
  });

  try {
    const pullRequests = await upsertPullRequests(rows);
    return NextResponse.json({ success: true, pullRequests });
  } catch (err) {
    console.error("[PR sync] Upsert error:", err);
    return NextResponse.json(
      { error: "Failed to save pull requests" },
      { status: 500 },
    );
  }
}
