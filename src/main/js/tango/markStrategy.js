import { doOneClick } from '../util.js';

// Learns how cells identify suns and moons by clicking a blank cell three times
// (blank -> sun, sun -> moon, moon -> blank). Currently, the following are
// recognized:
// - Both sun and moon are indicated by an svg element with a distinct title.
// - Both sun and moon are indicated by an img element with a distinct src url.
// All puzzles so far have fallen into one of these two categories. Trace the
// usage of the yellowTitle and blueTitle variables to learn how to add more
// variations.
export function learnMarkStrategy(cells, onLearn) {
  const blankCell = cells.find(cell =>
      !cell.classList.contains('lotka-cell--locked')
          && cell.querySelector('.lotka-cell-content')
              ?.querySelector('svg')
              ?.classList
              ?.contains('lotka-cell-empty'));
  if (!blankCell) {
    throw new Error('Couldn\'t find a blank cell to experiment on; clear the puzzle before trying again');
  }
  
  let yellowTitle, blueTitle, yellowUrl, blueUrl;
  let mutationCallbackCount = 0;
  let onNextMutationStrategy = undefined;
  let willDisconnect = false;
  const observer = new MutationObserver(observerCallback);
  observer.observe(blankCell, {
    attributes: true, attributeFilter: ['src'], subtree: true, childList: true
  });
  doOneClick(blankCell);

  function observerCallback(mutations, observer) {
    // Bound the number of times we click the div, even if we learned nothing.
    if (++mutationCallbackCount >= 9) {
      console.error('Failed to learn strategy; fallback to default. Dump:',
          yellowTitle, blueTitle, yellowUrl, blueUrl);
      employStrategy(new SvgTitleStrategy('Sun', 'Moon'));
      return;
    }
    if (onNextMutationStrategy) {
      employStrategy(onNextMutationStrategy);
      return;
    }
    for (const mutation of mutations) {
      if (mutation.type !== 'childList') {
        continue;
      }
      // Look for newly added IMG or SVG nodes.
      for (const node of mutation.addedNodes) {
        tryProcessNode(node);
        if (onNextMutationStrategy) {
          return;
        }
      }
    }

    function tryProcessNode(node) {
      if (node.nodeName === 'IMG') {
        const src = node.src;
        if (src) {
          if (!yellowUrl) {
            yellowUrl = src;
            doOneClick(blankCell); // Hopefully trigger yellow -> blue.
          } else if (src !== yellowUrl) {
            blueUrl = src;
            doOneClick(blankCell); // Hopefully trigger blue -> blank.
            onNextMutationStrategy = new ImgSrcStrategy(yellowUrl, blueUrl);
          }
        }
      } else if (node.nodeType === Node.ELEMENT_NODE
          && node.namespaceURI === 'http://www.w3.org/2000/svg') {
        const title = node.querySelector('title')?.textContent;
        if (title) {
          if (!yellowTitle) {
            yellowTitle = title;
            doOneClick(blankCell); // Hopefully trigger yellow -> blue.
          } else if (title !== yellowTitle) {
            blueTitle = title;
            doOneClick(blankCell); // Hopefully trigger blue -> blank.
            onNextMutationStrategy = new SvgTitleStrategy(yellowTitle, blueTitle);
          }
        }
      }
    }

    function employStrategy(strategy) {
      observer.disconnect();
      onLearn.call(null, strategy);
    }
  }
}

class ImgSrcStrategy {
  
  #yellowUrl;
  #blueUrl;

  constructor(yellowUrl, blueUrl) {
    this.#yellowUrl = yellowUrl;
    this.#blueUrl = blueUrl;
  }

  onInitialCell(cellDiv, id, initialYellows, initialBlues) {
    const mark = this.getCellDivMark(cellDiv);
    if (mark === 1) {
      initialYellows.push(id);
    } else if (mark === 2) {
      initialBlues.push(id);
    } else {
      console.warn('Ignored initial cell with unexpected src ' + imgSrc);
    }
  }

  getCellDivMark(cellDiv) {
    const imgSrc = cellDiv.querySelector('.lotka-cell-content')
        ?.querySelector('img')
        ?.src;
    if (imgSrc === this.#yellowUrl) {
      return 1;
    } else if (imgSrc === this.#blueUrl) {
      return 2;
    } else {
      return 0;
    }
  }

}

class SvgTitleStrategy {
  
  #yellowTitle;
  #blueTitle;

  constructor(yellowTitle, blueTitle) {
    this.#yellowTitle = yellowTitle;
    this.#blueTitle = blueTitle;
  }

  onInitialCell(cellDiv, id, initialYellows, initialBlues) {
    const mark = this.getCellDivMark(cellDiv);
    if (mark === 1) {
      initialYellows.push(id);
    } else if (mark === 2) {
      initialBlues.push(id);
    } else {
      console.warn('Ignored initial cell with unexpected title ' + title);
    }
  }

  getCellDivMark(cellDiv) {
    const title = cellDiv.querySelector('.lotka-cell-content')
        ?.querySelector('svg')
        ?.querySelector('title')
        ?.textContent;
    if (this.#yellowTitle === title) {
      return 1;
    } else if (this.#blueTitle === title) {
      return 2;
    } else {
      return 0;
    }
  }

}
