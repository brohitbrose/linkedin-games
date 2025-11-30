import { doOneMouseCycle, getGridDiv } from '../util.js';
import { solveQueens } from './solver.js';

export function autoSolve() {
  const prioritizedApis = [new QueensDomApiV1(), new QueensDomApiV0()];
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
    this.clickQueens(cellDivs, queenIndices, existingMarks);
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
  clickQueens(cellDivs, queenLocations, existingMarks) {
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

class QueensDomApiV1 extends QueensDomApi {

  autoSolve() {
    const rawSolution = this.getSolution();
    const processedSolution = this.processSolution(rawSolution);
    const gridDiv = this.getQueensGridDiv();
    const [cellDivs, existingMarks] = this.transformQueensGridDiv(gridDiv);
    this.clickCellsWithFeedback(cellDivs, processedSolution, existingMarks);
  }

  getSolution() {
    const hydrationScript = this.orElseThrow(
          getGridDiv(d => d.getElementById('rehydrate-data')), 'getSolution',
          'No script with id rehydrate-data found')
        .textContent;
    const indicator = '\\"solution\\"';
    const anchor = hydrationScript.indexOf(indicator);
    if (anchor < 0) {
      this.orElseThrow(null, 'getSolution', 'Failed to locate indicator');
    }
    const start = hydrationScript.indexOf('[', anchor + indicator.length);
    const end = hydrationScript.indexOf(']', start);
    const substring = hydrationScript.substring(start, end + 1);
    return JSON.parse(substring.replaceAll('\\', ''));
  }

  processSolution(rawSolution) {
    const n = rawSolution.length;
    return rawSolution.map((x) => n * x.row + x.col);
  }

  getQueensGridDiv() {
    return this.orElseThrow(
        getGridDiv(d => d.querySelector('[data-testid="interactive-grid"]')),
        'getQueensGridDiv', 'QueensGridDiv selector yielded nothing');
  }

  transformQueensGridDiv(gridDiv) {
    const filtered = Array.from(gridDiv.children)
        .filter(c => this.gridDivChildIsCellDiv(c));
    if (filtered.length === 0) {
      this.orElseThrow(null, 'transformQueensGridDiv', 'gridDiv contained no '
          + 'children that matched cellDiv filter');
    }
    const cellDivs = new Array(filtered.length);
    const existingMarks = new Map();
    for (const cellDiv of filtered) {
      const idx = this.getCellDivIdx(cellDiv);
      cellDivs[idx] = cellDiv;
      const existingMark = this.getCellDivExistingMark(cellDiv);
      if (existingMark) {
        existingMarks.set(idx, existingMark);
      }
    }
    return [cellDivs, existingMarks];
  }

  gridDivChildIsCellDiv(gridDivChild) {
    return gridDivChild.attributes?.getNamedItem('data-cell-idx');
  }

  getCellDivIdx(cellDiv) {
    const dataCellIdx = cellDiv.attributes
        ?.getNamedItem('data-cell-idx')?.value;
    return parseInt(this.orElseThrow(dataCellIdx, 'getIdFromCellDiv',
        `Failed to parse an integer data cell ID from ${dataCellIdx}`));
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
    throw new Error(`${fname} failed using QueensDomApiV1: ${cause}`);
  }

  // Dispatching clicks blindly is inconsistent in dom V1.
  async clickCellsWithFeedback(cellDivs, clickSequence, existingMarks) {
    // Transform any cells that must be marked as queens to queens.
    for (const loc of clickSequence) {
      const existingMark = existingMarks.get(loc) ?? 0, cellDiv = cellDivs[loc];
      for (let i = existingMark; i < 2; i++) {
        await anticipateOneMutation(cellDiv, loc);
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
        await anticipateOneMutation(cellDivs[key], key);
      }
    }

    function anticipateOneMutation(cellDiv, loc) {
      return new Promise((resolve, reject) => {
        // Timeout-based cleanup (in case no mutations are observed)
        let timeoutRef = setTimeout(() => {
          observer.disconnect();
          console.error('Timed out anticipating mutation on', cellDiv);
          return reject(new Error('Timed out mutate cell ' + loc));
        }, 10000);
        // Clean up (including aforementioned timeout) if mutation is observed
        const observer = new MutationObserver(() => {
          clearTimeout(timeoutRef);
          observer.disconnect();
          return resolve();
        });
        // Register the observer
        observer.observe(cellDiv, { attributes: true, childList: true, subtree: true });
        // Kickoff!
        doOneMouseCycle(cellDiv);
      });
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
