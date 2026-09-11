// Melco EXP writer. Headerless, two bytes per stitch (signed dx, dy in
// 0.1mm units, y-up). Escape sequences: 0x80 0x04 prefixes a jump record,
// 0x80 0x01 is a color change / stop. Deltas beyond ±127 split.

import type { StitchPlan } from "./plan";

const MAX_DELTA = 127;

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

/** Encode a stitch plan as a complete .exp file. */
export function encodeExp(plan: StitchPlan): Uint8Array {
  const body: number[] = [];
  let px = 0;
  let py = 0;

  for (const entry of plan.entries) {
    if (entry.kind === "end") break;
    if (entry.kind === "color") {
      body.push(0x80, 0x01, 0x00, 0x00);
      continue;
    }
    for (const [dx, dy] of splitMove(entry.x - px, entry.y - py)) {
      px += dx;
      py += dy;
      if (entry.kind === "jump") body.push(0x80, 0x04);
      body.push(dx & 0xff, dy & 0xff);
    }
  }
  return Uint8Array.from(body);
}
