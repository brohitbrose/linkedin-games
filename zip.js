// Button onClick() logic.
function zipPopupButtonOnClick() {
  // Extract relevant div from page.
  const gridDiv = getZipGridDiv();
  // div -> [ZipGrid, [div's clickable elements]].
  const gridPkg = transformZipGridDiv(gridDiv);
  const grid = gridPkg[0];
  const clickTargets = gridPkg[1];
  // Determine desired clicks.
  const cellSequence = grid.solve();
  const compressedSequence = compressSequence(cellSequence);
  // Execute desired clicks.
  visitCells(clickTargets, compressedSequence);
}

// Returns the possibly iframe-embedded div corresponding to the Zip grid.
function getZipGridDiv() {
  let gridDiv = document.querySelector(".grid-game-board");
  if (!gridDiv) {
    const frame = document.querySelector("iframe");
    const frameDoc = frame.contentDocument || frame.contentWindow.document;
    gridDiv = frameDoc.querySelector(".grid-game-board");
  }
  return gridDiv;
}

// Transforms the div containing the Zip grid into a tuple:
// - result[0] is a ZipGrid seeded from the div
// - result[1] is a 1D array of the clickable elements in the div.
function transformZipGridDiv(zipGridDiv) {
  const rows = parseInt(zipGridDiv.style.getPropertyValue("--rows"));
  const cols = parseInt(zipGridDiv.style.getPropertyValue("--cols"));
  const numberedCells = [];
  const downWalls = [];
  const rightWalls = [];
  
  const filtered = Array.from(zipGridDiv.children)
      .filter(x => x.attributes && x.attributes.getNamedItem("data-cell-idx"));
  const clickTargets = new Array(filtered.length);

  filtered.forEach(x => {
    const nnm = x.attributes;
    const id = parseInt(nnm.getNamedItem('data-cell-idx').value);
    // Handle circled number.
    const content = x.querySelector('.trail-cell-content');
    if (content) {
      const circledNumber = parseInt(content.textContent);
      numberedCells[circledNumber - 1] = id;
    }
    // Handle down wall
    const downWall = x.querySelector('.trail-cell-wall--down');
    if (downWall) {
      downWalls.push(id);
    }
    // Handle right wall.
    const rightWall = x.querySelector('.trail-cell-wall--right')
    if (rightWall) {
      rightWalls.push(id);
    }
    clickTargets[id] = x;
  });
  return [
    new ZipGrid(rows, cols, numberedCells, downWalls, rightWalls),
    clickTargets
  ];
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

// Synchronously dispatches the computed click events one by one.
function visitCells(clickTargets, cellSequence) {
  for (const loc of cellSequence) {
    const clickTarget = clickTargets[loc];
    doOneClick(clickTarget);
  }
}

function doOneClick(clickTarget) {
  const commonClickArgs = { bubbles: true, cancelable: true, view: window};
  clickTarget.dispatchEvent(new MouseEvent('mousedown', commonClickArgs));
  clickTarget.dispatchEvent(new MouseEvent('mouseup', commonClickArgs));
  clickTarget.dispatchEvent(new MouseEvent('click', commonClickArgs));
}

class ZipGrid {

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

  /**
   * Stores the following for each cell:
   * 0. Whether it is visited
   * 1. The circled number that it includes if present, otherwise -1
   * 2. The number of unvisited neighbors that are not wall-blocked
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
    }
    // Right walls
    for (const walledCell of rightWalls) {
      const cellStatus = result[walledCell];
      cellStatus.addRightWall();
      cellStatus.decrementDegree();
    }
    // Numbered cells
    for (let i = 0; i < numberedCells.length; i++) {
      result[numberedCells[i]].label(i + 1);
    }
    return result;
  }

  solve() {
    const result = [this.#head];
    const degreeModifications = []; // stack
    if (this.#backtrack(1, result, degreeModifications)) {
      return result;
    } else {
      throw new Error("No solutions found");
    }
  }

  // TODO: Implement this iteratively. In Queens, the number of stack frames is
  //  maximally the board dimension, which I've never seen exceed 11 in a real
  //  puzzle. In Zip, it's the number of cells, which I've seen go up to 64.
  #backtrack(depth, result, degreeModifications) {
    if (depth === this.#size) {
      return true;
    }
    const lastMove = result[result.length - 1];
    let shortCircuit = false;
    if (this.#tryDirection(this.#canVisitUp(lastMove), lastMove - this.#n,
        depth, result, degreeModifications, this.#visitUp)) {
      return true;
    }
    if (this.#tryDirection(this.#canVisitDown(lastMove), lastMove + this.#n,
        depth, result, degreeModifications, this.#visitDown)) {
      return true;
    }
    if (this.#tryDirection(this.#canVisitLeft(lastMove), lastMove - 1,
        depth, result, degreeModifications, this.#visitLeft)) {
      return true;
    }
    if (this.#tryDirection(this.#canVisitRight(lastMove), lastMove + 1,
        depth, result, degreeModifications, this.#visitRight)) {
      return true;
    }
    return false;
  }

  #tryDirection(canVisit, move, depth, path, degreeModifications, doVisit) {
    if (!canVisit) {
      return false;
    }
    doVisit.call(this, move, path[path.length - 1], degreeModifications);
    path.push(move);
    const success = this.#backtrack(depth + 1, path, degreeModifications);
    this.#unvisit(move, degreeModifications);
    if (success) {
      return true;
    } else {
      path.pop();
      return false;
    }
  }

  /**
   * Returns whether it is possible to visit the cell that is directly above the
   * provided one. This method checks whether:
   * - The "above cell" (hereafter "dst") exists in this grid
   * - dst has already been visited
   * - There is a wall between src and dst
   * - dst contains a circled number that we cannot reach yet
   * - Visiting dst would "cut off" any unvisited non-terminal cells by leaving
   *   only 1 unvisited cell attached to them, and similarly for the terminal
   *   cell except the check condition is 0 not 1.
   */
  #canVisitUp(src) {
    return this.#canVisitDirection(src,
        s => s - this.#n,
        (d, s) => d >= 0,
        (ds, ss) => ds.hasDownWall(),
        [this.#visitIsolatesDown, this.#visitIsolatesLeft,
            this.#visitIsolatesRight]);
  }

  /** Same as #canVisitUp, but for the cell below the provided one. */
  #canVisitDown(src) {
    return this.#canVisitDirection(src,
        s => s + this.#n,
        (d, s) => d < this.#size,
        (ds, ss) => ss.hasDownWall(),
        [this.#visitIsolatesUp, this.#visitIsolatesLeft,
            this.#visitIsolatesRight]);
  }

  /** Same as #canVisitUp, but for the cell left of the provided one. */
  #canVisitLeft(src) {
    return this.#canVisitDirection(src,
        s => s - 1,
        (d, s) => s % this.#n !== 0,
        (ds, ss) => ds.hasRightWall(),
        [this.#visitIsolatesUp, this.#visitIsolatesDown,
            this.#visitIsolatesRight]);
  }

  /** Same as #canVisitUp, but for the cell right of the provided one. */
  #canVisitRight(src) {
    return this.#canVisitDirection(src,
        s => s + 1,
        (d, s) => s % this.#n !== this.#n - 1,
        (ds, ss) => ss.hasRightWall(),
        [this.#visitIsolatesUp, this.#visitIsolatesDown,
            this.#visitIsolatesLeft]);
  }

  #canVisitDirection(src, computeDst, checkDstSrcBounds, checkDstSrcWall,
      willIsolateFns) {
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

  #visitUp(dst, src, degreeModifications) {
    this.#visitDirection(dst, src, degreeModifications,
        [this.#visitImpactsDownDegree, this.#visitImpactsLeftDegree,
            this.#visitImpactsRightDegree]);
  }

  #visitDown(dst, src, degreeModifications) {
    this.#visitDirection(dst, src, degreeModifications,
        [this.#visitImpactsUpDegree, this.#visitImpactsLeftDegree,
            this.#visitImpactsRightDegree]);
  }

  #visitLeft(dst, src, degreeModifications) {
    this.#visitDirection(dst, src, degreeModifications,
        [this.#visitImpactsUpDegree, this.#visitImpactsDownDegree,
            this.#visitImpactsRightDegree]);
  }

  #visitRight(dst, src, degreeModifications) {
    this.#visitDirection(dst, src, degreeModifications,
        [this.#visitImpactsUpDegree, this.#visitImpactsDownDegree,
          this.#visitImpactsLeftDegree]);
  }

  #visitDirection(dst, src, degreeModifications, impactFns) {
    const dstStatus = this.#cellStatuses[dst];
    // Mark cell as visited.
    dstStatus.setVisited(true);
    // If dst is a circled number, update bookkeeping.
    const dstContent = dstStatus.getContent();
    if (dstContent > 0) {
      this.#current = dstContent; 
    }
    // Check if degrees need to be modified.
    const newModifications = [];
    for (const impactFn of impactFns) {
      const cell = impactFn.call(this, src);
      if (cell >= 0) {
        this.#cellStatuses[cell].decrementDegree();
        newModifications.push(cell);
      }
    }
    degreeModifications.push(newModifications);
  }

  #visitImpactsUpDegree(src) {
    const up = src - this.#n;
    const upStatus = this.#cellStatuses[up];
    return up >= 0 && !upStatus.isVisited() && !upStatus.hasDownWall()
        ? up : -1;
  }

  #visitImpactsDownDegree(src) {
    const down = src + this.#n;
    const downStatus = this.#cellStatuses[down];
    const srcStatus = this.#cellStatuses[src];
    return down < this.#size
          && !downStatus.isVisited() && !srcStatus.hasDownWall()
        ? down : -1;
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

  #unvisit(move, degreeModifications) {
    // Possibly revert degree modifications.
    const modifications = degreeModifications.pop();
    for (const cell of modifications) {
      this.#cellStatuses[cell].incrementDegree();
    }
    // Possibly revert last-found circled number, 
    const moveStatus = this.#cellStatuses[move];
    const moveContent = moveStatus.getContent();
    if (moveContent > 0) {
      this.#current = moveContent - 1;
    }
    // Mark cell as unvisited.
    moveStatus.setVisited(false);
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
