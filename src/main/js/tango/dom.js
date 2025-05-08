import { doOneClick, getGridDiv } from '../util.js';
import { learnMarkStrategy } from './markStrategy.js';
import { solveTango } from './solver.js';

export async function autoSolve() {
  const prioritizedApis = [new TangoDomApiV0()];
  for (let i = 0; i < prioritizedApis.length; ) {
    const api = prioritizedApis[i];
    try {
      await api.autoSolve();
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

class TangoDomApi {

  async autoSolve() {
    const gridDiv = this.getTangoGridDiv();
    const cellDivs = this.#getCellDivsFromGridDiv(gridDiv);
    const markStrategy = await learnMarkStrategy(cellDivs, this.cellDivIsBlank);
    const tangoGridArgs =   this.#transformTangoGridDiv(cellDivs, markStrategy);
    const markSequence = solveTango(...tangoGridArgs);
    this.#markCells(cellDivs, markStrategy, markSequence);
  }

  #getCellDivsFromGridDiv(gridDiv) {
    const filtered = Array.from(gridDiv.children)
      .filter(c => this.gridDivChildIsCellDiv(c));
    if (filtered.length === 0) {
      this.orElseThrow(null, 'getCellDivsFromGridDiv', 'gridDiv contained no '
          + 'children that matched cellDiv filter');
    }
    const cellDivs = new Array(filtered.length);
    for (const cellDiv of filtered) {
      cellDivs[this.getCellDivIdx(cellDiv)] = cellDiv;
    }
    return cellDivs;
  }

  #transformTangoGridDiv(cellDivs, markStrategy) {
    const initialYellows = [];
    const initialBlues = [];
    const downEqualSigns = [];
    const downCrosses = [];
    const rightEqualSigns = [];
    const rightCrosses = [];
    for (let i = 0; i < cellDivs.length; i++) {
      const cellDiv = cellDivs[i];
      this.#checkLocked(markStrategy, cellDiv, i, initialYellows, initialBlues);
      this.#checkSignage(cellDiv, i, downEqualSigns, downCrosses,
          rightEqualSigns, rightCrosses);
    }
    return [initialYellows, initialBlues, downEqualSigns, downCrosses,
        rightEqualSigns, rightCrosses];
  }

  #checkLocked(markStrategy, cellDiv, idx, initialYellows, initialBlues) {
    const markExtractor = this.#getMarkExtractor(markStrategy);
    if (this.cellDivIsLocked(cellDiv)) {
      markStrategy.onInitialCell(cellDiv, idx, initialYellows, initialBlues,
          markExtractor);
    }
  }

  #checkSignage(cellDiv, idx, downEqualSigns, downCrosses, rightEqualSigns,
      rightCrosses) {
    let sign;
    if ((sign = this.getCellDivDownSign(cellDiv))) {
      if ('Equal' === sign) {
        downEqualSigns.push(idx);
      } else if ('Cross' === sign) {
        downCrosses.push(idx);
      }
    }
    if ((sign = this.getCellDivRightSign(cellDiv))) {
      if ('Equal' === sign) {
        rightEqualSigns.push(idx);
      } else if ('Cross' === sign) {
        rightCrosses.push(idx);
      }
    }
  }

  #markCells(cellDivs, markStrategy, markSequence) {
    const markExtractor = this.#getMarkExtractor(markStrategy);
    for (const mark of markSequence) {
      const cell = cellDivs[mark.idx];
      const target = mark.color;
      for (let i = markStrategy.getCellDivMark(cell, markExtractor);
          i !== target; i = (i + 1) % 3) {
        doOneClick(cell);
      }
    }
  }

  #getMarkExtractor(markStrategy) {
    const markStrategyType = markStrategy.getMarkStrategyType();
    if ('svgTitle' === markStrategyType) {
      return this.getCellDivSvgTitle;
    } else if ('imgSrc' === markStrategyType) {
      return this.getCellDivImgSrc;
    } else {
      throw new Error('Invalid markStrategyType: ' + markStrategyType);
    }
  }

}

class TangoDomApiV0 extends TangoDomApi {

  getTangoGridDiv() {
    return this.#orElseThrow(getGridDiv(d => d.querySelector('.lotka-grid')),
        'getTangoGridDiv', 'TangoGridDiv selector yielded nothing');
  }

  gridDivChildIsCellDiv(gridDivChild) {
    return gridDivChild.attributes?.getNamedItem('data-cell-idx');
  }

  cellDivIsBlank(cellDiv) {
    return !cellDiv.classList.contains('lotka-cell--locked')
        && cellDiv.querySelector('.lotka-cell-content')
            ?.querySelector('svg')
            ?.classList
            ?.contains('lotka-cell-empty');
  }

  cellDivIsLocked(cellDiv) {
    return cellDiv.classList.contains('lotka-cell--locked');
  }

  getCellDivIdx(cellDiv) {
    const dataCellIdx = cellDiv.attributes
        ?.getNamedItem('data-cell-idx')?.value;
    return parseInt(this.#orElseThrow(dataCellIdx, 'getCellDivIdx',
        `Failed to parse an integer data cell ID from ${dataCellIdx}`));
  }

  getCellDivSvgTitle(cellDiv) {
    return cellDiv.querySelector('.lotka-cell-content')
        ?.querySelector('svg')
        ?.querySelector('title')
        ?.textContent
        ?.toLowerCase();
  }

  getCellDivImgSrc(cellDiv) {
    return cellDiv.querySelector('.lotka-cell-content')
        ?.querySelector('img')
        ?.src;
  }

  getCellDivDownSign(cellDiv) {
    return cellDiv.querySelector('.lotka-cell-edge--down')
        ?.querySelector('svg')
        ?.ariaLabel;
  }

  getCellDivRightSign(cellDiv) {
    return cellDiv.querySelector('.lotka-cell-edge--right')
        ?.querySelector('svg')
        ?.ariaLabel;
  }

  #orElseThrow(result, fname, cause) {
    if (result != null) {
      return result;
    }
    throw new Error(`${fname} failed using QueensDomApiV0: ${cause}`);
  }

}
