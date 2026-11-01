// Run with: node stillwater/test-levels.js
// Checks two things for every level:
//  1. It can be finished using the same rules the game uses.
//  2. Nothing is hidden: no stone is covered on screen by a taller stone in
//     front of it. The camera never moves, so this must hold from the start.

const LEVELS = require('./levels.js');
const { createBoard, solve } = require('./rules.js');

// Same projection as game.js, with the camera fixed.
const W = 34;
const H = 17;
const Z = 26;

function screenOf(level, x, y, h) {
  const c = (level.size - 1) / 2;
  const dx = x - c;
  const dy = y - c;
  return { sx: (dx - dy) * W, sy: (dx + dy) * H - h * Z, depth: dx + dy };
}

// Cells whose screen footprint is covered by a taller cell in front of them.
function hiddenCells(level) {
  const board = createBoard(level);
  const cells = [...board.cells.values()].map((cell) => ({ cell, ...screenOf(level, cell.x, cell.y, cell.h) }));
  const hidden = [];

  for (const a of cells) {
    for (const b of cells) {
      if (b.cell.h <= a.cell.h || b.depth <= a.depth) continue;
      // b's silhouette runs from its top face down to its base.
      const bTop = b.sy - H;
      const bBottom = b.sy + H + (b.cell.h + 0.6) * Z;
      const overlapX = Math.abs(a.sx - b.sx) < 2 * W;
      const overlapY = bTop < a.sy + H && bBottom > a.sy - H;
      if (overlapX && overlapY) {
        hidden.push(`${a.cell.key} is hidden behind ${b.cell.key}`);
        break;
      }
    }
  }
  return hidden;
}

let failed = 0;

LEVELS.forEach((level, i) => {
  const solvable = solve(level);
  const hidden = hiddenCells(level);
  const ok = solvable && hidden.length === 0;
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${i + 1}. ${level.name}`);
  if (!solvable) console.log('       cannot be finished');
  for (const line of hidden) console.log(`       ${line}`);
});

if (failed) {
  console.log(`\n${failed} level(s) have a problem.`);
  process.exit(1);
}
console.log(`\nAll ${LEVELS.length} levels are solvable and nothing is hidden.`);
