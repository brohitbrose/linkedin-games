import { doOneClick } from '../util.js';

// Learns how cells identify suns and moons by clicking a blank cell three times
// (blank -> sun, sun -> moon, moon -> blank). Currently, the following are
// recognized:
// - Both sun and moon are indicated by an svg element with a distinct title.
// - Both sun and moon are indicated by an img element with a distinct src url.
// All puzzles so far have fallen into one of these two categories. Trace the
// usage of the yellowTitle and blueTitle variables to learn how to add more
// variations.
export function learnMarkStrategy(cellDivs, doCellDivIsLocked,
    doCellDivIsBlank) {
  return new Promise(async (resolve, reject) => {
    // Prerequisite: at least one blank cell.
    let blankCell;
    try {
      blankCell = await getBlankCell(cellDivs, doCellDivIsLocked,
        doCellDivIsBlank);
    } catch (e) {
      return reject(e);
    }

    // The strategy to return.
    let strategy = undefined;
    // Variables that will determine the strategy to return.
    let yellowTitle, blueTitle, yellowUrl, blueUrl;

    // Instantiate the strategy learner.
    const observer = new MutationObserver(observerCallback);
    // Timeout-based safeguard to prevent hanging if DOM mutations break.
    const timeoutRef = setTimeout(() => {
      observer.disconnect();
      console.error('Timed out learning strategy; fallback to default. Dump:',
          yellowTitle, blueTitle, yellowUrl, blueUrl);
      resolve(new SvgTitleStrategy('Sun', 'Moon'));
    }, 10000);
    // The number of times observerCallback() has been invoked.
    let callCount = 0;
    observer.observe(blankCell, {
      attributes: true,
      attributeFilter: ['src'],
      subtree: true,
      childList: true
    });

    // Kickoff!
    doOneClick(blankCell);

    function observerCallback(mutations, observer) {
      // Bound the number of times we click the div, even if we learned nothing.
      // 10 cycles should be plenty.
      if (++callCount >= 30) {
        console.error('Failed to learn strategy; fallback to default. Dump:',
            yellowTitle, blueTitle, yellowUrl, blueUrl);
        resolveStrategy(new SvgTitleStrategy('Sun', 'Moon'));
        return;
      }
      if (strategy) {
        resolveStrategy(strategy);
        return;
      }
      for (const mutation of mutations) {
        if (mutation.type !== 'childList') {
          continue;
        }
        // Look for newly added IMG or SVG nodes.
        for (const node of mutation.addedNodes) {
          tryProcessNode(node);
          // Don't resolve yet! Notice how in tryProcessNode, we trigger another
          // mutation via doOneClick just before updating strategy. Ensure that
          // this mutation takes place prior to resolving by invoking resolve()
          // in the next callback iteration instead.
          if (strategy) {
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
              // Hopefully trigger yellow -> blue.
              doOneClick(blankCell);
            } else if (src !== yellowUrl) {
              blueUrl = src;
              // Hopefully trigger blue -> blank.
              doOneClick(blankCell);
              strategy = new ImgSrcStrategy(yellowUrl, blueUrl);
            }
          }
        } else if (node.nodeType === Node.ELEMENT_NODE
            && node.namespaceURI === 'http://www.w3.org/2000/svg') {
          let title = node.querySelector('title')?.textContent;
          if (title) {
            title = title.toLowerCase();
            if (!yellowTitle) {
              yellowTitle = title;
              // Hopefully trigger yellow -> blue.
              doOneClick(blankCell);
            } else if (title !== yellowTitle) {
              blueTitle = title;
              // Hopefully trigger blue -> blank.
              doOneClick(blankCell);
              strategy = new SvgTitleStrategy(yellowTitle, blueTitle);
            }
          }
        }
      }

      function resolveStrategy(strategy) {
        observer.disconnect();
        clearTimeout(timeoutRef);
        resolve(strategy);
      }
    }
  });

}

function getBlankCell(cellDivs, doCellDivIsLocked, doCellDivIsBlank) {
  return new Promise((resolve, reject) => {
    let blankableCellDiv;
    for (const cellDiv of cellDivs) {
      if (!doCellDivIsLocked.call(null, cellDiv)) {
        if (doCellDivIsBlank.call(null, cellDiv)) {
          return resolve(cellDiv);
        } else {
          blankableCellDiv = cellDiv;
          break;
        }
      }
    }
    if (!blankableCellDiv) {
      return reject(new Error('All cells locked, nothing is clickable'));
    }

    const observer = new MutationObserver(observerCallback);
    const timeoutRef = setTimeout(() => {
      observer.disconnect();
      reject(new Error('Timed out trying to clear cell'));
    }, 10000);
    let callCount = 0;
    observer.observe(blankableCellDiv, {
      attributes: true,
      attributeFilter: ['src'],
      subtree: true,
      childList: true
    });
    doOneClick(blankableCellDiv);

    function observerCallback(mutations, observer) {
      if (++callCount >= 30) {
        clearTimeout(timeoutRef);
        observer.disconnect();
        return reject(new Error('Failed to clear cell after several clicks'));
      }
      for (const mutation of mutations) {
        if (doCellDivIsBlank.call(null, blankableCellDiv)) {
          clearTimeout(timeoutRef);
          observer.disconnect();
          return resolve(blankableCellDiv);
        }
      }
      doOneClick(blankableCellDiv);
    }

  });
}


class ImgSrcStrategy {
  
  #yellowUrl;
  #blueUrl;

  constructor(yellowUrl, blueUrl) {
    this.#yellowUrl = yellowUrl;
    this.#blueUrl = blueUrl;
  }

  getMarkStrategyType() {
    return 'imgSrc';
  }

  onInitialCell(cellDiv, id, initialYellows, initialBlues, doGetCellDivImgSrc) {
    const mark = this.getCellDivMark(cellDiv, doGetCellDivImgSrc);
    if (mark === 1) {
      initialYellows.push(id);
    } else if (mark === 2) {
      initialBlues.push(id);
    } else {
      console.warn('Ignored initial cell with unexpected src '
          + doGetCellDivImgSrc.call(null, cellDiv));
    }
  }

  getCellDivMark(cellDiv, doGetCellDivImgSrc) {
    const imgSrc = doGetCellDivImgSrc.call(null, cellDiv);
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

  getMarkStrategyType() {
    return 'svgTitle';
  }

  onInitialCell(cellDiv, id, initialYellows, initialBlues,
      doGetCellDivSvgTitle) {
    const mark = this.getCellDivMark(cellDiv, doGetCellDivSvgTitle);
    if (mark === 1) {
      initialYellows.push(id);
    } else if (mark === 2) {
      initialBlues.push(id);
    } else {
      console.warn('Ignored initial cell with unexpected title '
          + doGetCellDivSvgTitle.call(null, cellDiv));
    }
  }

  getCellDivMark(cellDiv, doGetCellDivSvgTitle) {
    const title = doGetCellDivSvgTitle.call(null, cellDiv);
    if (this.#yellowTitle === title) {
      return 1;
    } else if (this.#blueTitle === title) {
      return 2;
    } else {
      return 0;
    }
  }

}
