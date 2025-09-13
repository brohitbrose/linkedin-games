import { doOneMouseCycle, getGridDiv } from '../util.js';
import { solveZip, compressSequence } from './solver.js';

export function autoSolve() {
  const prioritizedApis = [new ZipDomApiV1(), new ZipDomApiV0()];
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

class ZipDomApi {

  autoSolve() {
    const gridDiv = this.getZipGridDiv();
    const [cellDivs, zipGridArgs] = this.transformZipGridDiv(gridDiv);
    const clickSequence = solveZip(...zipGridArgs);
    this.clickCells(cellDivs, clickSequence);
  }

  transformZipGridDiv(gridDiv) {
    const rows = this.getRowsFromGridDiv(gridDiv);
    const cols = this.getColsFromGridDiv(gridDiv);
    const filtered = Array.from(gridDiv.children)
        .filter(c => this.gridDivChildIsCellDiv(c));
    if (filtered.length === 0) {
      this.orElseThrow(null, 'transformZipGridDiv', 'gridDiv contained no '
          + 'children that matched cellDiv filter');
    }
    const cellDivs = new Array(filtered.length);
    const numberedCells = [], downWalls = [], rightWalls = [];
    for (const cellDiv of filtered) {
      const idx = this.getCellDivIdx(cellDiv);
      cellDivs[idx] = cellDiv;
      const content = this.getCellDivContent(cellDiv);
      if (content > 0) {
        numberedCells[content - 1] = idx;
      }
      if (this.cellDivHasDownWall(cellDiv)) {
        downWalls.push(idx);
      }
      if (this.cellDivHasRightWall(cellDiv)) {
        rightWalls.push(idx);
      }
    }
    return [cellDivs, [rows, cols, numberedCells, downWalls, rightWalls]];
  }

  // Synchronously dispatches the computed click events one by one. In-progress
  // puzzles are automatically reset by the click sequence unlike with the other
  // games, so there's no extra check to do here.
  async clickCells(clickTargets, cellSequence) {
    for (const loc of cellSequence) {
      const clickTarget = clickTargets[loc];
      doOneMouseCycle(clickTarget);
      await new Promise(resolve => { setTimeout(() => resolve()) }, 200);
    }
  }

}

// Obfuscated DOM makes it impossible to deduce walls; luckily, this variation
// includes a hydration script that straight up leaks the solution.
class ZipDomApiV1 extends ZipDomApi {

  autoSolve() {
    const cellSequence = compressSequence(this.getSolution());
    const gridDiv = this.getZipGridDiv();
    const cellDivs = this.transformZipGridDiv(gridDiv)[0];
    this.clickCells(cellDivs, cellSequence);
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
    return JSON.parse(hydrationScript.substring(start, end + 1));
  }

  getZipGridDiv() {
    return this.orElseThrow(
        getGridDiv(d => d.querySelector('[data-testid="interactive-grid"]')),
        'getZipGridDiv', 'ZipGridDiv selector yielded nothing');
  }

  getRowsFromGridDiv(gridDiv) {
    return this.getColsFromGridDiv(gridDiv);
  }

  getColsFromGridDiv(gridDiv) {
    const candidates = Object.fromEntries(
      Array.from(gridDiv.style)
        .filter(p => p.startsWith("--") && /^\d+$/.test(gridDiv.style.getPropertyValue(p).trim()))
        .map(p => [p, parseInt(gridDiv.style.getPropertyValue(p))])
    );
    const candidateCount = Object.keys(candidates).length;
    if (candidateCount === 0) {
      orElseThrow(null, 'getDimensionFromGridDiv', 'No appropriate dimension in gridDiv');
    } else if (candidateCount > 1) {
      console.warn('Multiple dimension candidates found in style; dump:', candidates);
    }
    const elem = candidates[Object.keys(candidates)[0]];
    return parseInt(elem);
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

  getCellDivContent(cellDiv) {
    const subCellDiv = cellDiv.querySelector('[data-cell-content="true"]');
    if (subCellDiv) {
      const parsed = parseInt(subCellDiv.textContent);
      return this.orElseThrow(Number.isNaN(parsed) ? null : parsed,
          'getCellDivContent', `Expected number, found ${subCellDiv.textContent}`);
    }
    return -1;
  }

  cellDivHasDownWall(cellDiv) {
    return false;
  }

  cellDivHasRightWall(cellDiv) {
    return false;
  }

  orElseThrow(result, fname, cause) {
    if (result != null) {
      return result;
    }
    throw new Error(`${fname} failed using ZipDomApiV1: ${cause}`);
  }

}

class ZipDomApiV0 extends ZipDomApi {

  getZipGridDiv() {
    return this.orElseThrow(
        getGridDiv(d => d.querySelector(".grid-game-board")),
        'getZipGridDiv', 'ZipGridDiv selector yielded nothing');
  }

  getRowsFromGridDiv(gridDiv) {
    const prop = this.orElseThrow(gridDiv.style?.getPropertyValue('--rows'),
        'getRowFromGridDiv', 'No --rows property found in style');
    const rows = parseInt(prop);
    return this.orElseThrow(Number.isNaN(rows) ? null : rows,
        'getRowFromGridDiv', `--rows property ${prop} is not a number`);
  }

  getColsFromGridDiv(gridDiv) {
    const prop = this.orElseThrow(gridDiv.style?.getPropertyValue('--cols'),
        'getColFromGridDiv', 'No --cols property found in style');
    const rows = parseInt(prop);
    return this.orElseThrow(Number.isNaN(rows) ? null : rows,
        'getColFromGridDiv', `--cols property ${prop} is not a number`);
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

  getCellDivContent(cellDiv) {
    const content = cellDiv.querySelector('.trail-cell-content');
    if (content && content.textContent) {
      const parsed = parseInt(content.textContent);
      return this.orElseThrow(Number.isNaN(parsed) ? null : parsed,
          'getCellDivContent', `Expected number, found ${content.textContent}`);
    }
    return -1;
  }

  cellDivHasDownWall(cellDiv) {
    return cellDiv.querySelector('.trail-cell-wall--down') != null;
  }

  cellDivHasRightWall(cellDiv) {
    return cellDiv.querySelector('.trail-cell-wall--right') != null;
  }

  orElseThrow(result, fname, cause) {
    if (result != null) {
      return result;
    }
    throw new Error(`${fname} failed using ZipDomApiV0: ${cause}`);
  }

}
