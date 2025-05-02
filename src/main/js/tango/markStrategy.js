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
  const blankCell = seekBlankCell(cells);
  if (!blankCell) {
    throw new Error('Couldn\'t find a blank cell to experiment on; restart the puzzle before trying again');
  }
  
  let yellowTitle, blueTitle, yellowUrl, blueUrl, triggerCount;
  let callbackIteration = 0;
  let willDisconnect = false;
  const observer = new MutationObserver(observerCallback);
  observer.observe(blankCell, {
    attributes: true, attributeFilter: ['src'], subtree: true, childList: true
  });
  doOneClick(blankCell);

  function seekBlankCell(cells) {
    for (const cell of cells) {
      if (!cell.classList.contains('lotka-cell--locked')) {
        return cell;
      }
    }
  }

  function observerCallback(mutations, observer) {
    callbackIteration++;
    // Bound the number of times we click the div.
    if (callbackIteration >= 15) {
      willDisconnect = true;
    }
    for (const mutation of mutations) {
      if (mutation.type !== 'childList') {
        continue;
      }
      // Look for newly added IMG or SVG nodes.
      for (const node of mutation.addedNodes) {
        if (node.nodeName === 'IMG') {
          const src = node.src;
          if (src) {
            if (!yellowUrl) {
              yellowUrl = src;
              doOneClick(blankCell); // Hopefully trigger yellow -> blue.
              break;
            } else if (src !== yellowUrl) {
              blueUrl = src;
              doOneClick(blankCell); // Hopefully trigger blue -> blank.
              willDisconnect = true;
              break;
            }
          }
        } else if (node.nodeType === Node.ELEMENT_NODE
            && node.namespaceURI === 'http://www.w3.org/2000/svg') {
          const title = node.querySelector('title')?.textContent;
          if (title) {
            if (!yellowTitle) {
              yellowTitle = title;
              doOneClick(blankCell); // Hopefully trigger yellow -> blue.
              break;
            } else if (title !== yellowTitle) {
              blueTitle = title;
              doOneClick(blankCell); // Hopefully trigger blue -> blank.
              willDisconnect = true;
              break;
            }
          }
        }
      }
    }
    if (willDisconnect) {
      observer.disconnect();
      let markStrategy;
      if (yellowTitle && blueTitle) {
        markStrategy = new SvgTitleOnInitialCell(yellowTitle, blueTitle);
      } else if (yellowUrl && blueUrl) {
        markStrategy = new ImgSrcOnInitialCell(yellowUrl, blueUrl);
      } else {
        console.error('Failed to learn strategy, falling back; dump: ',
            yellowTitle, blueTitle, yellowUrl, blueUrl);
        markStrategy = new SvgTitleOnInitialCell('Sun', 'Moon');
      }
      onLearn.call(null, markStrategy);
    }
  }

}

class ImgSrcOnInitialCell {
  
  #yellowUrl;
  #blueUrl;

  constructor(yellowUrl, blueUrl) {
    this.#yellowUrl = yellowUrl;
    this.#blueUrl = blueUrl;
  }

  onInitialCell(cellDiv, id, initialYellows, initialBlues) {
    const imgSrc = cellDiv.querySelector('.lotka-cell-content')
        .querySelector('img')
        .src;
    if (imgSrc === this.#yellowUrl) {
      initialYellows.push(id);
    } else if (imgSrc === this.#blueUrl) {
      initialBlues.push(id);
    } else {
      console.warn('Ignored initial cell with unexpected src ' + imgSrc);
    }
  }

}

class SvgTitleOnInitialCell {
  
  #yellowTitle;
  #blueTitle;

  constructor(yellowTitle, blueTitle) {
    this.#yellowTitle = yellowTitle;
    this.#blueTitle = blueTitle;
  }

  onInitialCell(cellDiv, id, initialYellows, initialBlues) {
    const title = cellDiv.querySelector('.lotka-cell-content')
        .querySelector('svg')
        .querySelector('title')
        .textContent;
    if (this.#yellowTitle === title) {
      initialYellows.push(id);
    } else if (this.#blueTitle === title) {
      initialBlues.push(id);
    } else {
      console.warn('Ignored initial cell with unexpected title ' + title);
    }
  }

}
