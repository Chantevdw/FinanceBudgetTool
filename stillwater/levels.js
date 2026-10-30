// Level data for Stillwater.
//
// tiles:  [x, y, height] fixed stone platforms on a size x size grid.
// pieces: stones that slide into a gap when the world is turned to one of
//         the angles in `rots` (0 = start view, 1 = a quarter turn,
//         2 = half, 3 = three quarters). Out of place, a piece sits at
//         `from` and cannot be walked on.
// Walking only goes between stones at the same height. Taller stones are
// decoration: you can see them, but you can't step onto or off them.
// palette: one of the palettes defined in game.js.

const LEVELS = [
  {
    name: 'First Steps',
    hint: 'Tap a stone to walk there. You can only step onto stones at the same height.',
    palette: 'sand',
    size: 4,
    start: [0, 0],
    goal: [3, 2],
    tiles: [
      [0, 0, 0], [1, 0, 0], [1, 1, 0], [1, 2, 0], [2, 2, 0], [3, 2, 0],
      [2, 0, 2], // a monument stone you can see but not reach
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
      [2, 2, 0], [2, 3, 0], [2, 4, 0],
      [4, 4, 0], // the goal
      [4, 0, 2], // a tall tower, out of reach
    ],
    pieces: [
      { at: [1, 2, 0], from: [1, -2, 0], rots: [1] },
      { at: [3, 4, 0], from: [5, 4, 0], rots: [3] },
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
      [1, 4, 0], [0, 4, 0],
      [2, 2, 3], // the monument itself, too high to reach
    ],
    pieces: [
      { at: [2, 0, 0], from: [2, -2, 0], rots: [1, 3] },
      { at: [3, 4, 0], from: [3, 6, 0], rots: [2] },
      { at: [2, 4, 0], from: [2, 6, 0], rots: [2] },
    ],
  },
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = LEVELS;
}
