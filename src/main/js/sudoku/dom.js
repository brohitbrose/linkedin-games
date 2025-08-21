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
    const gridDiv = this.getSudokuGridDiv();
    const numberDivs = this.getNumberDivs();
    const [cellDivs, sudokuGrid] = this.#transformSudokuGridDiv(gridDiv);
    const solution = sudokuGrid.solve();
    this.useSolveMode(); // As late as we can to reduce popup interference odds
    this.#clickCells(cellDivs, numberDivs, solution);
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
      if (lockedContent !== 0) {
        sudokuGrid.mark(idx, lockedContent);
      }
    }
    return [cellDivs, sudokuGrid];
  }

  useSolveMode() {
    // First, attempt to grab the "Notes" on/off switch.
    let notesDiv;
    try {
      notesDiv = this.getNotesDiv();
    } catch (e) {
      // If it isn't present, retry after clearing any "Use a hint" popovers.
      const annoyingPopup = this.getAnnoyingPopupDiv();
      this.clearAnnoyingPopup(annoyingPopup);
      notesDiv = this.getNotesDiv(); // May throw
    }
    this.disableNotes(notesDiv);
  }

  #clickCells(cellDivs, numberDivs, solution) {
    for (const [idx, val] of solution) {
      doOneClick(cellDivs[idx]);
      doOneClick(numberDivs[val - 1]);
    }
  }

}

class SudokuDomApiV0 {

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

  getNumberDivs() {
    const wrapper = this.orElseThrow(
        getGridDiv(d => d.querySelector('sudoku-input-buttons__numbers')),
        'getNumberDivs', 'SudokuNumberDiv selector yielded nothing');
    const result = new Array(6).fill(null);
    for (let i = 0; i < 6; i++) {
      const button = this.orElseThrow(wrapper.querySelector(`button[data-number="${i+1}"]`),
        'getNumberDivs', 'Numeric button selector yielded nothing for i=' + i);
      result[i] = button;
    }
    return result;
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

  cellDivIsLocked(cellDiv) {
    return cellDiv.classList.contains('sudoku-cell-prefilled');
  }

  orElseThrow(result, fname, cause) {
    if (result != null) {
      return result;
    }
    throw new Error(`${fname} failed using SudokuDomApiV0: ${cause}`);
  }

}
