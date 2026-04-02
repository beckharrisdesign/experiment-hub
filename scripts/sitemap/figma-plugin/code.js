/**
 * BHD Labs Sitemap Builder — Figma plugin main thread
 *
 * Receives the manifest JSON + screenshot bytes from the UI thread,
 * then builds a fully connected sitemap with screenshot thumbnails as nodes.
 *
 * Layout: rows per group, connector lines from parent → child, labels below each card.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// ─── Constants ────────────────────────────────────────────────────────────────
const CARD_W = 320; // thumbnail card width  (px)
const CARD_H = 200; // thumbnail card height (px)
const CARD_RADIUS = 8;
const H_GAP = 48; // horizontal gap between cards in the same row
const V_GAP = 120; // vertical gap between depth levels
const GROUP_GAP = 80; // extra vertical gap between groups
const LABEL_H = 36; // space reserved below card for the label text
const CONNECTOR_COLOR = { r: 0.44, g: 0.51, b: 0.6 }; // #6e7681
const LABEL_COLOR = { r: 0.79, g: 0.82, b: 0.85 }; // #c9d1d9
const BG_COLOR = { r: 0.05, g: 0.07, b: 0.09, a: 1 }; // ~#0d1117
const CARD_FILL = { r: 0.086, g: 0.106, b: 0.133, a: 1 }; // #161b22
const CARD_STROKE = { r: 0.188, g: 0.212, b: 0.239 }; // #30363d
const GROUP_LABEL_COLOR = { r: 0.345, g: 0.404, b: 0.463 }; // #58697680
const FRAME_NAME = "BHD Labs — Site Map";
// ─── Helpers ──────────────────────────────────────────────────────────────────
function sendProgress(current, total, label) {
    figma.ui.postMessage({ type: "PROGRESS", current, total, label });
}
function sendError(message) {
    figma.ui.postMessage({ type: "ERROR", message });
}
/**
 * Creates a screenshot card: rounded-rect with image fill + label below.
 * Returns a Frame node containing both.
 */
function createPageCard(page, imageBytes) {
    return __awaiter(this, void 0, void 0, function* () {
        const card = figma.createFrame();
        card.name = page.id;
        card.resize(CARD_W, CARD_H + LABEL_H);
        card.fills = [];
        card.clipsContent = false;
        // Screenshot rectangle
        const rect = figma.createRectangle();
        rect.name = "screenshot";
        rect.resize(CARD_W, CARD_H);
        rect.x = 0;
        rect.y = 0;
        rect.cornerRadius = CARD_RADIUS;
        rect.fills = [{ type: "SOLID", color: CARD_FILL.r ? { r: CARD_FILL.r, g: CARD_FILL.g, b: CARD_FILL.b } : { r: 0, g: 0, b: 0 } }];
        rect.strokes = [{ type: "SOLID", color: CARD_STROKE }];
        rect.strokeWeight = 1;
        rect.strokeAlign = "INSIDE";
        try {
            const image = figma.createImage(imageBytes);
            const { width, height } = yield image.getSizeAsync();
            // Scale to fill the card while maintaining aspect ratio
            const scaleX = CARD_W / width;
            const scaleY = CARD_H / height;
            const scale = Math.max(scaleX, scaleY);
            rect.fills = [
                {
                    type: "IMAGE",
                    imageHash: image.hash,
                    scaleMode: "FILL",
                    scalingFactor: scale,
                },
            ];
        }
        catch (e) {
            // leave placeholder fill if image creation fails
        }
        card.appendChild(rect);
        // Label text
        yield figma.loadFontAsync({ family: "Inter", style: "Regular" });
        const labelText = figma.createText();
        labelText.name = "label";
        labelText.fontName = { family: "Inter", style: "Regular" };
        labelText.fontSize = 12;
        labelText.fills = [{ type: "SOLID", color: LABEL_COLOR }];
        labelText.textAlignHorizontal = "CENTER";
        labelText.textAutoResize = "WIDTH_AND_HEIGHT";
        labelText.characters = page.label;
        labelText.x = (CARD_W - labelText.width) / 2;
        labelText.y = CARD_H + 8;
        card.appendChild(labelText);
        // Group badge
        yield figma.loadFontAsync({ family: "Inter", style: "Regular" });
        const groupText = figma.createText();
        groupText.name = "group";
        groupText.fontName = { family: "Inter", style: "Regular" };
        groupText.fontSize = 10;
        groupText.fills = [{ type: "SOLID", color: GROUP_LABEL_COLOR }];
        groupText.textAlignHorizontal = "CENTER";
        groupText.textAutoResize = "WIDTH_AND_HEIGHT";
        groupText.characters = page.group;
        groupText.x = (CARD_W - groupText.width) / 2;
        groupText.y = CARD_H + 8 + labelText.height + 2;
        card.appendChild(groupText);
        return card;
    });
}
/**
 * Draw a simple connector line from the bottom-center of parent to top-center of child.
 */
function createConnector(from, to, parent) {
    const x1 = from.x + from.w / 2;
    const y1 = from.y + CARD_H; // bottom of screenshot area
    const x2 = to.x + to.w / 2;
    const y2 = to.y;
    const midY = (y1 + y2) / 2;
    // Cubic bezier: vertical S-curve
    const vector = figma.createVector();
    vector.name = "connector";
    vector.strokeWeight = 1;
    vector.strokes = [{ type: "SOLID", color: CONNECTOR_COLOR, opacity: 0.6 }];
    vector.fills = [];
    vector.strokeCap = "NONE";
    const pathData = `M ${x1} ${y1} C ${x1} ${midY} ${x2} ${midY} ${x2} ${y2}`;
    vector.vectorPaths = [
        {
            windingRule: "NONE",
            data: pathData,
        },
    ];
    parent.appendChild(vector);
    return vector;
}
// ─── Main layout logic ────────────────────────────────────────────────────────
/**
 * Assign x/y positions to all nodes.
 *
 * Strategy:
 *  - Home is at the top-center.
 *  - Group the children by their parent path.
 *  - Lay out children left-to-right within each depth level.
 *  - Use the tree structure from the manifest parent field.
 */
function computeLayout(pages) {
    const positions = new Map();
    // Build adjacency: path → children ids
    const childrenByPath = new Map();
    for (const p of pages) {
        const key = p.parent;
        if (!childrenByPath.has(key))
            childrenByPath.set(key, []);
        childrenByPath.get(key).push(p);
    }
    // BFS to assign rows
    const rowHeight = CARD_H + LABEL_H + V_GAP;
    let globalY = 0;
    function layOutLevel(nodes, depth) {
        if (nodes.length === 0)
            return 0;
        const totalW = nodes.length * CARD_W + (nodes.length - 1) * H_GAP;
        let startX = -(totalW / 2);
        for (const node of nodes) {
            positions.set(node.id, { x: startX, y: globalY });
            startX += CARD_W + H_GAP;
        }
        const prevY = globalY;
        globalY += rowHeight;
        // Now recursively lay out each node's children
        for (const node of nodes) {
            const children = childrenByPath.get(node.path) || [];
            if (children.length > 0) {
                layOutLevel(children, depth + 1);
            }
        }
        return prevY;
    }
    // Start with root (parent: null)
    const roots = childrenByPath.get(null) || [];
    layOutLevel(roots, 0);
    // Normalize so min x/y = 80 margin
    let minX = Infinity;
    let minY = Infinity;
    for (const pos of positions.values()) {
        if (pos.x < minX)
            minX = pos.x;
        if (pos.y < minY)
            minY = pos.y;
    }
    const offsetX = 80 - minX;
    const offsetY = 80 - minY;
    for (const [id, pos] of positions) {
        positions.set(id, { x: pos.x + offsetX, y: pos.y + offsetY });
    }
    return positions;
}
// ─── Plugin entrypoint ────────────────────────────────────────────────────────
figma.showUI(__html__, { width: 392, height: 560, title: "BHD Labs Sitemap Builder" });
figma.ui.onmessage = (msg) => __awaiter(this, void 0, void 0, function* () {
    if (msg.type !== "BUILD_SITEMAP")
        return;
    const manifest = msg.manifest;
    const screenshots = msg.screenshots;
    const pages = manifest.pages.filter((p) => p.status === "ok");
    const total = pages.length;
    try {
        // Remove any existing sitemap frame on this page
        const existing = figma.currentPage.findChild((n) => n.name === FRAME_NAME);
        if (existing)
            existing.remove();
        // Compute layout positions
        const positions = computeLayout(pages);
        // Determine canvas size
        let maxX = 0;
        let maxY = 0;
        for (const pos of positions.values()) {
            if (pos.x + CARD_W > maxX)
                maxX = pos.x + CARD_W;
            if (pos.y + CARD_H + LABEL_H > maxY)
                maxY = pos.y + CARD_H + LABEL_H;
        }
        const canvasW = maxX + 80;
        const canvasH = maxY + 80;
        // Root container frame
        const sitemapFrame = figma.createFrame();
        sitemapFrame.name = FRAME_NAME;
        sitemapFrame.resize(canvasW, canvasH);
        sitemapFrame.fills = [{ type: "SOLID", color: BG_COLOR }];
        sitemapFrame.clipsContent = false;
        figma.currentPage.appendChild(sitemapFrame);
        // Track created card nodes for connector drawing
        const cardNodes = new Map();
        // Create all card nodes first
        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            sendProgress(i + 1, total * 2, page.label);
            const imageBytes = screenshots[page.filename];
            if (!imageBytes) {
                console.error(`Missing screenshot: ${page.filename}`);
                continue;
            }
            const pos = positions.get(page.id);
            if (!pos)
                continue;
            const card = yield createPageCard(page, imageBytes);
            card.x = pos.x;
            card.y = pos.y;
            sitemapFrame.appendChild(card);
            cardNodes.set(page.id, { node: card, pos });
        }
        // Draw connectors: parent → child
        // Build path-to-id map for lookup
        const pathToId = new Map();
        for (const page of pages) {
            pathToId.set(page.path, page.id);
        }
        for (const page of pages) {
            if (page.parent === null)
                continue;
            const parentId = pathToId.get(page.parent);
            if (!parentId)
                continue;
            const parentCard = cardNodes.get(parentId);
            const childCard = cardNodes.get(page.id);
            if (!parentCard || !childCard)
                continue;
            createConnector({ x: parentCard.pos.x, y: parentCard.pos.y, w: CARD_W, h: CARD_H }, { x: childCard.pos.x, y: childCard.pos.y, w: CARD_W, h: CARD_H }, sitemapFrame);
        }
        // Draw group section labels (big text above each group's first row)
        const groupsByName = new Map();
        for (const page of pages) {
            if (!groupsByName.has(page.group))
                groupsByName.set(page.group, []);
            groupsByName.get(page.group).push(page);
        }
        yield figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
        for (const [groupName, groupPages] of groupsByName) {
            const groupPos = groupPages
                .map((p) => positions.get(p.id))
                .filter(Boolean);
            if (groupPos.length === 0)
                continue;
            const minX = Math.min(...groupPos.map((p) => p.x));
            const minY = Math.min(...groupPos.map((p) => p.y));
            const gLabel = figma.createText();
            gLabel.name = `group-label-${groupName}`;
            gLabel.fontName = { family: "Inter", style: "Semi Bold" };
            gLabel.fontSize = 11;
            gLabel.letterSpacing = { value: 1, unit: "PIXELS" };
            gLabel.fills = [{ type: "SOLID", color: GROUP_LABEL_COLOR, opacity: 0.7 }];
            gLabel.textAutoResize = "WIDTH_AND_HEIGHT";
            gLabel.characters = groupName.toUpperCase();
            gLabel.x = minX;
            gLabel.y = minY - 24;
            sitemapFrame.appendChild(gLabel);
        }
        // Zoom Figma viewport to the new frame
        figma.viewport.scrollAndZoomIntoView([sitemapFrame]);
        figma.ui.postMessage({ type: "DONE" });
    }
    catch (err) {
        sendError(err.message || String(err));
    }
});
