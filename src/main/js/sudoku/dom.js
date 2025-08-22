import { doOneClick, getGridDiv } from '../util.js';
import { SudokuGrid } from './solver.js';

export function autoSolve() {
  const prioritizedApis = [new SudokuDomApiV0()];
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

class SudokuDomApi {

  autoSolve() {
    const gameBoardDiv = this.getGameBoardDiv();
    const gridDiv = this.getSudokuGridDiv();
    const numberDivs = this.getNumberDivs();
    const [cellDivs, sudokuGrid] = this.#transformSudokuGridDiv(gridDiv);
    const solution = sudokuGrid.solve();
    this.doSolve(gameBoardDiv, cellDivs, numberDivs, solution);
  }

  #transformSudokuGridDiv(gridDiv) {
    const filtered = Array.from(gridDiv.children)
        .filter(c => this.gridDivChildIsCellDiv(c));
    if (filtered.length === 0) {
      this.orElseThrow(null, 'transformSudokuGridDiv', 'gridDiv contained no '
          + 'children that matched cellDiv filter');
    }
    const cellDivs = new Array(filtered.length);
    const sudokuGrid = new SudokuGrid(6, 3, 2);
    for (const cellDiv of filtered) {
      const idx = this.getCellDivIdx(cellDiv);
      cellDivs[idx] = cellDiv;
      const lockedContent = this.getLockedContent(cellDiv);
      if (lockedContent > 0) {
        sudokuGrid.mark(idx, lockedContent);
      }
    }
    return [cellDivs, sudokuGrid];
  }

  doSolve(gameBoardDiv, cellDivs, numberDivs, solution) {
    // First, attempt to grab the "Notes" on/off switch.
    let syncNotesDiv;
    try {
      syncNotesDiv = this.getNotesDiv();
    } catch (e) {
      // If it isn't present, retry after clearing any "Use a hint" popovers.
      const annoyingPopup = this.getAnnoyingPopupDiv();

      let timeoutRef;
      // Define the observer callback.
      const observerCallback = (mutations, observer) => {
        for (const mutation of mutations) {
          if (this.mutationCreatesNotesToggle(mutation)) {
            clearTimeout(timeoutRef);
            observer.disconnect();
            const notesDiv = this.getNotesDiv();
            this.disableNotes(notesDiv);
            this.#clickCells(cellDivs, numberDivs, solution);
            return;
          }
        }
      }
      // Bind callback to observer.
      const observer = new MutationObserver(observerCallback);
      timeoutRef = setTimeout(() => {
        observer.disconnect();
        console.error('Timed out awaiting Notes toggle mutation');
      }, 10000);
      observer.observe(gameBoardDiv, {
        attributes: true,
        attributeFilter: ['class'],
        subtree: true,
        childList: true
      });

      // Trigger potential mutations.
      this.clearAnnoyingPopup(annoyingPopup);
    }
    if (syncNotesDiv) {
      this.disableNotes(syncNotesDiv);
      this.#clickCells(cellDivs, numberDivs, solution);
    }
  }

  #clickCells(cellDivs, numberDivs, solution) {
    for (const packed of solution) {
      const idx = packed.idx;
      const val = packed.val;
      doOneClick(cellDivs[idx]);
      doOneClick(numberDivs[val - 1]);
    }
  }

}

class SudokuDomApiV0 extends SudokuDomApi {

  getGameBoardDiv() {
    return this.orElseThrow(
        getGridDiv(d => d.querySelector('.game-board.grid-board-wrapper')),
        'getGameBoardDiv', 'SudokuGameBoardDiv selector yielded nothing');
  }

  getSudokuGridDiv() {
    return this.orElseThrow(
        getGridDiv(d => d.querySelector('.grid-game-board')),
        'getSudokuGridDiv', 'SudokuGridDiv selector yielded nothing');
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

  gridDivChildIsCellDiv(childDiv) {
    return childDiv.attributes?.getNamedItem('data-cell-idx');
  }

  getCellDivIdx(cellDiv) {
    const dataCellIdx = cellDiv.attributes
        ?.getNamedItem('data-cell-idx')?.value;
    return parseInt(this.orElseThrow(dataCellIdx, 'getIdFromCellDiv',
        `Failed to parse an integer data cell ID from ${dataCellIdx}`));
  }

  getLockedContent(cellDiv) {
    if (this.cellDivIsLocked(cellDiv)) {
      const content = cellDiv.querySelector('.sudoku-cell-content');
      if (content && content.textContent) {
        const parsed = parseInt(content.textContent);
        return this.orElseThrow(Number.isNaN(parsed) ? null : parsed,
            'getLockedContent', `Expected number, found ${content.textContent}`);
      }
    }
    return -1;
  }

  cellDivIsLocked(cellDiv) {
    return cellDiv.classList.contains('sudoku-cell-prefilled');
  }

  getNumberDivs() {
    const wrapper = this.orElseThrow(
        getGridDiv(d => d.querySelector('.sudoku-input-buttons__numbers')),
        'getNumberDivs', 'SudokuNumberDiv selector yielded nothing');
    const result = new Array(6).fill(null);
    for (let i = 0; i < 6; i++) {
      const button = this.orElseThrow(wrapper.querySelector(`button[data-number="${i+1}"]`),
        'getNumberDivs', 'Numeric button selector yielded nothing for i=' + i);
      result[i] = button;
    }
    return result;
  }

  mutationCreatesNotesToggle(mutation) {
    return mutation.target.classList.contains('sudoku-under-board-controls-container');
  }

  getNotesDiv() {
    return this.orElseThrow(
        getGridDiv(d => d.querySelector('.sudoku-under-board-controls-container')),
        'getNotesDiv', 'NotesDiv selector yielded nothing');
  }

  disableNotes(notesDiv) {
    const activeSpan = this.orElseThrow(notesDiv.querySelector('span'),
        'disableNotes', 'NotesStatus selector yielded nothing');
    const text = activeSpan.textContent.trim().toLowerCase();
    this.orElseThrow(text, 'disableNotes', 'Could not determine Notes mode status');
    if ('on' === text) {
      const toggle = this.orElseThrow(notesDiv.querySelector('div[aria-label*="notes" i]'),
          'disableNotes', 'NotesToggle selector yielded nothing');
      doOneClick(toggle);
    }
  }

  getAnnoyingPopupDiv() {
    return this.orElseThrow(
        getGridDiv(d => d.querySelector('.sudoku-under-board-scrim-message')),
        'getAnnoyingPopupDiv', 'AnnoyingPopupDiv selector yielded nothing');
  }

  clearAnnoyingPopup(popupDiv) {
    const button = popupDiv.querySelector('button[aria-label*="close" i]');
    doOneClick(this.orElseThrow(button, 'clearAnnoyingPopup',
        'Could not extract hint popup close button'));
  }

  orElseThrow(result, fname, cause) {
    if (result != null) {
      return result;
    }
    throw new Error(`${fname} failed using SudokuDomApiV0: ${cause}`);
  }

}
