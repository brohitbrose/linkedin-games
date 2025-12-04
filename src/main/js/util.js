export function getGridDiv(extractFromDocument) {
  let gridDiv = extractFromDocument.call(null, document);
  if (!gridDiv) {
    const frame = document.querySelector('iframe');
    const frameDoc = frame.contentDocument || frame.contentWindow.document;
    gridDiv = extractFromDocument.call(null, frameDoc);
    if (!gridDiv) {
      throw new Error('Could not extract div corresponding to grid');
    }
  }
  return gridDiv;
}

export function doOneMouseCycle(clickTarget) {
  const commonClickArgs = { bubbles: true, cancelable: true, view: window};
  clickTarget.dispatchEvent(new MouseEvent('mousedown', commonClickArgs));
  clickTarget.dispatchEvent(new MouseEvent('mouseup', commonClickArgs));
}

export function doOneClick(clickTarget) {
  const commonClickArgs = { bubbles: true, cancelable: true, view: window};
  clickTarget.dispatchEvent(new MouseEvent('mousedown', commonClickArgs));
  clickTarget.dispatchEvent(new MouseEvent('mouseup', commonClickArgs));
  clickTarget.dispatchEvent(new MouseEvent('click', commonClickArgs));
}

export async function anticipateOneMutation(cellDiv, loc) {
  return new Promise((resolve, reject) => {
    // Timeout-based cleanup (in case no mutations are observed)
    let timeoutRef = setTimeout(() => {
      observer.disconnect();
      console.error('Timed out anticipating mutation on', cellDiv);
      return reject(new Error('Timed out trying to clear cell ' + loc));
    }, 10000);
    // Clean up (including aforementioned timeout) if mutation is observed
    const observer = new MutationObserver(() => {
      clearTimeout(timeoutRef);
      observer.disconnect();
      return resolve();
    });
    // Register the observer
    observer.observe(cellDiv, { attributes: true, childList: true, subtree: true });
    // Kickoff!
    doOneMouseCycle(cellDiv);
  });
}
