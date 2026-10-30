// Pure movement rules for Stillwater. No DOM access, so it can be tested in Node.
//
// A cell is { x, y, h, key, ... } with optional fields:
//  - rots:   views in which the stone is there at all (otherwise it is absent)
//  - bridge: true for a movable bridge, with axis 'x' or 'y'. It only carries
//            you along that axis.
//  - door:   key of the paired door. Walking into a door puts you on its partner.
//
// Walking needs flat ground (same height), except up and down ladders.

(function (root) {
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  const key = (x, y) => x + ',' + y;

  const visibleAt = (cell, rot) => !cell.rots || cell.rots.includes(rot);

  const passable = (cell, dx, dy) => !cell.bridge || (cell.axis === 'x' ? dy === 0 : dx === 0);

  function createBoard(level) {
    const cells = new Map();
    const add = ([x, y, h], extra) => {
      const cell = { x, y, h, key: key(x, y), ...extra };
      cells.set(cell.key, cell);
      return cell;
    };

    for (const at of level.tiles) add(at, {});
    for (const view of level.views || []) add(view.at, { rots: view.rots });

    const bridges = (level.bridges || []).map((b) => add(b.at, { bridge: true, axis: b.axis }));

    for (const [a, b] of level.doors || []) {
      add(a, { door: key(b[0], b[1]) });
      add(b, { door: key(a[0], a[1]) });
    }

    const ladders = (level.ladders || []).map(([a, b]) => [key(a[0], a[1]), key(b[0], b[1])]);

    return { cells, bridges, ladders };
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
  // view, and every bridge's axis. Turning the view is only allowed if the
  // stone under you stays in place. Tapping a bridge turns it, unless you stand on it.
  function solve(level) {
    const board = createBoard(level);
    const { bridges } = board;
    const axesOf = () => bridges.map((b) => b.axis).join('');
    const useAxes = (axes) => bridges.forEach((b, i) => { b.axis = axes[i]; });
    const flip = (axes, i) => axes.slice(0, i) + (axes[i] === 'x' ? 'y' : 'x') + axes.slice(i + 1);

    const startKey = key(level.start[0], level.start[1]);
    const goalKey = key(level.goal[0], level.goal[1]);
    const queue = [{ cellKey: startKey, rot: 0, axes: axesOf() }];
    const seen = new Set([[startKey, 0, queue[0].axes].join('|')]);

    for (let i = 0; i < queue.length; i++) {
      const state = queue[i];
      if (state.cellKey === goalKey) return true;

      useAxes(state.axes);
      const cell = board.cells.get(state.cellKey);

      const next = [];
      for (const turned of [(state.rot + 1) % 4, (state.rot + 3) % 4]) {
        if (visibleAt(cell, turned)) next.push({ cellKey: state.cellKey, rot: turned, axes: state.axes });
      }
      for (const n of neighbors(board, cell, state.rot)) {
        next.push({ cellKey: n.key, rot: state.rot, axes: state.axes });
      }
      bridges.forEach((b, i) => {
        if (b.key !== state.cellKey) {
          next.push({ cellKey: state.cellKey, rot: state.rot, axes: flip(state.axes, i) });
        }
      });

      for (const s of next) {
        const id = [s.cellKey, s.rot, s.axes].join('|');
        if (!seen.has(id)) {
          seen.add(id);
          queue.push(s);
        }
      }
    }
    return false;
  }

  const api = { key, visibleAt, createBoard, neighbors, findPath, solve };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.Rules = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
