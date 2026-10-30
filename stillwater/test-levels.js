// Run with: node stillwater/test-levels.js
// Checks that every level can be finished using the same rules the game uses.

const LEVELS = require('./levels.js');
const { solve } = require('./rules.js');

let failed = 0;

LEVELS.forEach((level, i) => {
  const ok = solve(level);
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${i + 1}. ${level.name}`);
});

if (failed) {
  console.log(`\n${failed} level(s) cannot be finished.`);
  process.exit(1);
}
console.log(`\nAll ${LEVELS.length} levels are solvable.`);
