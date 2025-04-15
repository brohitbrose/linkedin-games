// Button onClick() logic.
function zipPopupButtonOnClick() {
  const zipGridDiv = getZipGridDiv();
}

// Returns the possibly iframe-embedded div corresponding to the Zip board.
function getZipGridDiv() {
  let gridDiv = document.querySelector(".grid-game-board");
  if (!gridDiv) {
    const frame = document.querySelector("iframe");
    const frameDoc = frame.contentDocument || frame.contentWindow.document;
    gridDiv = document.querySelector(".grid-game-board");
  }
  return gridDiv;
}

// Transforms the "queens-grid"-ID'd div into a tuple:
// - result[0] is a Board seeded from the div
// - result[1] is a 1D array of the clickable elements in the div.
function transformZipGridDiv(zipGridDiv) {
  const rows = parseInt(zipGridDiv.style.getPropertyValue("--rows"));
  const cols = parseInt(zipGridDiv.style.getPropertyValue("--cols"));

  const cells = Array.from(zipGridDiv.children)
      .filter(x => x.attributes && x,attributes.getNamedItem("data-cell-idx"));
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

  constructor(m, n, numberedCells) {
    this.#m = m;
    this.#n = n;
    this.#size = m * n;
    this.#head = numberedCells[0];
    this.#foot = numberedCells[numberedCells.length - 1];
    this.#current = 1;

    this.#cellStatuses = this.#constructCellStatuses(m, n, this.#size,
        numberedCells);
    this.#visitCell(this.#head);
  }


  #constructCellStatuses(m, n, size, numberedCells) {
    const result = Array.from({ length: size }, () => {
      return [false, -1, 4, false, false];
    });
    for (let i = 0; i < n; i++) {
      result[i][2] -= 1;
      result[size - n + i][2] -= 1;
    }
    for (let i = 0; i < m; i++) {
      result[n * i][2] -= 1;
      result[n * i + n - 1][2] -= 1;
    }
    // FIXME: walls
    for (let i = 0; i < numberedCells.length; i++) {
      result[numberedCells[i]][1] = i + 1;
    }
    return result;
  }

  solve() {
    const result = [this.#head];
    if (!this.#backtrack(1, this.#head, result)) {
      return result;
    } else {
      throw new Error("No solutions found");
    }
  }

  #backtrack(depth, result) {
    if (depth === this.#size) {
      return true;
    }
    const lastMove = result[result.length - 1];
    if (this.#tryDirection(this.#canVisitUp(lastMove), lastMove - this.#n,
        depth, result)) {
      return true;
    }
    if (this.#tryDirection(this.#canVisitDown(lastMove), lastMove + this.#n,
        depth, result)) {
      return true;
    }
    if (this.#tryDirection(this.#canVisitLeft(lastMove), lastMove - 1,
        depth, result)) {
      return true;
    }
    if (this.#tryDirection(this.#canVisitRight(lastMove), lastMove + 1,
        depth, result)) {
      return true;
    }
    return false;
  }

  #tryDirection(canVisit, move, depth, result) {
    if (!canVisit) {
      return false;
    }
    this.#visit(move);
    result.push(move);
    const success = this.#backtrack(depth + 1, move, result);
    this.#unvisit();
    if (success) {
      return true;
    } else {
      result.pop();
      return false;
    }
  }

  /**
   * Returns whether it is possible to visit the cell that is directly above the
   * provided one. This method checks whether:
   * - The "above cell" (hereafter "dst") exists in this grid
   * - dst has already been visited
   * - There is a wall between src and dst
   * - dst contains a number that we cannot reach yet
   * - Visiting dst would "cut off" any unvisited non-terminal cells by leaving
   *   only 1 unvisited cell attached to them, and similarly for the terminal
   *   cell except the check condition is 0 not 1.
   */
  #canVisitUp(src) {
    const dst = src - this.#n;
    return dst >= 0
        && !this.#cellIsVisited(dst)
        && !this.#cellHasDownWall(dst)
        && !(this.#cellContent[dst] > this.#current + 1)
        && !this.#upVisitWillIsolate(src);
  }

  /** Same as #canVisitUp, but for the cell below the provided one. */
  #canVisitDown(src) {
    const dst = src + this.#n;
    return dst < this.#size
        && !this.#cellIsVisited(dst)
        && !this.#cellHasDownWall(src)
        && !(this.#cellContent[dst] > this.#current + 1)
        && !this.#downVisitWillIsolate(src);
  }

  /** Same as #canVisitUp, but for the cell left of the provided one. */
  #canVisitLeft(src) {
    const dst = src - 1;
    return src % this.#n != 0
        && !this.#cellIsVisited(dst)
        && !this.#cellHasRightWall(dst)
        && !(this.#cellContent[dst] > this.#current + 1)
        && !this.#leftVisitWillIsolate(src);
  }

  /** Same as #canVisitUp, but for the cell right of the provided one. */
  #canVisitRight(src) {
    const dst = src + 1;
    return src % this.#n != this.#n - 1
        && !this.#cellIsVisited(dst)
        && !this.#cellHasRightWall(src)
        && !(this.#cellContent[dst] > this.#current + 1)
        && !this.#rightVisitWillIsolate(src);
  }

  #upVisitWillIsolate(src) {
    return visitWillIsolateDown(src)
        || visitWillIsolateLeft(src)
        || visitWillIsolateRight(src);
  }

  #downVisitWillIsolate(src) {
    return visitWillIsolateUp(src)
        || visitWillIsolateLeft(src)
        || visitWillIsolateRight(src);
  }

  #leftVisitWillIsolate(src) {
    return visitWillIsolateUp(src)
        || visitWillIsolateDown(src)
        || visitWillIsolateRight(src);
  }

  #rightVisitWillIsolate(src) {
    return visitWillIsolateUp(src)
        || visitWillIsolateDown(src)
        || visitWillIsolateLeft(src);
  }

  #visitWillIsolateUp(src) {
    const up = src - this.#n;
    return up >= 0
        && !this.#cellIsVisited(up)
        && !this.#cellHasDownWall(up)
        && this.#visitWillIsolate(up);
  }

  #visitWillIsolateDown(src) {
    const down = src + this.#n;
    return down < this.#size
        && !this.#cellIsVisited(down)
        && !this.#cellHasDownWall(src)
        && this.#visitWillIsolate(down);
  }

  #visitWillIsolateLeft(src) {
    if (src % this.#n != 0) {
      const left = src - 1;
      if (!this.#cellIsVisited(left) && !this.#cellHasRightWall(left)
          && this.#visitWillIsolate(left)) {
        return true;
      }
    }
    return false;
  }

  #visitWillIsolateRight(src) {
    if (src % this.#n != this.#n - 1) {
      const right = src + 1;
      if (!this.#cellIsVisited(right) && !this.#cellHasRightWall(src)
          && this.#visitWillIsolate(right)) {
        return true;
      }
    }
    return false;
  }

  #visitWillIsolate(cell) {
    const degree = this.#cellDegree(cell);
    return (cell === this.#foot && degree === 1)
        || (cell !== this.#foot && degree == 2);
  }

  #visit(dst, src) {
    // Mark cell as visited.
    this.#visitCell(dst);
    // Reduce degree counts where applicable, tracking any reductions made to
    // facilitate backtracking.

  }



  #unvisit() {

  }

  #cellIsVisited(i) {
    return this.#cellStatuses[i][0];
  }

  #visitCell(i) {
    this.#cellStatuses[i][0] = true;
  }

  #cellContent(i) {
    return this.#cellStatuses[i][1];
  }

  #addCellContent(i, content) {
    this.#cellStatuses[i][1] = content;
  }

  #cellDegree(i) {
    return this.#cellStatuses[i][2];
  }

  #decrementCellDegree(i) {
    this.#cellStatuses[i][2] -= 1;
  }

  #cellHasRightWall(i) {
    return this.#cellStatuses[i][3];
  }

  #cellHasDownWall(i) {
    return this.#cellStatuses[i][4];
  }

  log() {
    console.log(this.#cellStatuses);
  }

}

// Main
const zipGrid = new ZipGrid(6, 6, [14, 32, 29, 3, 6, 21, 25, 10]);
zipGrid.log();
