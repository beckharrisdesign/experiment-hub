import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getLinkedRepoById, upsertPullRequests } from "@/lib/supabase";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const cookieStore = await cookies();
  const editCookie = cookieStore.get("hub-edit");
  if (!editCookie || editCookie.value !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const linkedRepo = await getLinkedRepoById(id);
  if (!linkedRepo) {
    return NextResponse.json(
      { error: "Linked repo not found" },
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

  const repoSlug = linkedRepo.repoSlug; // "owner/repo"
  const res = await fetch(
    `https://api.github.com/repos/${repoSlug}/pulls?state=open&per_page=50&sort=updated`,
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

  const items: Record<string, unknown>[] = await res.json();

  if (items.length === 0) {
    return NextResponse.json({ success: true, pullRequests: [] });
  }

  const rows = items.map((item) => {
    const head = item.head as Record<string, unknown> | undefined;
    const user = item.user as Record<string, unknown> | undefined;
    return {
      linked_repo_id: linkedRepo.id,
      experiment_id: null,
      repo: repoSlug,
      pr_number: item.number as number,
      title: (item.title as string) ?? "",
      state: "open" as const,
      url: (item.html_url as string) ?? "",
      branch: (head?.ref as string) ?? "",
      author: (user?.login as string) ?? "",
      labels: ((item.labels as Record<string, unknown>[]) ?? []).map(
        (l) => (l.name as string) ?? "",
      ),
      opened_at: (item.created_at as string) ?? new Date().toISOString(),
      merged_at: null,
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
