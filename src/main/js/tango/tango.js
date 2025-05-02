import { doOneClick, getGridDiv } from '../util.js';
import { solveTango } from './solver.js';
import { learnMarkStrategy } from './markStrategy.js';

export function tangoPopupButtonOnClick() {
  // Extract relevant div from page.
  const gridDiv = getTangoGridDiv();
  // From the div, just retain the 'data-cell-idx' elements.
  const cells = Array.from(gridDiv.children)
      .filter(x => x.attributes && x.attributes.getNamedItem('data-cell-idx'));
  // First, learn what identifies a cell as a Sun vs a Moon (unfortunately this
  // is not 100% set in stone due to the existence of themed puzzles). Only once
  // the strategy has been determined, proceed as usual.
  learnMarkStrategy(cells, markStrategy => {
    // div -> [TangoGrid, [div's clickable elements]].
    const gridPkg = transformTangoGridDiv(cells, markStrategy);
    const gridArgs = gridPkg[0];
    const clickTargets = gridPkg[1];
    // Determine desired clicks.
    const markSequence = solveTango(gridArgs);
    // Execute desired clicks.
    for (const mark of markSequence) {
      const divToMark = clickTargets[mark.idx];
      if (mark.color === 1) {
        markSun(divToMark);
      } else if (mark.color === 2) {
        markMoon(divToMark);
      }
    }
  });
}

function getTangoGridDiv() {
  return getGridDiv(d => d.querySelector('.lotka-grid'));
}

function transformTangoGridDiv(cells, markStrategy) {

  const initialYellows = [];
  const initialBlues = [];
  const downEqualSigns = [];
  const downCrosses = [];
  const rightEqualSigns = [];
  const rightCrosses = [];
  const clickTargets = new Array(cells.length);

  cells.forEach(cell => {
    const nnm = cell.attributes;
    const id = parseInt(nnm.getNamedItem('data-cell-idx').value);
    checkLocked(markStrategy, cell, id, initialYellows, initialBlues);
    checkCellEdge(cell, id, downEqualSigns, downCrosses, rightEqualSigns,
        rightCrosses);
    clickTargets[id] = cell;
  });
  return [[initialYellows, initialBlues, downEqualSigns, downCrosses,
      rightEqualSigns, rightCrosses], clickTargets];

  // Extracts any suns and moons.
  function checkLocked(strategy, cellDiv, id, initialYellows, initialBlues) {
    if (cellDiv.classList.contains('lotka-cell--locked')) {
      strategy.onInitialCell(cellDiv, id, initialYellows, initialBlues);
    }
  }

  // Extracts any equal signs and crosses.
  function checkCellEdge(cellDiv, id, downEqualSigns, downCrosses,
        rightEqualSigns, rightCrosses) {
    checkCellEdgeDirection('.lotka-cell-edge--down', cellDiv, id,
        downEqualSigns, downCrosses);
    checkCellEdgeDirection('.lotka-cell-edge--right', cellDiv, id,
        rightEqualSigns, rightCrosses);

    function checkCellEdgeDirection(clazz, cellDiv, id, equalSigns, crosses) {
      const direction = cellDiv.querySelector(clazz);
      if (direction) {
        const label = direction.querySelector('svg').ariaLabel;
        if ('Equal' === label) {
          equalSigns.push(id);
        } else if ('Cross' === label) {
          crosses.push(id);
        }
      }
    }

  }

}

function markSun(cellDiv) {
  doOneClick(cellDiv);
}

function markMoon(cellDiv) {
  doOneClick(cellDiv);
  doOneClick(cellDiv);
}

window.tangoPopupButtonOnClick = tangoPopupButtonOnClick;
