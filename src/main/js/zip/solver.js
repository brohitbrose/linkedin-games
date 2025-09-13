export function solveZip(m, n, numberedCells, downWalls, rightWalls) {
  const zipGrid = new ZipGrid(m, n, numberedCells, downWalls, rightWalls);
  const sequence = zipGrid.solve();
  return compressSequence(sequence);
}

/**
 * Returns only the elements of the cell visit sequence that are final elements
 * of same-direction runs.
 */
export function compressSequence(sequence) {
  const result = [];
  if (sequence.length === 0) {
    return result;
  }
  result.push(sequence[0]);
  let i = 1;
  while (i < sequence.length) {
    const runStart = i - 1;
    let diff = sequence[i] - sequence[runStart];
    // Seek i to the last element where sequence[i] - sequence[i-1] === diff.
    while (i + 1 < sequence.length && sequence[i + 1] - sequence[i] === diff) {
      i++;
    }
    result.push(sequence[i]);
    i++;
  }
  return result;
}

/** Class representing the grid state of a fresh Zip puzzle. */
export class ZipGrid {

  /** The number of rows in this grid. */
  #m;
  /** The number of columns in this grid. */
  #n;
  /** The number of elements in this grid. */
  #size;
  /** The index of the starting square. */
  #head;
  /** The index of the terminal square. */
  #foot;
  /** The current marked number that we have reached. */
  #current;
  /** The explored path so far. */
  #path;
  /** The number of moves made so far. */
  #visitedCells;
  /** Bookkeeping stack of degree changes, used by a pruning strategy. */
  #degreeModifications;

  /**
   * Stores the following for each cell:
   * 0. Whether it is visited
   * 1. The circled number that it includes if present, otherwise -1
   * 2. (Used by a pruning strategy) If this cell is unvisited, then the number
   *    of unvisited neighbors that are not wall-blocked; otherwise, undefined
   *    behavior
   * 3. Whether its right neighbor is blocked by a wall
   * 4. Whether its down neighbor is blocked by a wall.
   */
  #cellStatuses;

  constructor(m, n, numberedCells, downWalls, rightWalls) {
    this.#m = m;
    this.#n = n;
    this.#size = m * n;
    this.#head = numberedCells[0];
    this.#foot = numberedCells[numberedCells.length - 1];
    this.#current = 1;

    this.#path = new Array(this.#size).fill(-1);
    this.#path[0] = this.#head;
    this.#visitedCells = 1;
    this.#degreeModifications = Array.from({length: this.#size - 1},
      () => []);

    this.#constructCellStatuses(m, n, this.#size,
        numberedCells, downWalls, rightWalls);
    this.#setVisited(this.#head, true);
  }

  #constructCellStatuses(m, n, size, numberedCells, downWalls, rightWalls) {
    if (numberedCells.length > (1 << 25) - 1) {
      throw new Error("Too many numbered cells: " + this.numberedCells.length);
    }
    this.#cellStatuses = new Array(size).fill(4 << 0x1);
    // Decrement top and bottom border degrees once
    for (let i = 0; i < n; i++) {
      this.#decrementDegree(i);
      this.#decrementDegree(size - n + i);
    }
    // Decrement left and right border degrees once (thus each corner twice)
    for (let i = 0; i < m; i++) {
      this.#decrementDegree(n * i);
      this.#decrementDegree(n * i + n - 1);
    }
    // Down walls
    for (const walledCell of downWalls) {
      this.#addDownWall(walledCell);
      this.#decrementDegree(walledCell);
      if (walledCell < size - n) {
        this.#decrementDegree(walledCell + n);
      }
    }
    // Right walls
    for (const walledCell of rightWalls) {
      this.#addRightWall(walledCell);
      this.#decrementDegree(walledCell);
      if (walledCell % n !== n - 1) {
        this.#decrementDegree(walledCell + 1);
      }
    }
    // Numbered cells
    for (let i = 0; i < numberedCells.length; i++) {
      this.#label(numberedCells[i], i + 1);
    }
  }

  /**
   * Returns some sequence (in official puzzles, the the only sequence) in which
   * grid cells may be visited to solve the puzzle.
   */
  solve() {
    let callStack = [];
    let path;
    this.#stackPushValidMoves(callStack, this.#head);
    while (callStack.length !== 0) {
      const [from, to, doVisit] = callStack.pop();
      while (this.lastMove() !== from) {
        this.unvisit();
      }
      doVisit.call(this, to, from);
      if (this.#visitedCells === this.#size) {
        path = [...this.#path];
        break;
      }
      this.#stackPushValidMoves(callStack, to);
    }
    // Clean up grid state prior to leaving this function.
    while (this.#visitedCells > 1) {
      this.unvisit();
    }
    if (!path) {
      throw new Error("No solutions found");
    }
    return path;
  }

  #stackPushValidMoves(stack, from) {
    if (this.canVisitRight()) {
      stack.push([from, from + 1, this.#doVisitRight]);
    }
    if (this.canVisitLeft()) {
      stack.push([from, from - 1, this.#doVisitLeft]);
    }
    if (this.canVisitDown()) {
      stack.push([from, from + this.#n, this.#doVisitDown]);
    }
    if (this.canVisitUp()) {
      stack.push([from, from - this.#n, this.#doVisitUp]);
    }
  }

  /**
   * Returns whether it is possible to extend the current path to move up once.
   *
   * This method checks whether (let "src" be the last visited cell in #path):
   *
   * - The "above cell" (hereafter "dst") exists in this grid
   * - dst has already been visited
   * - There is a wall between src and dst
   * - dst contains a circled number that we cannot reach yet
   * - Visiting dst would "cut off" any unvisited non-terminal cells by leaving
   *   only 1 unvisited cell attached to them, and similarly for the terminal
   *   cell except the check condition is 0 not 1.
   *
   * The last of these is only relevant for pruning purposes. The backtracking
   * algorithm works completely fine without it, and official puzzles are small
   * enough that there is no noticeable performance benefit to its inclusion. We
   * keep around for academic purposes, and it's simple enough (albeit verbose).
   *
   * For extremely large puzzles, however, the pruning strategy is invaluable--
   * and likely to even be insufficient. Consider an in-progress path that began
   * by going up 5 cells, then right 5 cells, then down 3, then left until it
   * reencountered the upward leg. Assuming that this all happens far away from
   * any grid boundaries, none of these cells will have degree 0/1 whether we go
   * up or down, but going up or down at this point makes the other direction's
   * cells unreachable.
   *
   * Recognizing such isues requires global awareness whereas our simple degree
   * strategy counting is inherently local. Maintaining global state effectively
   * is complicated to reason about and implement; the bookkeeping required for
   * achieving this could well even have *negative* impact for small puzzles. It
   * has been left out for now, but we are open to reconsidering.
   */
  canVisitUp() {
    return this.#canVisitDirection(s => s - this.#n,
        (d, s) => d >= 0,
        (ds, ss) => this.maskHasDownWall(ds),
        [this.#visitIsolatesDown, this.#visitIsolatesLeft,
            this.#visitIsolatesRight]);
  }

  /** Same as #canVisitUp, but for moving down. */
  canVisitDown() {
    return this.#canVisitDirection(s => s + this.#n,
        (d, s) => d < this.#size,
        (ds, ss) => this.maskHasDownWall(ss),
        [this.#visitIsolatesUp, this.#visitIsolatesLeft,
            this.#visitIsolatesRight]);
  }

  /** Same as #canVisitUp, but for moving left. */
  canVisitLeft() {
    return this.#canVisitDirection(s => s - 1,
        (d, s) => s % this.#n !== 0,
        (ds, ss) => this.maskHasRightWall(ds),
        [this.#visitIsolatesUp, this.#visitIsolatesDown,
            this.#visitIsolatesRight]);
  }

  /** Same as #canVisitUp, but for moving right. */
  canVisitRight() {
    return this.#canVisitDirection(s => s + 1,
        (d, s) => s % this.#n !== this.#n - 1,
        (ds, ss) => this.maskHasRightWall(ss),
        [this.#visitIsolatesUp, this.#visitIsolatesDown,
            this.#visitIsolatesLeft]);
  }

  #canVisitDirection(computeDst, checkDstSrcBounds, checkDstSrcWall,
      willIsolateFns) {
    const src = this.lastMove();
    const dst = computeDst.call(this, src);
    const dstStatus = this.#cellStatuses[dst];
    const srcStatus = this.#cellStatuses[src];
    let withoutIsolation = checkDstSrcBounds.call(this, dst, src)
        && !this.maskIsVisited(dstStatus)
        && !checkDstSrcWall.call(this, dstStatus, srcStatus)
        && !(this.getMaskLabel(dstStatus) > this.#current + 1);
    if (!withoutIsolation) {
      return false;
    }
    for (const willIsolateFn of willIsolateFns) {
      if (willIsolateFn.call(this, src)) {
        return false;
      }
    }
    return true;
  }

  #visitIsolatesUp(src) {
    return this.#visitIsolates(this.#visitImpactsUpDegree(src));
  }

  #visitIsolatesDown(src) {
    return this.#visitIsolates(this.#visitImpactsDownDegree(src));
  }

  #visitIsolatesLeft(src) {
    return this.#visitIsolates(this.#visitImpactsLeftDegree(src));
  }

  #visitIsolatesRight(src) {
    return this.#visitIsolates(this.#visitImpactsRightDegree(src));
  }

  #visitIsolates(cell) {
    if (cell < 0) {
      return false;
    }
    const degree = this.#getDegree(cell);
    return (cell === this.#foot && degree === 1)
        || (cell !== this.#foot && degree === 2);
  }

  visitUp() {
    if (this.canVisitUp()) {
      const lastMove = this.lastMove();
      this.#doVisitUp(lastMove - this.#n, lastMove);
      return true;
    }
    return false;
  }

  #doVisitUp(dst, src) {
    this.#visitDirection(dst, src, [this.#visitImpactsDownDegree,
        this.#visitImpactsLeftDegree, this.#visitImpactsRightDegree]);
  }

  visitDown() {
    if (this.canVisitDown()) {
      const lastMove = this.lastMove();
      this.#doVisitDown(lastMove + this.#n, lastMove);
      return true;
    }
    return false;
  }

  #doVisitDown(dst, src) {
    this.#visitDirection(dst, src, [this.#visitImpactsUpDegree,
        this.#visitImpactsLeftDegree, this.#visitImpactsRightDegree]);
  }

  visitLeft() {
    if (this.canVisitLeft()) {
      const lastMove = this.lastMove();
      this.#doVisitLeft(lastMove - 1, lastMove);
      return true;
    }
    return false;
  }

  #doVisitLeft(dst, src) {
    this.#visitDirection(dst, src, [this.#visitImpactsUpDegree,
        this.#visitImpactsDownDegree, this.#visitImpactsRightDegree]);
  }

  visitRight() {
    if (this.canVisitRight()) {
      const lastMove = this.lastMove();
      this.#doVisitRight(lastMove + 1, lastMove);
      return true;
    }
    return false;
  }

  #doVisitRight(dst, src) {
    this.#visitDirection(dst, src,[this.#visitImpactsUpDegree,
        this.#visitImpactsDownDegree, this.#visitImpactsLeftDegree]);
  }

  #visitDirection(dst, src, impactFns) {
    // Mark cell as visited.
    this.#setVisited(dst, true);
    // If dst is a circled number, update bookkeeping.
    const dstContent = this.#getLabel(dst);
    if (dstContent > 0) {
      this.#current = dstContent; 
    }
    // Modify degrees as needed.
    const newModifications = this.#degreeModifications[this.#visitedCells - 1];
    for (const impactFn of impactFns) {
      const cell = impactFn.call(this, src);
      if (cell >= 0) {
        this.#decrementDegree(cell);
        newModifications.push(cell);
      }
    }
    // Update path, visitedCells
    this.#path[this.#visitedCells++] = dst;
  }

  #visitImpactsUpDegree(src) {
    if (src >= this.#n) {
      const up = src - this.#n;
      const upStatus = this.#cellStatuses[up];
      if (!this.maskIsVisited(upStatus) && !this.maskHasDownWall(upStatus)) {
        return up;
      }
    }
    return -1;
  }

  #visitImpactsDownDegree(src) {
    if (src < this.#size - this.#n) {
      const down = src + this.#n;
      if (!this.#isVisited(down) && !this.#hasDownWall(src)) {
        return down;
      }
    }
    return -1;
  }

  #visitImpactsLeftDegree(src) {
    if (src % this.#n !== 0) {
      const left = src - 1;
      const leftStatus = this.#cellStatuses[left];
      if (!this.maskIsVisited(leftStatus)
          && !this.maskHasRightWall(leftStatus)) {
        return left;
      }
    }
    return -1;
  }

  #visitImpactsRightDegree(src) {
    if (src % this.#n !== this.#n - 1) {
      const right = src + 1;
      if (!this.#isVisited(right) && !this.#hasRightWall(src)) {
        return right;
      }
    }
    return -1;
  }

  unvisit() {
    if (this.#visitedCells == 1) {
      return false;
    }
    const lastMove = this.lastMove();
    // Remove last move from path and update visitedCells value.
    this.#path[(this.#visitedCells--) - 1] = -1;
    // Possibly revert degree modifications.
    const modifications = this.#degreeModifications[this.#visitedCells - 1];
    while (modifications.length !== 0) {
      this.#incrementDegree(modifications.pop());
    }
    // Possibly revert last-found circled number, 
    const lastMoveLabel = this.#getLabel(lastMove);
    if (lastMoveLabel > 0) {
      this.#current = lastMoveLabel - 1;
    }
    // Mark cell as unvisited.
    this.#setVisited(lastMove, false);
    return true;
  }

  lastMove() {
    return this.#path[this.#visitedCells - 1];
  }

  // All methods below bitfield operations that could be extracted into a new
  // class, but JS doesn't have low-cost abstractions. :(

  // Bit 0.
  #isVisited(cell) {
    return this.maskIsVisited(this.#cellStatuses[cell]);
  }

  maskIsVisited(mask) {
    return (mask & 1) === 1;
  }

  #setVisited(cell, visited) {
    if (visited) {
      this.#cellStatuses[cell] |= 0x1;
    } else {
      this.#cellStatuses[cell] &= ~0x1;
    }
  }

  // Bits 1-3.
  #getDegree(cell) {
    return this.getMaskDegree(this.#cellStatuses[cell]);
  }

  getMaskDegree(mask) {
    return (mask & 0xE) >>> 1;
  }

  #decrementDegree(cell) {
    this.#cellStatuses[cell] -= 0x2;
  }

  #incrementDegree(cell) {
    this.#cellStatuses[cell] += 0x2;
  }

  // Bit 4.
  #hasDownWall(cell) {
    return this.maskHasDownWall(this.#cellStatuses[cell]);
  }

  maskHasDownWall(mask) {
    return (mask & 0x10) !== 0;
  }

  #addDownWall(cell) {
    this.#cellStatuses[cell] |= 0x10;
  }

  // Bit 5.
  #hasRightWall(cell) {
    return this.maskHasRightWall(this.#cellStatuses[cell]);
  }

  maskHasRightWall(mask) {
    return (mask & 0x20) !== 0;
  }

  #addRightWall(cell) {
    this.#cellStatuses[cell] |= 0x20;
  }

  // Bits 6-30 (avoid 31 due to negative number annoyances).
  #getLabel(cell) {
    return this.getMaskLabel(this.#cellStatuses[cell]);
  }

  getMaskLabel(mask) {
    return mask >>> 6;
  }

  #label(cell, number) {
    this.#cellStatuses[cell] |= (number << 6);
  }

}
