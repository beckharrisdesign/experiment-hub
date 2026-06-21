import { AdCampaignClient } from "./AdCampaignClient";

export const metadata = {
  title: "Ad Campaign — Admin",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdCampaignClient />;
}
