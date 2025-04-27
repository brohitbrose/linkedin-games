import { doOneClick, getGridDiv } from '../util.js';
import { solveTango } from './solver.js';

export function tangoPopupButtonOnClick() {
  // Extract relevant div from page.
  const gridDiv = getTangoGridDiv();
  // div -> [TangoGrid, [div's clickable elements]].
  const gridPkg = transformTangoGridDiv(gridDiv);
  const gridArgs = gridPkg[0];
  const clickTargets = gridPkg[1];
  console.log(JSON.stringify(gridArgs));
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
}

function getTangoGridDiv() {
  return getGridDiv(d => d.querySelector('.lotka-grid'));
}

function transformTangoGridDiv(gridDiv) {

  const filtered = Array.from(gridDiv.children)
      .filter(x => x.attributes && x.attributes.getNamedItem('data-cell-idx'));
  const initialYellows = [];
  const initialBlues = [];
  const downEqualSigns = [];
  const downCrosses = [];
  const rightEqualSigns = [];
  const rightCrosses = [];
  const clickTargets = new Array(filtered.length);

  filtered.forEach(x => {
    const nnm = x.attributes;
    const id = parseInt(nnm.getNamedItem('data-cell-idx').value);
    checkLocked(x, id, initialYellows, initialBlues);
    checkCellEdge(x, id, downEqualSigns, downCrosses, rightEqualSigns,
        rightCrosses);
    clickTargets[id] = x;
  });
  return [[initialYellows, initialBlues, downEqualSigns, downCrosses,
      rightEqualSigns, rightCrosses], clickTargets];

  // Extracts any suns and moons.
  function checkLocked(cellDiv, id, initialYellows, initialBlues) {
    if (cellDiv.classList.contains('lotka-cell--locked')) {
      const title = cellDiv.querySelector('.lotka-cell-content')
          .querySelector('svg')
          .querySelector('title')
          .textContent;
      if ('Sun' === title) {
        initialYellows.push(id);
      } else if ('Moon' === title) {
        initialBlues.push(id);
      } else {
        console.error('Themed puzzles not yet supported; found title=' + title);
      }
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
