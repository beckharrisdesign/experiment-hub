// Tajima DST writer. DST is the closest thing embroidery has to a universal
// interchange format: 512-byte ASCII header, then 3-byte stitch records that
// encode dx/dy as sums of ±1/±3/±9/±27/±81 (0.1mm units, y-up), each record
// clamped to ±121. Larger moves are split across multiple records.

import type { StitchPlan } from "./plan";

const MAX_DELTA = 121;

/** Encode one dx/dy pair (each within ±121) into a 3-byte record. */
export function encodeRecord(
  dx: number,
  dy: number,
  flags: "stitch" | "jump" | "color",
): [number, number, number] {
  if (Math.abs(dx) > MAX_DELTA || Math.abs(dy) > MAX_DELTA) {
    throw new Error(`delta out of range: ${dx},${dy}`);
  }
  let x = dx;
  let y = dy;
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;

  if (x > 40) {
    b2 |= 0b00000100;
    x -= 81;
  }
  if (x < -40) {
    b2 |= 0b00001000;
    x += 81;
  }
  if (y > 40) {
    b2 |= 0b00100000;
    y -= 81;
  }
  if (y < -40) {
    b2 |= 0b00010000;
    y += 81;
  }
  if (x > 13) {
    b1 |= 0b00000100;
    x -= 27;
  }
  if (x < -13) {
    b1 |= 0b00001000;
    x += 27;
  }
  if (y > 13) {
    b1 |= 0b00100000;
    y -= 27;
  }
  if (y < -13) {
    b1 |= 0b00010000;
    y += 27;
  }
  if (x > 4) {
    b0 |= 0b00000100;
    x -= 9;
  }
  if (x < -4) {
    b0 |= 0b00001000;
    x += 9;
  }
  if (y > 4) {
    b0 |= 0b00100000;
    y -= 9;
  }
  if (y < -4) {
    b0 |= 0b00010000;
    y += 9;
  }
  if (x > 1) {
    b1 |= 0b00000001;
    x -= 3;
  }
  if (x < -1) {
    b1 |= 0b00000010;
    x += 3;
  }
  if (y > 1) {
    b1 |= 0b10000000;
    y -= 3;
  }
  if (y < -1) {
    b1 |= 0b01000000;
    y += 3;
  }
  if (x > 0) {
    b0 |= 0b00000001;
    x -= 1;
  }
  if (x < 0) {
    b0 |= 0b00000010;
    x += 1;
  }
  if (y > 0) {
    b0 |= 0b10000000;
    y -= 1;
  }
  if (y < 0) {
    b0 |= 0b01000000;
    y += 1;
  }

  b2 |= 0b00000011; // always-set bits
  if (flags === "jump") b2 |= 0b10000000;
  if (flags === "color") b2 |= 0b11000000;
  return [b0, b1, b2];
}

/** Split a move into records no larger than ±121 per axis. */
function splitMove(dx: number, dy: number): Array<[number, number]> {
  const steps = Math.max(
    1,
    Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / MAX_DELTA),
  );
  const moves: Array<[number, number]> = [];
  let doneX = 0;
  let doneY = 0;
  for (let s = 1; s <= steps; s++) {
    const targetX = Math.round((dx * s) / steps);
    const targetY = Math.round((dy * s) / steps);
    moves.push([targetX - doneX, targetY - doneY]);
    doneX = targetX;
    doneY = targetY;
  }
  return moves;
}

function headerField(text: string): number[] {
  return Array.from(text, (ch) => ch.charCodeAt(0));
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, " ");
}

function signed(n: number, width: number): string {
  const sign = n < 0 ? "-" : "+";
  return sign + String(Math.abs(n)).padStart(width, " ");
}

/** Encode a stitch plan as a complete .dst file. */
export function encodeDst(plan: StitchPlan, designName: string): Uint8Array {
  const body: number[] = [];
  let px = 0;
  let py = 0;
  let minX = 0;
  let minY = 0;
  let maxX = 0;
  let maxY = 0;
  let stitchRecords = 0;
  let colorChanges = 0;

  const track = (x: number, y: number) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };

  for (const entry of plan.entries) {
    if (entry.kind === "end") break;
    if (entry.kind === "color") {
      body.push(...encodeRecord(0, 0, "color"));
      colorChanges++;
      continue;
    }
    for (const [dx, dy] of splitMove(entry.x - px, entry.y - py)) {
      px += dx;
      py += dy;
      track(px, py);
      body.push(
        ...encodeRecord(dx, dy, entry.kind === "jump" ? "jump" : "stitch"),
      );
      stitchRecords++;
    }
  }
  // End-of-file record.
  body.push(0x00, 0x00, 0xf3);

  const name = designName.replace(/[^\x20-\x7e]/g, "").slice(0, 16) || "DESIGN";
  const header: number[] = [];
  header.push(...headerField(`LA:${name.padEnd(16, " ")}\r`));
  header.push(...headerField(`ST:${pad(stitchRecords, 7)}\r`));
  header.push(...headerField(`CO:${pad(colorChanges, 3)}\r`));
  header.push(...headerField(`+X:${pad(Math.max(0, maxX), 5)}\r`));
  header.push(...headerField(`-X:${pad(Math.max(0, -minX), 5)}\r`));
  header.push(...headerField(`+Y:${pad(Math.max(0, maxY), 5)}\r`));
  header.push(...headerField(`-Y:${pad(Math.max(0, -minY), 5)}\r`));
  // End-point offset and multi-volume pointers; zero for a single design.
  header.push(...headerField(`AX:${signed(px, 5)}\r`));
  header.push(...headerField(`AY:${signed(py, 5)}\r`));
  header.push(...headerField(`MX:${signed(0, 5)}\r`));
  header.push(...headerField(`MY:${signed(0, 5)}\r`));
  header.push(...headerField(`PD:******\r`));
  header.push(0x1a);
  while (header.length < 512) header.push(0x20);

  return Uint8Array.from([...header, ...body]);
}
