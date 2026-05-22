import figma from "@figma/code-connect";
import { FilterBar } from "@/components/FilterBar";

figma.connect(
  FilterBar,
  "https://www.figma.com/design/S8YJQugvMmn5jaRqwFM5XO/Simple-Seed-Organizer?node-id=17-727",
  {
    example: () => (
      <FilterBar
        activeType="all"
        onTypeChange={() => {}}
      />
    ),
  },
);
