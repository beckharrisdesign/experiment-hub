// One source for the visible FAQ and the FAQPage JSON-LD, so they can't drift apart.
export const FAQ: { q: string; a: string }[] = [
  { q: "Is my image uploaded anywhere?", a: "No. All of the processing happens in your browser, and the image never leaves your device." },
  { q: "What's the difference between dithering and halftone?", a: "Dithering scatters dots in an irregular pattern; a halftone arranges them on a regular screen of dots, lines or crosses. Try both in step 2 and pick by eye." },
  { q: "Can I use the result for print or social posts?", a: "Yes. Choose \"Screen or print\" in Export and set the width in pixels. The PNG is pure black and white." },
  { q: "Will the PNG import into my laser software at the right size?", a: "Yes. Choose Laser in Export: the file records its DPI, so LightBurn and xTool Creative Space place it at the size you set in millimetres." },
  { q: "Which dithering algorithm is best for laser engraving?", a: "There isn't one best. Jarvis–Judice–Ninke and Stucki suit photos on wood, Atkinson gives punchy portraits on dark materials, ordered patterns hold up on glass, and Threshold is for logos." },
  { q: "Why invert for slate, and mirror for acrylic?", a: "On slate the laser's marks come out light, so the image is inverted. Clear acrylic is engraved from the back and seen through the front, so the image is mirrored." },
];
