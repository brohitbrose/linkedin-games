// Button onClick() logic.
function queensPopupButtonOnClick() {
  const queensGridDiv = getQueensGridDiv();
  const queensGridPkg = transformQueensGridDiv(queensGridDiv);
  const board = queensGridPkg[0];
  const clickTargets = queensGridPkg[1];
  const queenLocations = solve(board);
  clickQueens(clickTargets, queenLocations);
}

// Returns the div (which may be in an iframe) with ID "queens-grid".
function getQueensGridDiv() {
  let boardDiv = document.getElementById("queens-grid");
  if (!boardDiv) {
    const frame = document.querySelector("iframe");
    const frameDoc = frame.contentDocument || frame.contentWindow.document;
    boardDiv = frameDoc.getElementById("queens-grid");
  }
  return boardDiv;
}

// Transforms the "queens-grid"-ID'd div into a tuple:
// - result[0] is a Board seeded from the div
// - result[1] is a 1D array of the clickable elements in the div.
function transformQueensGridDiv(queensGridDiv) {
  const filtered = Array.from(queensGridDiv.children)
      .filter(x => x.attributes && x.attributes.getNamedItem("data-cell-idx"));
  const clickTargets = Array(filtered.length);
  const arr = filtered.map(x => {
      const nnm = x.attributes;
      const id = parseInt(nnm.getNamedItem('data-cell-idx').value);
      const clazz = nnm.getNamedItem('class').value;
      const colorIdx = clazz.indexOf('cell-color-') + 'cell-color-'.length;
      const color = parseInt(clazz.substring(colorIdx));
      clickTargets[id] = x;
      return {"idx": id, "color": color};
    });
  return [new Board(arr), clickTargets];
}

// For a Board board, returns an Array of board.n integers such that each
// element i indicates that the cell with attribute 'data-cell-idx'=i should
// be marked as a queen.
function solve(board) {
  const result = [];
  if (backtrack(board, 0, result)) {
    return result;
  } else {
    throw new Error("Could not solve board");
  }
}

// Recursive backtracking function that short-circuit-returns the first-found
// valid solution.
function backtrack(board, depth, result) {
  if (depth == board.n) {
    return true;
  }
  const possibleMoves = board.colorsToIndices[depth][1];
  for (const move of possibleMoves) {
    const j = move % board.n;
    const i = (move - j) / board.n;
    if (board.canPlace(i, j)) {
      board.place(i, j);
      result.push(move);
      const shortCircuit = backtrack(board, depth + 1, result);
      board.unplace(i, j);
      if (shortCircuit) {
        return true;
      } else {
        result.pop(move);
      }
    }
  }
  return false;
}

// Actually dispatches the computed click events.
function clickQueens(clickTargets, queenLocations) {
  for (const loc of queenLocations) {
    const clickTarget = clickTargets[loc];
    // Blank -> X
    doOneClick(clickTarget);
    // X -> Queen
    doOneClick(clickTarget);
  }
}

const commonClickArgs = { bubbles: true, cancelable: true, view: window};

function doOneClick(clickTarget) {
  clickTarget.dispatchEvent(new MouseEvent('mousedown', commonClickArgs));
  clickTarget.dispatchEvent(new MouseEvent('mouseup', commonClickArgs));
  clickTarget.dispatchEvent(new MouseEvent('click', commonClickArgs));
}

const square_roots = new Map([[16, 4], [25, 5], [36, 6], [49, 7], [64, 8],
    [81, 9], [100, 10], [121, 11], [144, 12],
    [169, 13], [196, 14], [225, 15], [256, 16]]);

class Board {

  constructor(array) {
    this.n = square_roots.get(array.length);
    if (!this.n) {
      throw new Error("Invalid input array length " + array.length);
    }
    this.rows = Array(this.n).fill(false);
    this.cols = Array(this.n).fill(false);
    // Each cell gets a counter whose elements correspond to the last diagaonal
    // neighbor that made the cell unqueenable. In theory, at most two such
    // neighbors could be responsible for this (i.e. the bottom-left and
    // top-right, or the bottom-right and top-left neighbors). The other
    // combinations would result in invalid row/col, which is an easier check.
    this.diagNeighbors = Array.from({ length: this.n },
      () => Array(this.n).fill(0));
    this.colorsToIndices = this.#constructColorsToIndices(array);
  }

  #constructColorsToIndices(array) {
    const result = new Map();
    for (const entry of array) {
      const color = entry['color'];
      let queue = result.get(color);
      if (!queue) {
        queue = [];
        queue.push(entry['idx']);
        result.set(color, queue);
      } else {
        queue.push(entry['idx']);
      }
    }
    // Heuristic: process colors in ascending order of number of available cells
    // on the empty board. A better heuristic would be to reevaluate the free
    // cell count every time we place down a queen. Two problems, though:
    // - Repeatedly reevaluating the optimal color adds complexity/overhead.
    // - Our place() methods circumvent marking most cells as "not-free" once we
    // place a queen (diagonal queen neighbors are the sole exception).
    // We opt for the board state optimizations over the enhanced heuristic.
    return [...result.entries()].sort(([, a], [, b]) => a.length - b.length);
  }

  // Does not check color, because the caller of backtrack() seeks one valid
  // entry per color in a given depth.
  canPlace(i, j) {
    return !(this.rows[i] || this.cols[j] || this.diagNeighbors[i][j] > 0);
  }

  place(i, j) {
    this.rows[i] = true;
    this.cols[j] = true;
    this.#markUpLeft(i, j, true);
    this.#markDownLeft(i, j, true);
    this.#markUpRight(i, j, true);
    this.#markDownRight(i, j, true);
  }

  unplace(i, j) {
    this.rows[i] = false;
    this.cols[j] = false;
    this.#markUpLeft(i, j, false);
    this.#markDownLeft(i, j, false);
    this.#markUpRight(i, j, false);
    this.#markDownRight(i, j, false);
  }

  #markUpLeft(i, j, mark) {
    if (i > 0 && j > 0) {
      this.#addMark(i-1, j-1, mark);
    }
  }

  #markDownLeft(i, j, mark) {
    if (i < this.n - 1 && j > 0) {
      this.#addMark(i+1, j-1, mark);
    }
  }

  #markUpRight(i, j, mark) {
    if (i > 0 && j < this.n - 1) {
      this.#addMark(i-1, j+1, mark);
    }
  }

  #markDownRight(i, j, mark) {
    if (i < this.n - 1 && j < this.n - 1) {
      this.#addMark(i+1, j+1, mark);
    }
  }

  #addMark(i, j, mark) {
    if (mark) {
      this.diagNeighbors[i][j] += 1;
    } else {
      this.diagNeighbors[i][j] -= 1;
    }
  }

}
