# Stillwater

A small, calm isometric puzzle prototype inspired by *Monument Valley*. Plain HTML, CSS and JavaScript with no build step.

## Play

Open `index.html` in a browser (or serve the folder with any static server). Use `?level=3` to jump to a level.

- Tap a stone to walk there. You can only step onto stones at the same height, so taller stones are for looking at.
- Turn the world by swiping sideways, with the buttons, or with the `Q`/`E` or arrow keys.
- Some stones slide into a gap only at certain angles. You walk only on real, connected stone. Reach the gold ring to finish a level.
- You can't turn the world while a stone you're standing on would move out of place.

## Files

| File | Purpose |
| --- | --- |
| `levels.js` | Level data: fixed tiles, angle-dependent pieces, start and goal |
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
  // A piece slides into its gap only while the world is at one of these angles.
  // Out of place, it sits at `from`, where you can't walk on it.
  pieces: [{ at: [1, 2, 1], from: [1, -2, 1], rots: [1] }],
}
```

Then run `node stillwater/test-levels.js` to confirm it can be finished.

## Ideas for next steps

- Moving platforms and pushable blocks
- Sound and a soft ambient track
- Hand-drawn textures, decorative landmarks, and a title screen
- Level select and progress saved in `localStorage`
