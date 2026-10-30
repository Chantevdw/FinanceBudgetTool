// Level data for Stillwater.
//
// tiles:  [x, y, height] fixed stone platforms on a size x size grid.
// pieces: stones that slide into a gap when the world is turned to one of
//         the angles in `rots` (0 = start view, 1 = a quarter turn,
//         2 = half, 3 = three quarters). Out of place, a piece sits at
//         `from` and cannot be walked on. Pieces follow the normal height
//         rule: you can step on one from a stone at most one step away.
// palette: one of the palettes defined in game.js.

const LEVELS = [
  {
    name: 'First Steps',
    hint: 'Tap a stone to walk there. You can climb or drop one step at a time.',
    palette: 'sand',
    size: 4,
    start: [0, 0],
    goal: [3, 2],
    tiles: [
      [0, 0, 0], [1, 0, 0], [2, 0, 1], [2, 1, 1], [2, 2, 0], [3, 2, 0],
    ],
    pieces: [],
  },
  {
    name: 'The Gap',
    hint: 'Swipe across the screen to turn the world. Some stones only line up from one angle.',
    palette: 'sea',
    size: 4,
    start: [0, 0],
    goal: [3, 2],
    tiles: [
      [0, 0, 0], [1, 0, 0], [3, 0, 0], [3, 1, 0], [3, 2, 0],
    ],
    pieces: [
      { at: [2, 0, 0], from: [2, -2, 0], rots: [1] },
    ],
  },
  {
    name: 'Two Views',
    hint: 'Turn the world until the stones slide together. Two bridges, two angles.',
    palette: 'dusk',
    size: 5,
    start: [0, 0],
    goal: [4, 4],
    tiles: [
      [0, 0, 0], [0, 1, 0], [0, 2, 0],
      [2, 2, 1], [2, 3, 1], [3, 3, 2],
      [3, 0, 0], [4, 0, 0], [4, 1, 0], [4, 2, 0], [4, 3, 0], [4, 4, 0],
    ],
    pieces: [
      { at: [1, 2, 1], from: [1, -2, 1], rots: [1] },
      { at: [3, 2, 1], from: [5, 2, 1], rots: [3] },
      { at: [3, 1, 1], from: [5, 1, 1], rots: [3] },
    ],
  },
  {
    name: 'The Monument',
    hint: 'Each angle joins a different set of stones. Walk what you can, then turn again.',
    palette: 'sand',
    size: 5,
    start: [0, 0],
    goal: [0, 4],
    tiles: [
      [0, 0, 0], [1, 0, 0], [3, 0, 0], [4, 0, 0],
      [4, 1, 0], [4, 2, 0], [4, 3, 0], [4, 4, 0],
      [1, 4, 1], [0, 4, 0],
      [2, 2, 3], // the monument itself, too high to reach
    ],
    pieces: [
      { at: [2, 0, 1], from: [2, -2, 1], rots: [1, 3] },
      { at: [3, 4, 1], from: [3, 6, 1], rots: [2] },
      { at: [2, 4, 1], from: [2, 6, 1], rots: [2] },
    ],
  },
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = LEVELS;
}
