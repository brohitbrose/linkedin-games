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
  // Determine desired clicks.
  const queenLocations = solveQueens(gridCells);
  // Execute desired clicks.
  clickQueens(clickTargets, queenLocations);
}

// Returns the possibly iframe-embedded div corresponding to the Queens grid.
function getQueensGridDiv() {
  return getGridDiv(d => d.getElementById('queens-grid'));
}

// Transforms an appropriate div into a tuple:
// - result[0] is a QueensGrid constructor argument
// - result[1] is a 1D array of the clickable elements in the div.
function transformQueensGridDiv(queensGridDiv) {
  // TODO: consider a flatMap() variant
  const filtered = Array.from(queensGridDiv.children)
      .filter(x => x.attributes && x.attributes.getNamedItem('data-cell-idx'));
  const clickTargets = new Array(filtered.length);
  const arr = filtered.map(x => {
      const nnm = x.attributes;
      const id = parseInt(nnm.getNamedItem('data-cell-idx').value);
      const clazz = nnm.getNamedItem('class').value;
      const colorIdx = clazz.indexOf('cell-color-') + 'cell-color-'.length;
      const color = parseInt(clazz.substring(colorIdx));
      clickTargets[id] = x;
      return {"idx": id, "color": color};
    });
  return [arr, clickTargets];
}

// Synchronously dispatches the computed click events one by one.
// TODO: Consider asynchronicity. Everything through grid.solve() is extremely
//  fast (<1ms). clickQueens() simulates clicking DOM elements 2n times where
//  n is the grid dimenion. This process takes ~5ms on my Mac, but could this
//  be too fast for the site's logic sometimes?
function clickQueens(clickTargets, queenLocations) {
  for (const loc of queenLocations) {
    const clickTarget = clickTargets[loc];
    // Blank -> X
    doOneClick(clickTarget);
    // X -> Queen
    doOneClick(clickTarget);
  }
}

window.queensPopupButtonOnClick = queensPopupButtonOnClick;
