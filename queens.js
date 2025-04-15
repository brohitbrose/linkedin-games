// Button onClick() logic.
function queensPopupButtonOnClick() {
  // Extract relevant div from page.
  const gridDiv = getQueensGridDiv();
  // div -> [QueensGrid, [div's clickable elements]].
  const gridPkg = transformQueensGridDiv(gridDiv);
  const grid = gridPkg[0];
  const clickTargets = gridPkg[1];
  // Determine desired clicks.
  const queenLocations = grid.solve();
  // Execute desired clicks.
  // TODO: Consider asynchronicity. Everything through grid.solve() is extremely
  //  fast (<1ms). clickQueens() simulates clicking DOM elements 2n times where
  //  n is the grid dimenion. This process takes ~5ms on my Mac, but could this
  //  be too fast for the site's logic sometimes?
  clickQueens(clickTargets, queenLocations);
}

// Returns the possibly iframe-embedded div corresponding to the Queens grid.
function getQueensGridDiv() {
  let gridDiv = document.getElementById("queens-grid");
  if (!gridDiv) {
    const frame = document.querySelector("iframe");
    const frameDoc = frame.contentDocument || frame.contentWindow.document;
    gridDiv = frameDoc.getElementById("queens-grid");
  }
  return gridDiv;
}

// Transforms the "queens-grid"-ID'd div into a tuple:
// - result[0] is a QueensGrid seeded from the div
// - result[1] is a 1D array of the clickable elements in the div.
function transformQueensGridDiv(queensGridDiv) {
  // TODO: consider a flatMap() variant
  const filtered = Array.from(queensGridDiv.children)
      .filter(x => x.attributes && x.attributes.getNamedItem("data-cell-idx"));
  const clickTargets = new Array(filtered.length);
  const arr = filtered.map(x => {
      const nnm = x.attributes;
      const id = parseInt(nnm.getNamedItem('data-cell-idx').value);
      const clazz = nnm.getNamedItem('class').value;
      const colorIdx = clazz.indexOf('cell-color-') + 'cell-color-'.length;
      const color = parseInt(clazz.substring(colorIdx));
      clickTargets[id] = x;
      return {"idx": id, "color": color};
    });
  return [new QueensGrid(arr), clickTargets];
}

// Synchronously dispatches the computed click events one by one.
function clickQueens(clickTargets, queenLocations) {
  for (const loc of queenLocations) {
    const clickTarget = clickTargets[loc];
    // Blank -> X
    doOneClick(clickTarget);
    // X -> Queen
    doOneClick(clickTarget);
  }
}

function doOneClick(clickTarget) {
  const commonClickArgs = { bubbles: true, cancelable: true, view: window};
  clickTarget.dispatchEvent(new MouseEvent('mousedown', commonClickArgs));
  clickTarget.dispatchEvent(new MouseEvent('mouseup', commonClickArgs));
  clickTarget.dispatchEvent(new MouseEvent('click', commonClickArgs));
}

/** Class representing the grid state of a Queens puzzle. */
class QueensGrid {

  static #square_roots = new Map([[16, 4], [25, 5], [36, 6], [49, 7], [64, 8],
    [81, 9], [100, 10], [121, 11], [144, 12],
    [169, 13], [196, 14], [225, 15], [256, 16]]);

  /** The row=column=color count of this grid. */
  #n;
  /** Tracks whether the ([0,this.n))th row of the grid contains a queen. */
  #rows;
  /** Tracks whether the ([0,this.n))th column of the grid contains a queen. */
  #cols;

  /**
   * Tracks how many diagonal neighbors are responsible for making each cell
   * in the grid unmarkable as a queen.
   */
  #diagNeighbors;

  /**
   * Maps each color (via i in cell-color-{i}) to the 1D indices of cells (via
   * the cell's data-cell-idx value) belonging to that color.
   */
  #colorsToIndices;

  /**
   * Creates a Queens grid.
   * 
   * @constructor
   * @param {Array} array - An array of exactly 
   */
  constructor(array) {
    this.#n = QueensGrid.#square_roots.get(array.length);
    if (!this.#n) {
      throw new Error("Invalid input array length " + array.length);
    }
    this.#rows = new Array(this.#n).fill(false);
    this.#cols = new Array(this.#n).fill(false);
    this.#diagNeighbors = Array.from({ length: this.#n },
      () => new Array(this.#n).fill(0));
    this.#colorsToIndices = this.#constructColorsToIndices(array);
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
    // on the empty grid. A better heuristic would be to reevaluate the free
    // cell count every time we place down a queen. Two problems, though:
    // - Repeatedly reevaluating the optimal color adds complexity/overhead.
    // - Our place() methods circumvent marking most cells as "not-free" once we
    //   place a queen (diagonal queen neighbors are the sole exception).
    // We opt for the grid state optimizations over the enhanced heuristic.
    return [...result.entries()].sort(([, a], [, b]) => a.length - b.length);
  }

  // Returns an Array of this.#n integers such that each element i indicates that
  // the cell with attribute 'data-cell-idx'=i should be marked as a queen.
  solve() {
    const result = [];
    if (this.#backtrack(0, result)) {
      return result;
    } else {
      throw new Error("No solutions found");
    }
  }

  // Recursive backtracking function that short-circuit-returns the first-found
  // valid solution.
  #backtrack(depth, result) {
    if (depth === this.#n) {
      return true;
    }
    const possibleMoves = this.#colorsToIndices[depth][1];
    for (const move of possibleMoves) {
      const j = move % this.#n;
      const i = (move - j) / this.#n;
      if (this.#canPlaceIgnoreColor(i, j)) {
        this.#placeIgnoreColor(i, j);
        result.push(move);
        const shortCircuit = this.#backtrack(depth + 1, result);
        this.#unplace(i, j);
        if (shortCircuit) {
          return true;
        } else {
          result.pop();
        }
      }
    }
    return false;
  }

  /**
   * Returns whether a queen can be placed in a given spot without touching an
   * existing queen and without sharing a row/column with an existing queen.
   * Does not check color, because backtrack() seeks one only valid entry per
   * color in a given depth.
   */
  #canPlaceIgnoreColor(i, j) {
    return !(this.#rows[i] || this.#cols[j] || this.#diagNeighbors[i][j] > 0);
  }

  #placeIgnoreColor(i, j) {
    this.#rows[i] = true;
    this.#cols[j] = true;
    this.#markUpLeft(i, j, true);
    this.#markDownLeft(i, j, true);
    this.#markUpRight(i, j, true);
    this.#markDownRight(i, j, true);
  }

  #unplace(i, j) {
    this.#rows[i] = false;
    this.#cols[j] = false;
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
    if (i < this.#n - 1 && j > 0) {
      this.#addMark(i+1, j-1, mark);
    }
  }

  #markUpRight(i, j, mark) {
    if (i > 0 && j < this.#n - 1) {
      this.#addMark(i-1, j+1, mark);
    }
  }

  #markDownRight(i, j, mark) {
    if (i < this.#n - 1 && j < this.#n - 1) {
      this.#addMark(i+1, j+1, mark);
    }
  }

  #addMark(i, j, mark) {
    if (mark) {
      this.#diagNeighbors[i][j] += 1;
    } else {
      this.#diagNeighbors[i][j] -= 1;
    }
  }

}
