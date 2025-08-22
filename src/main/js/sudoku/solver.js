/** Class representing the grid state of a mini Sudoku puzzle. */
export class SudokuGrid {

  /** The row=column=region count of this grid. */
  #n;
  /** The number of cells in this grid. */
  #n2;
  /** */
  #regionWidth;
  /**  */
  #regionHeight;
  /**  */
  #regionsPerRow;
  /**  */
  #regionsPerCol;
  /**  */
  #values;
  /**  */
  #markCount;
  /**  */
  #rowMasks;
  /**  */
  #colMasks;
  /**  */
  #regMasks;

  constructor(n, regionWidth, regionHeight) {
    if (n < 0 || n > 31) {
      throw new Error('Invalid Sudoku dimension size ' + n);
    }
    this.#n = n;
    this.#n2 = n * n;

    if (n % regionWidth !== 0) {
      throw new Error('regionWidth ' + regionWidth + ' does not evenly divide dimension ' + n);
    }
    this.#regionWidth = regionWidth;
    this.#regionsPerCol = n / regionWidth;

    if (n % regionHeight !== 0) {
      throw new Error('regionHeight ' + regionHeight + ' does not evenly divide dimension ' + n);
    }
    this.#regionHeight = regionHeight;
    this.#regionsPerRow = n / regionHeight;

    if (this.#regionsPerRow * this.#regionsPerCol !== n) {
      throw new Error('Region count must be ' + n + ', provided ' + (this.#regionsPerRow * this.#regionsPerCol));
    }
    this.#values = new Array(this.#n2).fill(0);
    this.#markCount = 0;
    this.#rowMasks = new Array(this.#n).fill(0);
    this.#colMasks = new Array(this.#n).fill(0);
    this.#regMasks = new Array(this.#n).fill(0);
  }

  solve() {
    const result = [];
    if (this.#markCount === this.#n2) {
      return result;
    }
    const sequence = this.#getAttemptSequence();
    const maxDepth = this.#n2 - this.#markCount;
    if (this.#backtrack(maxDepth, 0, sequence, result)) {
      return result;
    } else {
      throw new Error("No solutions found");
    }
  }

  #getAttemptSequence() {
    return Array.from({ length: this.#n2 },
            (_, i) => [i, this.#getPossibleMarkCount(i)])
        .filter(([_, fanout]) => fanout !== 0)
        .sort((a, b) => a[1] - b[1]);
  }

  #getPossibleMarkCount(idx) {
    if (this.#values[idx] !== 0) {
      return 0;
    }
    const col = idx % this.#n;
    const row = (idx - col) / this.#n;
    const reg = this.#getRegionForRowCol(row, col);
    let mask = (this.#colMasks[col] | this.#rowMasks[row] | this.#regMasks[reg]);
    let count = 0;
    while (mask !== 0) {
      mask &= mask - 1;
      count++;
    }
    return this.#n - count;
  }

  #backtrack(maxDepth, curDepth, sequence, result) {
    if (curDepth === maxDepth) {
      return true;
    }
    const [idx, _] = sequence[curDepth];
    const col = idx % this.#n;
    const row = (idx - col) / this.#n;
    const reg = this.#getRegionForRowCol(row, col);
    let mask = (this.#colMasks[col] | this.#rowMasks[row] | this.#regMasks[reg]);
    let pos = 0;
    while (pos < this.#n) {
      if ((mask & 1) === 0) {
        const val = pos + 1;
        const filter = 1 << pos;
        this.#doMark(idx, col, row, reg, val, filter);
        result.push({idx: idx, val: val});
        const shortCircuit = this.#backtrack(maxDepth, curDepth + 1, sequence, result);
        this.unmark(idx);
        if (shortCircuit) {
          return true;
        } else {
          result.pop();
        }
      }
      mask = (mask >> 1);
      pos++;
    }
    return false;
  }

  getMark(idx) {
    this.#validateIdx(idx);
    return this.#values[idx];
  }

  mark(idx, val) {
    this.#validateIdx(idx, val);
    if (val < 1 || val > this.#n) {
      throw new Error('Invalid val ' + val);
    }
    if (this.#values[idx] !== 0) {
      throw new Error("Can't mark already-marked cell at idx " + idx);
    }
    this.#tryMark(idx, val);
  }

  unmark(idx) {
    this.#validateIdx(idx);
    const val = this.#values[idx];
    if (val !== 0) {
      const filter = 1 << (val - 1);
      const col = idx % this.#n;
      this.#colMasks[col] ^= filter;
      const row = (idx - col) / this.#n;
      this.#rowMasks[row] ^= filter;
      const reg = this.#getRegionForRowCol(row, col);
      this.#regMasks[reg] ^= filter;
      this.#values[idx] = 0;
      this.#markCount--;
      return true;
    } else {
      return false;
    }
  }

  #validateIdx(idx) {
    if (idx < 0 || idx >= this.#n2) {
      throw new Error('Invalid idx ' + idx);
    }
  }

  #tryMark(idx, val) {
    const filter = 1 << (val - 1);
    const col = idx % this.#n;
    if ((this.#colMasks[col] & filter) !== 0) {
      throw new Error('Value ' + val + ' already present in col ' + col);
    }
    const row = (idx - col) / this.#n;
    if ((this.#rowMasks[row] & filter) !== 0) {
      throw new Error('Value ' + val + ' already present in row ' + row);
    }
    const reg = this.#getRegionForRowCol(row, col);
    if ((this.#regMasks[reg] & filter) !== 0) {
      throw new Error('Value ' + val + ' already present in region ' + reg);
    }
    this.#doMark(idx, col, row, reg, val, filter);
  }

  #doMark(idx, col, row, reg, val, filter) {
    this.#values[idx] = val;
    this.#colMasks[col] |= filter;
    this.#rowMasks[row] |= filter;
    this.#regMasks[reg] |= filter;
    this.#markCount++;
  }

  #getRegionForRowCol(row, col) {
    const regionRow = Math.floor(row / this.#regionHeight);
    const regionCol = Math.floor(col / this.#regionWidth);
    return regionRow * this.#regionsPerRow + regionCol;
  }
  
}
