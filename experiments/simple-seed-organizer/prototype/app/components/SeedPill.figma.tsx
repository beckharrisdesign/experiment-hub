import figma from "@figma/code-connect";
import { SeedPill } from "@/components/SeedPill";

// Primary node: Type=Badge (13:791)
// Variant symbols (no component set): Filter Plain 17:1227, Filter Selected 17:1265
figma.connect(
  SeedPill,
  "https://www.figma.com/design/S8YJQugvMmn5jaRqwFM5XO/Simple-Seed-Organizer?node-id=13-791",
  {
    example: () => (
      <SeedPill variant="badge" tone="success">
        tomato
      </SeedPill>
    ),
  },
);
