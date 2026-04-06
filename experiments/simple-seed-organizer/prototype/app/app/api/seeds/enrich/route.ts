import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getAiUsage, incrementAiUsage } from "@/lib/ai-usage";
import { canUseAICount } from "@/lib/limits";
import { getTierForUser } from "@/lib/tier";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/seeds/enrich
 *
 * Fills in missing growing-data fields (daysToGermination, daysToMaturity,
 * sunRequirement, spacing, plantingDepth) for a saved seed using GPT.
 *
 * Counts as 1 AI completion. Only enriches fields that are currently null/undefined.
 *
 * Body: JSON { seedId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: "Not configured" }, { status: 500 });
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`enrich:${user.id}`, { windowMs: 60_000, max: 20 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers: rl.retryAfter
            ? { "Retry-After": String(rl.retryAfter) }
            : {},
        },
      );
    }

    const body = await request.json().catch(() => null);
    const seedId = body?.seedId as string | undefined;
    if (!seedId) {
      return NextResponse.json(
        { error: "seedId is required" },
        { status: 400 },
      );
    }

    const { data: seedRow, error: seedFetchError } = await supabase
      .from("seeds")
      .select(
        "id,user_id,name,variety,days_to_germination,days_to_maturity,sun_requirement,spacing,planting_depth",
      )
      .eq("id", seedId)
      .single();
    if (seedFetchError || !seedRow) {
      return NextResponse.json({ error: "Seed not found" }, { status: 404 });
    }
    if (seedRow.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // Map snake_case DB row to camelCase for the rest of the handler
    const seed = {
      id: seedRow.id,
      user_id: seedRow.user_id,
      name: seedRow.name as string | undefined,
      variety: seedRow.variety as string | undefined,
      daysToGermination: seedRow.days_to_germination as string | undefined,
      daysToMaturity: seedRow.days_to_maturity as string | undefined,
      sunRequirement: seedRow.sun_requirement as string | undefined,
      spacing: seedRow.spacing as string | undefined,
      plantingDepth: seedRow.planting_depth as string | undefined,
    };

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY environment variable is not set" },
        { status: 500 },
      );
    }

    const tier = await getTierForUser(
      user.id,
      supabase,
      user.email ?? undefined,
    );
    const aiCompletions = await getAiUsage(supabase, user.id);
    if (!canUseAICount(aiCompletions, tier, 1)) {
      return NextResponse.json(
        {
          error: "AI limit reached",
          message: "Upgrade to use more AI features this month.",
        },
        { status: 402 },
      );
    }

    // Build list of fields to fill in
    const missing: string[] = [];
    if (!seed.daysToGermination) missing.push("daysToGermination");
    if (!seed.daysToMaturity) missing.push("daysToMaturity");
    if (!seed.sunRequirement) missing.push("sunRequirement");
    if (!seed.spacing) missing.push("spacing");
    if (!seed.plantingDepth) missing.push("plantingDepth");

    if (missing.length === 0) {
      return NextResponse.json({ success: true, seed, enriched: [] });
    }

    const plantName = [seed.name, seed.variety].filter(Boolean).join(" – ");
    const prompt = `You are a horticultural reference database. Given a seed variety, return standard growing data.

Seed: ${plantName}

Return only a JSON object with these fields (use null for any field that is unknown or highly variable by region):
{
  "daysToGermination": "X-Y days",
  "daysToMaturity": "X-Y days",
  "sunRequirement": "full-sun" | "partial-shade" | "full-shade",
  "spacing": "X-Y inches",
  "plantingDepth": "X inch"
}

Rules:
- daysToGermination: time from sowing to first true leaves (e.g. "7-14 days")
- daysToMaturity: days from transplant or direct sow to harvest (e.g. "70-80 days")
- sunRequirement: one of exactly: "full-sun", "partial-shade", "full-shade"
- spacing: typical plant spacing (e.g. "12-18 inches")
- plantingDepth: seed sowing depth (e.g. "1/4 inch")
- Only fill in fields that are standard for this variety; use null otherwise`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300,
        response_format: { type: "json_object" },
        temperature: 0.0,
      }),
    });

    const responseText = await res.text();
    if (!res.ok) {
      throw new Error(`OpenAI error: ${responseText.substring(0, 200)}`);
    }

    const data = JSON.parse(responseText);
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content from OpenAI");

    let enriched: Record<string, string | null>;
    try {
      enriched = JSON.parse(content);
    } catch {
      throw new Error(
        `Failed to parse AI response: ${content.substring(0, 100)}`,
      );
    }

    // Only apply fields that were missing and returned non-null
    const str = (v: unknown) =>
      (typeof v === "string" && v.trim()) || undefined;
    const sunReq = (
      v: unknown,
    ): "full-sun" | "partial-shade" | "full-shade" | undefined => {
      if (v === "full-sun" || v === "partial-shade" || v === "full-shade")
        return v;
      return undefined;
    };

    const updates: Partial<typeof seed> = {};
    const enrichedFields: string[] = [];

    if (!seed.daysToGermination && str(enriched.daysToGermination)) {
      updates.daysToGermination = str(enriched.daysToGermination);
      enrichedFields.push("daysToGermination");
    }
    if (!seed.daysToMaturity && str(enriched.daysToMaturity)) {
      updates.daysToMaturity = str(enriched.daysToMaturity);
      enrichedFields.push("daysToMaturity");
    }
    if (!seed.sunRequirement && sunReq(enriched.sunRequirement)) {
      updates.sunRequirement = sunReq(enriched.sunRequirement);
      enrichedFields.push("sunRequirement");
    }
    if (!seed.spacing && str(enriched.spacing)) {
      updates.spacing = str(enriched.spacing);
      enrichedFields.push("spacing");
    }
    if (!seed.plantingDepth && str(enriched.plantingDepth)) {
      updates.plantingDepth = str(enriched.plantingDepth);
      enrichedFields.push("plantingDepth");
    }

    let updatedSeed: typeof seed & Record<string, unknown> = seed;
    if (enrichedFields.length > 0) {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.daysToGermination)
        dbUpdates.days_to_germination = updates.daysToGermination;
      if (updates.daysToMaturity)
        dbUpdates.days_to_maturity = updates.daysToMaturity;
      if (updates.sunRequirement)
        dbUpdates.sun_requirement = updates.sunRequirement;
      if (updates.spacing) dbUpdates.spacing = updates.spacing;
      if (updates.plantingDepth)
        dbUpdates.planting_depth = updates.plantingDepth;
      dbUpdates.updated_at = new Date().toISOString();

      const { data: updatedRow } = await supabase
        .from("seeds")
        .update(dbUpdates)
        .eq("id", seedId)
        .select()
        .single();

      if (updatedRow) {
        updatedSeed = {
          ...updatedRow,
          daysToGermination: updatedRow.days_to_germination,
          daysToMaturity: updatedRow.days_to_maturity,
          sunRequirement: updatedRow.sun_requirement,
          plantingDepth: updatedRow.planting_depth,
          purchaseDate: updatedRow.purchase_date,
          customExpirationDate: updatedRow.custom_expiration_date,
          plantingMonths: updatedRow.planting_months,
          useFirst: updatedRow.use_first,
        };
      }
    }

    try {
      await incrementAiUsage(supabase, user.id, 1);
    } catch (e) {
      console.warn("[enrich] Usage increment failed:", e);
    }

    return NextResponse.json({
      success: true,
      seed: updatedSeed,
      enriched: enrichedFields,
    });
  } catch (error) {
    console.error("[enrich] Error:", error);
    return NextResponse.json(
      {
        error: "Enrichment failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
