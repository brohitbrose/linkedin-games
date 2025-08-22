import { doOneMouseCycle, getGridDiv } from '../util.js';
import { solveQueens } from './solver.js';

export function autoSolve() {
  const prioritizedApis = [new QueensDomApiV0()];
  for (let i = 0; i < prioritizedApis.length; ) {
    const api = prioritizedApis[i];
    try {
      api.autoSolve();
      return;
    } catch (e) {
      console.error(e);
      if (++i !== prioritizedApis.length) {
        console.info('Will reattempt autoSolve() via a prior API');
      } else {
        console.error('All APIs exhausted');
      }
    }
  }
}

class QueensDomApi {

  autoSolve() {
    const gridDiv = this.getQueensGridDiv();
    const [cellDivs, queensGridArg, existingMarks] =
        this.#transformQueensGridDiv(gridDiv);
    const queenIndices = solveQueens(queensGridArg);
    this.#clickQueens(cellDivs, queenIndices, existingMarks);
  }

  #transformQueensGridDiv(gridDiv) {
    const filtered = Array.from(gridDiv.children)
        .filter(c => this.gridDivChildIsCellDiv(c));
    if (filtered.length === 0) {
      this.orElseThrow(null, 'transformQueensGridDiv', 'gridDiv contained no '
          + 'children that matched cellDiv filter');
    }
    const cellDivs = new Array(filtered.length);
    const queensGridArg = new Array(cellDivs.length);
    const existingMarks = new Map();
    for (const cellDiv of filtered) {
      const idx = this.getCellDivIdx(cellDiv);
      const color = this.getCellDivColor(cellDiv);
      cellDivs[idx] = cellDiv;
      queensGridArg[idx] = {idx: idx, color: color};
      const existingMark = this.getCellDivExistingMark(cellDiv);
      if (existingMark) {
        existingMarks.set(idx, existingMark);
      }
    }
    return [cellDivs, queensGridArg, existingMarks];
  }

  // Synchronously dispatches the computed click events one by one.
  // TODO: Consider asynchronicity. Everything through grid.solve() is extremely
  //  fast (<1ms). clickQueens() simulates clicking DOM elements 2n times where
  //  n is the grid dimenion. This process takes ~5ms on my Mac, but could this
  //  be too fast for the site's logic sometimes?
  #clickQueens(cellDivs, queenLocations, existingMarks) {
    // Transform any cells that must be marked as queens to queens.
    for (const loc of queenLocations) {
      const existingMark = existingMarks.get(loc) ?? 0, cellDiv = cellDivs[loc];
      for (let i = existingMark; i < 2; i++) {
        doOneMouseCycle(cellDiv);
      }
      if (existingMark === 2) {
        existingMarks.delete(loc);
      }
    }
    // Transform any cells that were mistakenly marked as queens to blank. Note
    // that doing these two transformations in this order should work even if
    // "Auto-x" mode is on.
    for (const [key, value] of existingMarks) {
      if (value === 2) {
        doOneMouseCycle(cellDivs[key]);
      }
    }
  }

}

class QueensDomApiV0 extends QueensDomApi {

  getQueensGridDiv() {
    return this.orElseThrow(getGridDiv(d => d.getElementById('queens-grid')),
        'getQueensGridDiv', 'QueensGridDiv selector yielded nothing');
  }

  gridDivChildIsCellDiv(gridDivChild) {
    return gridDivChild.attributes?.getNamedItem('data-cell-idx');
  }

  getCellDivIdx(cellDiv) {
    const dataCellIdx = cellDiv.attributes
        ?.getNamedItem('data-cell-idx')?.value;
    return parseInt(this.orElseThrow(dataCellIdx, 'getCellDivIdx',
        `Failed to parse an integer data cell ID from ${dataCellIdx}`));
  }

  getCellDivColor(cellDiv) {
    const fname = 'getCellDivColor';
    const clazz = cellDiv.attributes?.getNamedItem('class')?.value ?? '';
    const indicator = 'cell-color-';
    const pos = clazz.indexOf(indicator);
    if (pos < 0) {
      this.orElseThrow(undefined, fname,
          `Failed to find class with pattern ${indicator}{...}; saw: ${clazz}`);
    }
    const color = parseInt(clazz.substring(pos + indicator.length));
    return this.orElseThrow(Number.isNaN(color) ? null : color, fname,
        `Class pattern ${indicator}{...} did not terminate in number`);
  }

  getCellDivExistingMark(cellDiv) {
    const mark = cellDiv.attributes
        ?.getNamedItem('aria-label')?.value?.toLowerCase();
    return !mark ? 0 : mark.includes('cross') ? 1 : mark.includes('queen') ? 2
        : 0;
  }

  orElseThrow(result, fname, cause) {
    if (result != null) {
      return result;
    }
    throw new Error(`${fname} failed using QueensDomApiV0: ${cause}`);
  }

}
