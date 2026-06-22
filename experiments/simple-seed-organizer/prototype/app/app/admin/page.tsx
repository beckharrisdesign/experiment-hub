import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { AdCampaignClient } from "./AdCampaignClient";

export const metadata = {
  title: "Ad Campaign — Admin",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");
  }

  return <AdCampaignClient />;
}
