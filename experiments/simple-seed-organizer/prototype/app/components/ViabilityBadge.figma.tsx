import figma from "@figma/code-connect";
import { ViabilityBadge } from "@/components/ViabilityBadge";

// Primary node: Status=Watch (100:1408)
// Sibling variant: Use First 100:1410 (both in Blocks frame 100:1412)
figma.connect(
  ViabilityBadge,
  "https://www.figma.com/design/S8YJQugvMmn5jaRqwFM5XO/Simple-Seed-Organizer?node-id=100-1408",
  {
    example: () => (
      <ViabilityBadge year={2020} cropName="tomato" />
    ),
  },
);
