import { insertSubmission } from "@/lib/supabase";
import type { LandingPageSubmission } from "./types";

export async function submitLandingPageForm(
  submission: LandingPageSubmission,
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { experimentSlug, experimentName, email, name, source, formData } =
      submission;
    const row = await insertSubmission({
      experiment: experimentSlug || experimentName,
      email,
      name,
      source: source || "landing-page",
      metadata:
        formData && Object.keys(formData).length > 0 ? formData : undefined,
    });
    return { success: true, id: row.id };
  } catch (error: any) {
    console.error("Error submitting landing page form:", error);
    return { success: false, error: error.message };
  }
}
