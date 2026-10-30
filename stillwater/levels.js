// Level data for Stillwater.
//
// tiles:  [x, y, height] stone platforms on a size x size grid.
// links:  illusion bridges. A link joins tiles a and b, but only while the
//         world is turned to one of the angles listed in `rots`
//         (0 = start view, 1 = one quarter turn, 2 = half, 3 = three quarters).
//         Links ignore height, which is the whole trick.
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
    links: [],
  },
  {
    name: 'The Gap',
    hint: 'Some paths only appear from certain angles. Turn the world.',
    palette: 'sea',
    size: 4,
    start: [0, 0],
    goal: [3, 2],
    tiles: [
      [0, 0, 0], [1, 0, 0], [3, 0, 0], [3, 1, 0], [3, 2, 0],
    ],
    links: [
      { a: [1, 0], b: [3, 0], rots: [1] },
    ],
  },
  {
    name: 'Two Views',
    hint: 'Two bridges, and each one only shows from a different angle.',
    palette: 'dusk',
    size: 5,
    start: [0, 0],
    goal: [4, 4],
    tiles: [
      [0, 0, 0], [0, 1, 0], [0, 2, 0],
      [2, 2, 1], [2, 3, 1], [3, 3, 2],
      [3, 0, 0], [4, 0, 0], [4, 1, 0], [4, 2, 0], [4, 3, 0], [4, 4, 0],
    ],
    links: [
      { a: [0, 2], b: [2, 2], rots: [1] },
      { a: [3, 3], b: [3, 0], rots: [3] },
    ],
  },
  {
    name: 'The Monument',
    hint: 'The monument hides a shortcut. Look at the far side from a new angle.',
    palette: 'sand',
    size: 5,
    start: [0, 0],
    goal: [0, 4],
    tiles: [
      [0, 0, 0], [1, 0, 0], [2, 0, 2], [3, 0, 0], [4, 0, 0],
      [4, 1, 0], [4, 2, 0], [4, 3, 0], [4, 4, 0],
      [1, 4, 1], [0, 4, 0],
    ],
    links: [
      { a: [1, 0], b: [3, 0], rots: [1, 3] },
      { a: [4, 4], b: [1, 4], rots: [2] },
    ],
  },
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = LEVELS;
}
