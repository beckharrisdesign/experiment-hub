function normalizeForFigmaId(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 128);
}

function buildFigmaLayout({
  nodes,
  framePadding = 120,
  horizontalGap = 380,
  verticalGap = 260,
  cardWidth = 320,
  cardHeight = 200,
}) {
  const byDepth = new Map();
  for (const node of nodes) {
    const depth = Number.isFinite(node.depth) ? node.depth : 0;
    if (!byDepth.has(depth)) {
      byDepth.set(depth, []);
    }
    byDepth.get(depth).push(node);
  }

  for (const bucket of byDepth.values()) {
    bucket.sort((a, b) => String(a.path || "").localeCompare(String(b.path || "")));
  }

  const positionedNodes = [];
  const sortedDepths = [...byDepth.keys()].sort((a, b) => a - b);
  for (const depth of sortedDepths) {
    const bucket = byDepth.get(depth);
    bucket.forEach((node, index) => {
      positionedNodes.push({
        ...node,
        figmaId: normalizeForFigmaId(node.url),
        x: framePadding + depth * horizontalGap,
        y: framePadding + index * verticalGap,
        width: cardWidth,
        height: cardHeight,
      });
    });
  }

  const edges = positionedNodes
    .filter((node) => node.parentUrl)
    .map((node) => ({
      from: node.parentUrl,
      to: node.url,
    }));

  return {
    frame: {
      padding: framePadding,
      horizontalGap,
      verticalGap,
      cardWidth,
      cardHeight,
    },
    nodes: positionedNodes,
    edges,
  };
}

function buildFigmaMcpPrompt({ frameName, manifestPath, screenshotDirectory }) {
  return [
    "Use Figma MCP tools to build a visual sitemap frame.",
    `Frame name: ${frameName}`,
    `Read the manifest JSON from: ${manifestPath}`,
    `Screenshot directory: ${screenshotDirectory}`,
    "For each node in layout.nodes, create a card at x/y with the screenshot image, label, and URL text.",
    "For each edge in layout.edges, draw connector lines from parent node card to child node card.",
    "Preserve exact node count and one screenshot per node URL.",
    "Do not skip duplicate-looking pages; every unique URL in the manifest is required.",
  ].join("\n");
}

module.exports = {
  normalizeForFigmaId,
  buildFigmaLayout,
  buildFigmaMcpPrompt,
};
