import { doOneMouseCycle } from '../util.js';

export async function learnMarkStrategy(clickableCell, getCellDivIsBlank) {
  const blankCell = await clearCell(clickableCell, getCellDivIsBlank);
  return await exploreMarkStrategy(blankCell, getCellDivIsBlank);
}

async function clearCell(clickableCell, getCellDivIsBlank) {
  return new Promise((resolve, reject) => {
    // If clickableCell is already blank, return it immediately.
    if (getCellDivIsBlank.call(null, clickableCell)) {
      return resolve(clickableCell);
    }
    // Otherwise, wait to return until we've clicked it into a blank state.
    const observer = new MutationObserver(observerCallback);
    const timeoutRef = setTimeout(() => {
      observer.disconnect();
      return reject(new Error('Timed out trying to clear cell'));
    }, 10000);
    let callCount = 0;
    observer.observe(clickableCell, {
      attributes: true,
      attributeFilter: ['src'],
      subtree: true,
      childList: true
    });
    doOneMouseCycle(clickableCell);

    function observerCallback(mutations, observer) {
      if (++callCount >= 30) {
        clearTimeout(timeoutRef);
        observer.disconnect();
        return reject(new Error('Failed to clear cell after 30 clicks'));
      }
      if (getCellDivIsBlank.call(null, clickableCell)) {
        clearTimeout(timeoutRef);
        observer.disconnect();
        return resolve(clickableCell);
      }
      doOneMouseCycle(clickableCell);
    }
  });
}

async function exploreMarkStrategy(blankCell, getCellDivIsBlank) {
  return new Promise((resolve, reject) => {
    // The strategy to return.
    let strategy = undefined;
    // Descriptors of the strategy to return.
    let sunLabel, moonLabel;

    // Instantiate mutation listener that drives strategy learning.
    const observer = new MutationObserver(observerCallback);
    // The number of times observerCallback() has been invoked.
    let callCount = 0;
    // Timeout-based safeguard to prevent hanging if DOM mutations break.
    const timeoutRef = setTimeout(() => {
      observer.disconnect();
      console.error('Timed out learning strategy; fallback to default. Dump:',
          'sunAriaLabel=' + sunLabel + ',',
          'moonAriaLabel=' + moonLabel);
      resolve(new AriaLabelStrategy('Sun', 'Moon', getCellDivIsBlank));
    }, 10000);
    observer.observe(blankCell, {
      attributes: true,
      subtree: true,
      childList: true
    });

    // Kickoff!
    doOneMouseCycle(blankCell);

    function observerCallback(mutations, observer) {
      if (strategy) {
        resolveStrategy(strategy);
        return;
      }
      // Bound the number of times we click the div, even if we learned nothing.
      // 30 click-then-examine cycles should be plenty.
      if (callCount++ >= 30) {
        console.error('Failed to learn strategy within 30 clicks;',
            'falling back to default. Dump:',
            'sunAriaLabel=' + sunLabel + ',',
            'moonAriaLabel=' + moonLabel);
        resolveStrategy(
            new AriaLabelStrategy('Sun', 'Moon', getCellDivIsBlank));
        return;
      }
      for (const mutation of mutations) {
        if (mutation.type !== 'childList') {
          continue;
        }
        for (const node of mutation.addedNodes) {
          tryProcessNode(node);
          // Delay resolve() to next callback iteration in order to guarantee
          // that blankCell is blank by the time the learnStrategy caller uses
          // the result.
          if (strategy) {
            return;
          }
        }
      }

      function tryProcessNode(node) {
        const tagName = node.tagName?.toLowerCase();
        // Only consider IMG or SVG nodes.
        if (tagName && ('img' === tagName || 'svg' === tagName)) {
          const label = node.getAttribute('aria-label');
          if (label) {
            if (!sunLabel) {
              sunLabel = label;
              // Hopefully trigger sun -> moon.
              doOneMouseCycle(blankCell);
            } else if (label !== sunLabel) {
              moonLabel = label;
              // Hopefully trigger moon -> blank.
              doOneMouseCycle(blankCell);
              console.info(`Deduced mark strategy with sunLabel=${sunLabel},`,
                  `moonLabel=${moonLabel}`);
              strategy = new AriaLabelStrategy(
                  sunLabel,
                  moonLabel,
                  getCellDivIsBlank);
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

class AriaLabelStrategy {

  #sunLabel;
  #moonLabel;
  #getCellDivIsBlank;

  constructor(sunLabel, moonLabel, getCellDivIsBlank) {
    this.#sunLabel = sunLabel;
    this.#moonLabel = moonLabel;
    this.#getCellDivIsBlank = getCellDivIsBlank;
  }

  getCellDivColor(cellDiv) {
    if (this.#getCellDivIsBlank.call(null, cellDiv)) {
      return 0;
    }
    const label = this.getCellDivAriaLabel(cellDiv);
    if (this.#sunLabel === label) {
      return 1;
    } else if (this.#moonLabel === label) {
      return 2;
    } else {
      console.error('Failed to deduce color from', cellDiv);
      throw new Error('Failed to deduce color');
    }
  }

  getCellDivAriaLabel(cellDiv) {
    return cellDiv.querySelector('img[aria-label], svg[aria-label]')
        ?.getAttribute('aria-label');
  }

}
