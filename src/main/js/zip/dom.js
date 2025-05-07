import { doOneClick, getGridDiv } from '../util.js';
import { solveZip } from './solver.js';

export function autoSolve() {
  const prioritizedApis = [new ZipDomApiV0()];
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
    const [cellDivs, zipGridArgs] = this.#transformZipGridDiv(gridDiv);
    const clickSequence = solveZip(...zipGridArgs);
    this.#clickCells(cellDivs, clickSequence);
  }

  #transformZipGridDiv(gridDiv) {
    const rows = this.getRowsFromGridDiv(gridDiv);
    const cols = this.getColsFromGridDiv(gridDiv);
    const numberedCells = [], downWalls = [], rightWalls = [];
    const cellDivs = this.getCellDivsFromGridDiv(gridDiv);
    for (const cellDiv of cellDivs) {
      const idx = this.getCellDivIdx(cellDiv);
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
  #clickCells(clickTargets, cellSequence) {
    for (const loc of cellSequence) {
      const clickTarget = clickTargets[loc];
      doOneClick(clickTarget);
    }
  }

}

class ZipDomApiV0 extends ZipDomApi {

  getZipGridDiv() {
    return this.#orElseThrow(
        getGridDiv(d => d.querySelector(".grid-game-board")),
        'getZipGridDiv', 'ZipGridDiv selector yielded nothing');
  }

  getRowsFromGridDiv(gridDiv) {
    const prop = this.#orElseThrow(gridDiv.style?.getPropertyValue('--rows'),
        'getRowFromGridDiv', 'No --rows property found in style');
    const rows = parseInt(prop);
    return this.#orElseThrow(Number.isNaN(rows) ? null : rows,
        'getRowFromGridDiv', `--rows property ${prop} is not a number`);
  }

  getColsFromGridDiv(gridDiv) {
    const prop = this.#orElseThrow(gridDiv.style?.getPropertyValue('--cols'),
        'getColFromGridDiv', 'No --cols property found in style');
    const rows = parseInt(prop);
    return this.#orElseThrow(Number.isNaN(rows) ? null : rows,
        'getColFromGridDiv', `--cols property ${prop} is not a number`);
  }

  getCellDivsFromGridDiv(gridDiv) {
    const fname = 'getCellDivsFromGridDiv';
    if (!gridDiv.children) {
      this.#orElseThrow(null, fname, 'gridDiv does not have any children');
    }
    const result = Array.from(gridDiv.children)
        .filter(x => x.attributes?.getNamedItem('data-cell-idx'));
    return this.#orElseThrow(result.length === 0 ? undefined : result,
        fname, 'Failed to extract cellDivs from gridDiv');
  }

  getCellDivIdx(cellDiv) {
    const dataCellIdx = cellDiv.attributes
        ?.getNamedItem('data-cell-idx')?.value;
    return parseInt(this.#orElseThrow(dataCellIdx, 'getIdFromCellDiv',
        `Failed to parse an integer data cell ID from ${dataCellIdx}`));
  }

  getCellDivContent(cellDiv) {
    const content = cellDiv.querySelector('.trail-cell-content');
    if (content && content.textContent) {
      const parsed = parseInt(content.textContent);
      return this.#orElseThrow(Number.isNaN(parsed) ? null : parsed,
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

  #orElseThrow(result, fname, cause) {
    if (result != null) {
      return result;
    }
    throw new Error(`${fname} failed using ZipDomApiV0: ${cause}`);
  }

}