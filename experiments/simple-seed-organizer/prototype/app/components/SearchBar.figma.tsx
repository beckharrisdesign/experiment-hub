import figma from "@figma/code-connect";
import { SearchBar } from "@/components/SearchBar";

figma.connect(
  SearchBar,
  "https://www.figma.com/design/S8YJQugvMmn5jaRqwFM5XO/Simple-Seed-Organizer?node-id=17-706",
  {
    example: () => (
      <SearchBar
        value=""
        onChange={() => {}}
        placeholder="e.g. Cherokee Purple"
      />
    ),
  },
);
