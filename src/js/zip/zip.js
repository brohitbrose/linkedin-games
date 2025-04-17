import { doOneClick, getGridDiv } from '../util.js';
import { solveZip } from './solver.js';

export function zipPopupButtonOnClick() {
  // Extract relevant div from page.
  const gridDiv = getZipGridDiv();
  // div -> [ZipGrid, [div's clickable elements]].
  const gridPkg = transformZipGridDiv(gridDiv);
  const gridArgs = gridPkg[0];
  const clickTargets = gridPkg[1];
  // Determine desired clicks.
  const cellSequence = solveZip(gridArgs);
  // Execute desired clicks.
  visitCells(clickTargets, compressedSequence);
}

// Returns the possibly iframe-embedded div corresponding to the Zip grid.
function getZipGridDiv() {
  return getGridDiv(d => document.querySelector(".grid-game-board"));
}

// Transforms the div containing the Zip grid into a tuple:
// - result[0] is the set of ZipGrid constructor arguments
// - result[1] is a 1D array of the clickable elements in the div.
function transformZipGridDiv(zipGridDiv) {
  const rows = parseInt(zipGridDiv.style.getPropertyValue("--rows"));
  const cols = parseInt(zipGridDiv.style.getPropertyValue("--cols"));
  const numberedCells = [];
  const downWalls = [];
  const rightWalls = [];
  
  const filtered = Array.from(zipGridDiv.children)
      .filter(x => x.attributes && x.attributes.getNamedItem("data-cell-idx"));
  const clickTargets = new Array(filtered.length);

  filtered.forEach(x => {
    const nnm = x.attributes;
    const id = parseInt(nnm.getNamedItem('data-cell-idx').value);
    // Handle circled number.
    const content = x.querySelector('.trail-cell-content');
    if (content) {
      const circledNumber = parseInt(content.textContent);
      numberedCells[circledNumber - 1] = id;
    }
    // Handle down wall
    const downWall = x.querySelector('.trail-cell-wall--down');
    if (downWall) {
      downWalls.push(id);
    }
    // Handle right wall.
    const rightWall = x.querySelector('.trail-cell-wall--right')
    if (rightWall) {
      rightWalls.push(id);
    }
    clickTargets[id] = x;
  });
  return [
    [rows, cols, numberedCells, downWalls, rightWalls],
    clickTargets
  ];
}

// Synchronously dispatches the computed click events one by one.
function visitCells(clickTargets, cellSequence) {
  for (const loc of cellSequence) {
    const clickTarget = clickTargets[loc];
    doOneClick(clickTarget);
  }
}

window.zipPopupButtonOnClick = zipPopupButtonOnClick;
