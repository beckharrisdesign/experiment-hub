import figma from "@figma/code-connect";
import { SeedDetail } from "@/components/SeedDetail";

const exampleSeed = {
  id: "1",
  name: "Brandywine Tomato",
  type: "tomato" as const,
  variety: "Brandywine",
  yearPurchased: 2022,
  notes: "Heirloom beefsteak. Excellent flavour.",
  images: [],
  plantingInfo: {},
};

figma.connect(
  SeedDetail,
  "https://www.figma.com/design/S8YJQugvMmn5jaRqwFM5XO/Simple-Seed-Organizer?node-id=98-1398",
  {
    example: () => (
      <SeedDetail
        seed={exampleSeed}
        onClose={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
        onUpdate={() => {}}
      />
    ),
  },
);
