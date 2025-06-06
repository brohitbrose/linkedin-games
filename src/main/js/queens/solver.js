export function solveQueens(cells) {
  return new QueensGrid(cells).solve();
}

/** Class representing the grid state of a Queens puzzle. */
export class QueensGrid {

  static #SQUARE_ROOTS = new Map([[16, 4], [25, 5], [36, 6], [49, 7], [64, 8],
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
   * in the grid unmarkable as a queen (possible range is [0, 2]).
   */
  #diagNeighbors;

  /**
   * Maps each color (via i in cell-color-{i}) to the 1D indices of cells (via
   * the cell's data-cell-idx value) belonging to that color.
   */
  #colorsToIndices;

  /**
   * Maps each 1D index to its color.
   */ 
  #indicesToColors;

  /**
   * Tracks which indices have been visited.
   */
  #visitedIndices;

  /**
   * Tracks which colors have queens on them.
   */
  #visitedColors;

  /**
   * Creates a Queens grid.
   * 
   * @constructor
   * @param {Array} array - An array of exactly 
   */
  constructor(array) {
    this.#n = QueensGrid.#SQUARE_ROOTS.get(array.length);
    if (!this.#n) {
      throw new Error("Invalid input array length " + array.length);
    }
    this.#rows = new Array(this.#n).fill(false);
    this.#cols = new Array(this.#n).fill(false);
    this.#diagNeighbors = Array.from({ length: this.#n },
      () => new Array(this.#n).fill(0));
    this.#colorsToIndices = this.#constructColorsToIndices(array);
    this.#indicesToColors = this.#constructIndicesToColors(array);
    this.#visitedIndices = new Array(this.#n * this.#n).fill(false);
    this.#visitedColors = new Array(this.#n).fill(false);
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

  #constructIndicesToColors(array) {
    const result = new Array(this.#n * this.#n);
    for (const elem of array) {
      result[elem.idx] = elem.color;
    }
    return result;
  }

  // Returns an Array of this.#n integers such that each element i indicates
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
        this.#markIgnoreColor(i, j, true);
        result.push(move);
        const shortCircuit = this.#backtrack(depth + 1, result);
        this.#markIgnoreColor(i, j, false);
        if (shortCircuit) {
          return true;
        } else {
          result.pop();
        }
      }
    }
    return false;
  }

  place(i, j) {
    const flattened = this.#flatten(i, j);
    const color = this.#indicesToColors[flattened];
    if (!this.#visitedColors[color] && this.#canPlaceIgnoreColor(i, j)) {
      this.#markIgnoreColor(i, j, true);
      this.#visitedColors[color] = true;
      this.#visitedIndices[flattened] = true;
      return true;
    }
    return false;
  }

  unplace(i, j) {
    const flattened = this.#flatten(i, j);
    if (this.#visitedIndices[flattened]) {
      this.#visitedIndices[flattened] = false;
      const color = this.#indicesToColors[flattened];
      this.visitedColors[color] = false;
      this.#markIgnoreColor(i, j, false);
      return true;
    }
    return false;
  }

  #flatten(i, j) {
    return this.#n * i + j;
  }

  /**
   * Returns whether a queen can be placed in a given spot without touching an
   * existing queen and without sharing a row/column with an existing queen.
   */
  #canPlaceIgnoreColor(i, j) {
    return !(this.#rows[i] || this.#cols[j] || this.#diagNeighbors[i][j] > 0);
  }

  #markIgnoreColor(i, j, mark) {
    this.#rows[i] = mark;
    this.#cols[j] = mark;
    this.#markUpLeft(i, j, mark);
    this.#markDownLeft(i, j, mark);
    this.#markUpRight(i, j, mark);
    this.#markDownRight(i, j, mark);
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
