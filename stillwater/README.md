# Stillwater

A small, calm isometric puzzle prototype inspired by *Monument Valley*. Plain HTML, CSS and JavaScript with no build step.

## Play

Open `index.html` in a browser (or serve the folder with any static server). Use `?level=3` to jump to a level.

- Tap a stone to walk there. You can only step onto stones at the same height, so taller stones are for looking at.
- Tap a knob to turn its section of the structure a quarter. The space itself never turns.
- Tap a bridge to turn it between an x and a y axis, unless you stand on it.
- Walk into a door and you come out of its partner. Ladders climb one level.
- A section can't turn while you stand on it.

## Files

| File | Purpose |
| --- | --- |
| `levels.js` | Level data: tiles, turning sections, bridges, doors, ladders, start and goal |
| `rules.js` | Pure movement rules (neighbors, pathfinding, solvability check). No DOM |
| `game.js` | Rendering, animation, input |
| `index.html` | Page shell and styles |
| `test-levels.js` | Checks every level is solvable: `node stillwater/test-levels.js` |

## Adding a level

Append an entry to `LEVELS` in `levels.js`:

```js
{
  name: 'Your Level',
  hint: 'Optional hint shown under the title.',
  palette: 'sea', // 'sand', 'sea' or 'dusk' (see PALETTES in game.js)
  size: 5,
  start: [0, 0],
  goal: [4, 4],
  tiles: [[0, 0, 0], [1, 0, 0] /* ... */],
  // A section turns a quarter about its pivot each time its knob is tapped.
  sections: [{ pivot: [1, 1], cells: [[0, 1, 0], [1, 1, 0], [2, 1, 0]], knob: [3, 1, 0] }],
}
```

Then run `node stillwater/test-levels.js` to confirm it can be finished.

## Ideas for next steps

- Moving platforms and pushable blocks
- Sound and a soft ambient track
- Hand-drawn textures, decorative landmarks, and a title screen
- Level select and progress saved in `localStorage`
