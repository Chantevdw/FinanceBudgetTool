// Level data for Stillwater.
//
// tiles:    [x, y, height] stones. Walking needs equal heights, so a raised
//           stone only connects through a ladder.
// views:    { at, rots } stones that are only there in the listed views
//           (0 = start view, 1 = a quarter turn, 2 = half, 3 = three quarters).
//           They fade in where they are. Nothing moves.
// bridges:  { at, axis } movable bridges. axis 'x' carries you east-west,
//           'y' north-south. Tap one to turn it, unless you stand on it.
// doors:    [[x, y, h], [x, y, h]] pairs. Walking into one comes out of the other.
// ladders:  [[x, y], [x, y]] adjacent cells whose heights differ by one.
// sections: { pivot, cells, knob } stones that turn a quarter about `pivot`
//           each time the knob at `knob` is tapped. Ida can't stand on a
//           section while it turns. `cells` are listed in their starting place.
// palette:  one of the palettes defined in game.js.

const LEVELS = [
  {
    name: 'Turning Arm',
    hint: 'Tap the knob to turn the arm. Walk only where the path is connected.',
    palette: 'sand',
    size: 4,
    start: [0, 0],
    goal: [1, 3],
    tiles: [
      [0, 0, 0], [1, 3, 0],
      [2, 0, 2], // a monument stone you can see but not reach
    ],
    sections: [
      { pivot: [1, 1], cells: [[0, 1, 0], [1, 1, 0], [2, 1, 0]], knob: [3, 1, 0] },
    ],
  },
  {
    name: 'The Gap',
    hint: 'Tap a bridge to turn it, then tap the stone beyond. Some stones only appear from another angle.',
    palette: 'sea',
    size: 4,
    start: [0, 0],
    goal: [3, 2],
    tiles: [
      [0, 0, 0], [1, 0, 0], [3, 0, 0], [3, 1, 0],
    ],
    bridges: [{ at: [2, 0, 0], axis: 'y' }],
    views: [{ at: [3, 2, 0], rots: [1] }],
  },
  {
    name: 'Mystery Door',
    hint: 'Walk into a door and you come out of the other one. Tap a bridge to turn it.',
    palette: 'dusk',
    size: 5,
    start: [0, 0],
    goal: [2, 4],
    tiles: [
      [0, 0, 0], [0, 1, 0], [0, 2, 0],
      [4, 1, 0], [4, 2, 0],
      [2, 2, 0], [2, 3, 0], [2, 4, 0],
      [1, 4, 2], // a tower you can't reach
    ],
    doors: [[[0, 3, 0], [4, 0, 0]]],
    bridges: [{ at: [3, 2, 0], axis: 'y' }],
  },
  {
    name: 'The Monument',
    hint: 'Climb the ladders and turn the bridge to cross.',
    palette: 'sand',
    size: 5,
    start: [0, 0],
    goal: [0, 4],
    tiles: [
      [0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 0], [4, 0, 0],
      [4, 1, 1], [3, 1, 1], [2, 1, 1], [0, 1, 1],
      [0, 2, 0], [0, 3, 0], [0, 4, 0],
      [2, 2, 3], // the monument itself, too high to reach
    ],
    bridges: [{ at: [1, 1, 1], axis: 'y' }],
    ladders: [[[4, 0], [4, 1]], [[0, 1], [0, 2]]],
  },
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = LEVELS;
}
