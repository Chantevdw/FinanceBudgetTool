// Level data for Stillwater.
//
// The camera never moves. So every route has to be visible from the start:
// tall stones may not hide a stone behind them (test-levels.js checks this).
// Raised ground goes at the back of a level, where it hides nothing.
//
// tiles:    [x, y, height] stones.
// sections: { pivot, cells, knob } stones that turn a quarter about `pivot`
//           each time the knob at `knob` is tapped. Ida can't stand on a
//           section while it turns. `cells` are listed in their starting place.
// bridges:  { at, axis } 'x' carries you east-west, 'y' north-south. Tap one to
//           turn it, unless you stand on it.
// doors:    [[x, y, h], [x, y, h]] pairs. Walking into one comes out of the other.
// ladders:  [[x, y], [x, y]] adjacent cells whose heights differ by one.
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
    ],
    sections: [
      { pivot: [1, 1], cells: [[0, 1, 0], [1, 1, 0], [2, 1, 0]], knob: [3, 1, 0] },
    ],
  },
  {
    name: 'The Gap',
    hint: 'Tap a bridge to turn it. Tap a knob to turn an arm of the structure.',
    palette: 'sea',
    size: 4,
    start: [0, 0],
    goal: [1, 2],
    tiles: [
      [0, 0, 0], [1, 0, 0], [3, 0, 0], [3, 1, 0], [1, 2, 0],
    ],
    bridges: [{ at: [2, 0, 0], axis: 'y' }],
    sections: [
      { pivot: [3, 2], cells: [[3, 2, 0], [3, 3, 0]], knob: [4, 2, 0] },
    ],
  },
  {
    name: 'Mystery Door',
    hint: 'Walk into a door and you come out of the one it is paired with.',
    palette: 'dusk',
    size: 5,
    start: [0, 0],
    goal: [2, 4],
    tiles: [
      [0, 0, 0], [1, 0, 0], [2, 0, 0],
      [0, 4, 0], [2, 4, 0],
    ],
    doors: [[[3, 0, 0], [0, 4, 0]]],
    bridges: [{ at: [1, 4, 0], axis: 'y' }],
  },
  {
    name: 'The Monument',
    hint: 'Climb the ladder, then turn the bridge to cross to the goal.',
    palette: 'sand',
    size: 5,
    start: [0, 4],
    goal: [0, 0],
    tiles: [
      [0, 4, 0], [1, 4, 0], [2, 4, 0], [3, 4, 0], [4, 4, 0],
      [0, 3, 1], [1, 3, 1], [2, 3, 1],
      [0, 1, 1], [0, 0, 1],
    ],
    bridges: [{ at: [0, 2, 1], axis: 'x' }],
    ladders: [[[2, 4], [2, 3]]],
  },
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = LEVELS;
}
