export function solveZip(gridArgs) {
  const zipGrid = new ZipGrid(gridArgs[0], gridArgs[1], gridArgs[2],
      gridArgs[3], gridArgs[4]);
  const sequence = zipGrid.solve();
  return compressSequence(sequence);
}

/**
 * Returns only the elements of the cell visit sequence that are final elements
 * of same-direction runs.
 */
function compressSequence(sequence) {
  const result = [];
  if (sequence.length === 0) {
    return result;
  }
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
  /** Bookkeeping stack of degree changes. */
  #degreeModifications;

  /**
   * Stores the following for each cell:
   * 0. Whether it is visited
   * 1. The circled number that it includes if present, otherwise -1
   * 2. If this cell is visited, then the number of unvisited neighbors that are
   *    not wall-blocked; otherwise, undefined behavior
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

    this.#cellStatuses = this.#constructCellStatuses(m, n, this.#size,
        numberedCells, downWalls, rightWalls);
    this.#cellStatuses[this.#head].setVisited(true);
  }

  #constructCellStatuses(m, n, size, numberedCells, downWalls, rightWalls) {
    const result = Array.from({ length: size }, () => new ZipGridCellStatus());
    // Decrement top and bottom border degrees once
    for (let i = 0; i < n; i++) {
      result[i].decrementDegree();
      result[size - n + i].decrementDegree();
    }
    // Decrement left and right border degrees once (thus each corner twice)
    for (let i = 0; i < m; i++) {
      result[n * i].decrementDegree();
      result[n * i + n - 1].decrementDegree();
    }
    // Down walls
    for (const walledCell of downWalls) {
      const cellStatus = result[walledCell];
      cellStatus.addDownWall();
      cellStatus.decrementDegree();
      if (walledCell < size - n) {
        result[walledCell + n].decrementDegree();
      }
    }
    // Right walls
    for (const walledCell of rightWalls) {
      const cellStatus = result[walledCell];
      cellStatus.addRightWall();
      cellStatus.decrementDegree();
      if (walledCell % n !== n - 1) {
        result[walledCell + 1].decrementDegree();
      }
    }
    // Numbered cells
    for (let i = 0; i < numberedCells.length; i++) {
      result[numberedCells[i]].label(i + 1);
    }
    return result;
  }

  /**
   * Returns a sequence (usually the only sequence) in which grid cells may be
   * visited to solve the puzzle.
   */
  solve() {
    let result;
    if (result = this.#backtrack()) {
      return result;
    } else {
      throw new Error("No solutions found");
    }
  }

  // Recursive backtracking function that short-circuit-returns the first-found
  // valid solution.
  // TODO: Implement this iteratively. In Queens, the number of stack frames is
  //  maximally the board dimension, which I've never seen exceed 11 in a real
  //  puzzle. In Zip, it's the number of cells, which I've seen go up to 64, and
  //  the use of the helper function compounds this number.
  #backtrack() {
    if (this.#visitedCells === this.#size) {
      return [...this.#path];
    }
    const move = this.lastMove();
    let result;
    if (result = this.#tryDirection(this.canVisitUp(), move - this.#n, move,
        this.#doVisitUp)) {
      return result;
    }
    if (result = this.#tryDirection(this.canVisitDown(), move + this.#n,
        move, this.#doVisitDown)) {
      return result;
    }
    if (result = this.#tryDirection(this.canVisitLeft(), move - 1, move,
        this.#doVisitLeft)) {
      return result;
    }
    if (result = this.#tryDirection(this.canVisitRight(), move + 1, move,
        this.#doVisitRight)) {
      return result;
    }
    return false;
  }

  #tryDirection(canVisit, move, lastMove, doVisit) {
    if (!canVisit) {
      return false;
    }
    doVisit.call(this, move, lastMove);
    const solution = this.#backtrack();
    this.unvisit();
    return solution;
  }

  /**
   * Returns whether it is possible to extend the current path to move up. This
   * method checks whether (let "src" be the last visited cell in #path):
   * - The "above cell" (hereafter "dst") exists in this grid
   * - dst has already been visited
   * - There is a wall between src and dst
   * - dst contains a circled number that we cannot reach yet
   * - Visiting dst would "cut off" any unvisited non-terminal cells by leaving
   *   only 1 unvisited cell attached to them, and similarly for the terminal
   *   cell except the check condition is 0 not 1.
   */
  canVisitUp() {
    return this.#canVisitDirection(s => s - this.#n,
        (d, s) => d >= 0,
        (ds, ss) => ds.hasDownWall(),
        [this.#visitIsolatesDown, this.#visitIsolatesLeft,
            this.#visitIsolatesRight]);
  }

  /** Same as #canVisitUp, but for moving down. */
  canVisitDown() {
    return this.#canVisitDirection(s => s + this.#n,
        (d, s) => d < this.#size,
        (ds, ss) => ss.hasDownWall(),
        [this.#visitIsolatesUp, this.#visitIsolatesLeft,
            this.#visitIsolatesRight]);
  }

  /** Same as #canVisitUp, but for moving left. */
  canVisitLeft() {
    return this.#canVisitDirection(s => s - 1,
        (d, s) => s % this.#n !== 0,
        (ds, ss) => ds.hasRightWall(),
        [this.#visitIsolatesUp, this.#visitIsolatesDown,
            this.#visitIsolatesRight]);
  }

  /** Same as #canVisitUp, but for moving right. */
  canVisitRight() {
    return this.#canVisitDirection(s => s + 1,
        (d, s) => s % this.#n !== this.#n - 1,
        (ds, ss) => ss.hasRightWall(),
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
        && !dstStatus.isVisited()
        && !checkDstSrcWall.call(this, dstStatus, srcStatus)
        && !(dstStatus.getContent() > this.#current + 1);
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
    const cellStatus = this.#cellStatuses[cell];
    const degree = cellStatus.getDegree();
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
    const dstStatus = this.#cellStatuses[dst];
    // Mark cell as visited.
    dstStatus.setVisited(true);
    // If dst is a circled number, update bookkeeping.
    const dstContent = dstStatus.getContent();
    if (dstContent > 0) {
      this.#current = dstContent; 
    }
    // Modify degrees as needed.
    const newModifications = this.#degreeModifications[this.#visitedCells - 1];
    for (const impactFn of impactFns) {
      const cell = impactFn.call(this, src);
      if (cell >= 0) {
        this.#cellStatuses[cell].decrementDegree();
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
      if (!upStatus.isVisited() && !upStatus.hasDownWall()) {
        return up;
      }
    }
    return -1;
  }

  #visitImpactsDownDegree(src) {
    if (src < this.#size - this.#n) {
      const down = src + this.#n;
      const downStatus = this.#cellStatuses[down];
      const srcStatus = this.#cellStatuses[src];
      if (!downStatus.isVisited() && !srcStatus.hasDownWall()) {
        return down;
      }
    }
    return -1;
  }

  #visitImpactsLeftDegree(src) {
    if (src % this.#n !== 0) {
      const left = src - 1;
      const leftStatus = this.#cellStatuses[left];
      if (!leftStatus.isVisited() && !leftStatus.hasRightWall()) {
        return left;
      }
    }
    return -1;
  }

  #visitImpactsRightDegree(src) {
    if (src % this.#n !== this.#n - 1) {
      const right = src + 1;
      const rightStatus = this.#cellStatuses[right];
      const srcStatus = this.#cellStatuses[src];
      if (!rightStatus.isVisited() && !srcStatus.hasRightWall()) {
        return right;
      }
    }
    return -1;
  }

  unvisit() {
    const lastMove = this.lastMove();
    // Remove last move from path and update visitedCells value.
    this.#path[(this.#visitedCells--) - 1] = -1;
    // Possibly revert degree modifications.
    const modifications = this.#degreeModifications[this.#visitedCells - 1];
    while (modifications.length !== 0) {
      this.#cellStatuses[modifications.pop()].incrementDegree();
    }
    // Possibly revert last-found circled number, 
    const moveStatus = this.#cellStatuses[lastMove];
    const moveContent = moveStatus.getContent();
    if (moveContent > 0) {
      this.#current = moveContent - 1;
    }
    // Mark cell as unvisited.
    moveStatus.setVisited(false);
  }

  lastMove() {
    return this.#path[this.#visitedCells - 1];
  }

}

class ZipGridCellStatus {

  #isVisited;
  #content;
  #degree;
  #hasDownWall;
  #hasRightWall;

  constructor() {
    this.#isVisited = false;
    this.#content = -1;
    this.#degree = 4;
    this.#hasDownWall = false;
    this.#hasRightWall = false;
  }

  isVisited() {
    return this.#isVisited;
  }

  setVisited(visited) {
    this.#isVisited = visited;
  }

  label(number) {
    this.#content = number;
  }

  getContent() {
    return this.#content;
  }

  getDegree() {
    return this.#degree;
  }

  decrementDegree() {
    this.#degree--;
  }

  incrementDegree() {
    this.#degree++;
  }

  hasDownWall() {
    return this.#hasDownWall;
  }

  addDownWall() {
    this.#hasDownWall = true;
  }

  hasRightWall() {
    return this.#hasRightWall;
  }

  addRightWall() {
    this.#hasRightWall = true;
  }

}
