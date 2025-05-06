import { doOneClick, getGridDiv } from '../util.js';
import { solveQueens } from './solver.js';

// Button onClick() logic.
export function queensPopupButtonOnClick() {
  // Extract relevant div from page.
  const gridDiv = getQueensGridDiv();
  // div -> [QueensGrid args, [div's clickable elements]].
  const gridPkg = transformQueensGridDiv(gridDiv);
  const gridCells = gridPkg[0];
  const clickTargets = gridPkg[1];
  const existingMarks = gridPkg[2];
  // Determine desired clicks.
  const queenLocations = solveQueens(gridCells);
  // Execute desired clicks.
  clickQueens(clickTargets, queenLocations, existingMarks);
}

// Returns the possibly iframe-embedded div corresponding to the Queens grid.
function getQueensGridDiv() {
  return getGridDiv(d => d.getElementById('queens-grid'));
}

// Transforms an appropriate div into a tuple:
// - result[0] is a QueensGrid constructor argument
// - result[1] is a 1D array of the clickable elements in the div.
function transformQueensGridDiv(queensGridDiv) {
  const filtered = Array.from(queensGridDiv.children)
      .filter(x => x.attributes && x.attributes.getNamedItem('data-cell-idx'));
  const clickTargets = new Array(filtered.length);
  const existingMarks = new Map();
  const arr = filtered.map(x => {
      const nnm = x.attributes;
      const id = parseInt(nnm.getNamedItem('data-cell-idx').value);
      const clazz = nnm.getNamedItem('class').value;
      const colorIdx = clazz.indexOf('cell-color-') + 'cell-color-'.length;
      const color = parseInt(clazz.substring(colorIdx));
      // Populate returnTuple[1].
      clickTargets[id] = x;
      // Populate returnTuple[2].
      const existingMark = nnm.getNamedItem('aria-label')?.value?.toLowerCase();
      if (existingMark) {
        if (existingMark.includes('queen')) {
          existingMarks.set(id, 2);
        } else if (existingMark.includes('cross')) {
          existingMarks.set(id, 1);
        }
      }
      // Populate returnTuple[0].
      return {"idx": id, "color": color};
    });
  return [arr, clickTargets, existingMarks];
}

// Synchronously dispatches the computed click events one by one.
// TODO: Consider asynchronicity. Everything through grid.solve() is extremely
//  fast (<1ms). clickQueens() simulates clicking DOM elements 2n times where
//  n is the grid dimenion. This process takes ~5ms on my Mac, but could this
//  be too fast for the site's logic sometimes?
function clickQueens(clickTargets, queenLocations, existingMarks) {
  // Transform any cells that must be marked as queens to queens.
  for (const loc of queenLocations) {
    const existingMark = existingMarks.get(loc) ?? 0,
        clickTarget = clickTargets[loc];
    for (let i = existingMark; i < 2; i++) {
      doOneClick(clickTarget);
    }
    existingMarks.delete(loc);
  }
  // Transform any cells that were mistakenly marked as queens to blank. Note
  // that doing these two transformations in this order should work even if
  // "Auto-x" mode is on.
  for (const [key, value] of existingMarks) {
    if (value === 2) {
      doOneClick(clickTargets[key]);
    }
  }
}

window['queensPopupButtonOnClick'] = queensPopupButtonOnClick;
