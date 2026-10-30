// Pure movement rules for Stillwater. No DOM access, so it can be tested in Node.
//
// A cell is { x, y, h, key, ... } with optional fields:
//  - rots:    views in which the stone is there at all (otherwise it is absent)
//  - bridge:  true for a movable bridge, with axis 'x' or 'y'. It only carries
//             you along that axis.
//  - door:    key of the paired door. Walking into a door puts you on its partner.
//  - section: index of the turning section the stone belongs to. Its position
//             depends on how many quarter turns the section has had.
//
// Walking needs flat ground (same height), except up and down ladders.

(function (root) {
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  const key = (x, y) => x + ',' + y;

  const visibleAt = (cell, rot) => !cell.rots || cell.rots.includes(rot);

  const passable = (cell, dx, dy) => !cell.bridge || (cell.axis === 'x' ? dy === 0 : dx === 0);

  // A grid position after some quarter turns about a pivot.
  function turnCell([x, y], [px, py], quarters) {
    let dx = x - px;
    let dy = y - py;
    for (let i = 0; i < quarters; i++) [dx, dy] = [-dy, dx];
    return [px + dx, py + dy];
  }

  // world: { sections: [quarter turns], axes: 'xy...' } for the bridges.
  // Missing parts start in their level's default state.
  function createBoard(level, world = {}) {
    const sections = world.sections || (level.sections || []).map(() => 0);
    const axes = world.axes || (level.bridges || []).map((b) => b.axis).join('');

    const cells = new Map();
    const add = ([x, y, h], extra) => {
      const cell = { x, y, h, key: key(x, y), ...extra };
      cells.set(cell.key, cell);
      return cell;
    };

    for (const at of level.tiles) add(at, {});
    for (const view of level.views || []) add(view.at, { rots: view.rots });

    (level.sections || []).forEach((section, i) => {
      for (const [x, y, h] of section.cells) {
        const [rx, ry] = turnCell([x, y], section.pivot, sections[i]);
        add([rx, ry, h], { section: i, base: [x, y] });
      }
    });

    const bridges = (level.bridges || []).map((b, i) => add(b.at, { bridge: true, axis: axes[i], index: i }));

    for (const [a, b] of level.doors || []) {
      add(a, { door: key(b[0], b[1]) });
      add(b, { door: key(a[0], a[1]) });
    }

    const ladders = (level.ladders || []).map(([a, b]) => [key(a[0], a[1]), key(b[0], b[1])]);

    return { cells, bridges, ladders, world: { sections: sections.slice(), axes } };
  }

  // Cells you can step to from `cell` in view `rot`.
  function neighbors(board, cell, rot) {
    const out = [];

    for (const [dx, dy] of DIRS) {
      const next = board.cells.get(key(cell.x + dx, cell.y + dy));
      if (!next || !visibleAt(next, rot) || next.h !== cell.h) continue;
      if (!passable(cell, dx, dy) || !passable(next, dx, dy)) continue;

      if (next.door) {
        // Walking into a door comes out at its partner.
        const landing = board.cells.get(next.door);
        if (landing && landing !== cell && visibleAt(landing, rot)) out.push(landing);
        continue;
      }
      out.push(next);
    }

    for (const [a, b] of board.ladders) {
      const other = cell.key === a ? b : cell.key === b ? a : null;
      const next = other && board.cells.get(other);
      if (next && visibleAt(next, rot)) out.push(next);
    }

    return out;
  }

  // Shortest walk from one cell to another in view `rot`, or null if none.
  function findPath(board, fromKey, toKey, rot) {
    const start = board.cells.get(fromKey);
    const goal = board.cells.get(toKey);
    if (!start || !goal || !visibleAt(goal, rot)) return null;

    const parent = new Map([[fromKey, null]]);
    const queue = [start];

    for (let i = 0; i < queue.length; i++) {
      const cell = queue[i];
      if (cell.key === toKey) {
        const path = [];
        for (let k = toKey; k !== null; k = parent.get(k)) {
          path.unshift(board.cells.get(k));
        }
        return path;
      }
      for (const next of neighbors(board, cell, rot)) {
        if (!parent.has(next.key)) {
          parent.set(next.key, cell.key);
          queue.push(next);
        }
      }
    }
    return null;
  }

  // Can the level be finished at all? Searches over the cell you stand on, the
  // view, every bridge's axis and every section's turn. Actions:
  //  - turn the view a quarter (only if the stone under you stays in place)
  //  - walk to a neighbour
  //  - tap a bridge to turn it (not while standing on it)
  //  - tap a knob to turn its section a quarter (not while standing on it)
  function solve(level) {
    const sectionCount = (level.sections || []).length;
    const startKey = key(level.start[0], level.start[1]);
    const goalKey = key(level.goal[0], level.goal[1]);
    const initial = createBoard(level).world;
    const id = (s) => [s.cellKey, s.rot, s.sections.join(''), s.axes].join('|');

    const queue = [{ cellKey: startKey, rot: 0, sections: initial.sections, axes: initial.axes }];
    const seen = new Set([id(queue[0])]);

    for (let i = 0; i < queue.length; i++) {
      const state = queue[i];
      if (state.cellKey === goalKey) return true;

      const board = createBoard(level, { sections: state.sections, axes: state.axes });
      const cell = board.cells.get(state.cellKey);
      const next = [];

      for (const turned of [(state.rot + 1) % 4, (state.rot + 3) % 4]) {
        if (visibleAt(cell, turned)) next.push({ ...state, rot: turned });
      }
      for (const n of neighbors(board, cell, state.rot)) {
        next.push({ ...state, cellKey: n.key });
      }
      board.bridges.forEach((b) => {
        if (b.key === state.cellKey) return;
        const axes = state.axes.split('').map((a, j) => (j === b.index ? (a === 'x' ? 'y' : 'x') : a)).join('');
        next.push({ ...state, axes });
      });
      for (let s = 0; s < sectionCount; s++) {
        if (cell.section === s) continue;
        const sections = state.sections.slice();
        sections[s] = (sections[s] + 1) % 4;
        next.push({ ...state, sections });
      }

      for (const st of next) {
        const sid = id(st);
        if (!seen.has(sid)) {
          seen.add(sid);
          queue.push(st);
        }
      }
    }
    return false;
  }

  const api = { key, visibleAt, turnCell, createBoard, neighbors, findPath, solve };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.Rules = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
