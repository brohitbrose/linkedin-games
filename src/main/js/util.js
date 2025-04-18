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

export function doOneClick(clickTarget) {
  const commonClickArgs = { bubbles: true, cancelable: true, view: window};
  clickTarget.dispatchEvent(new MouseEvent('mousedown', commonClickArgs));
  clickTarget.dispatchEvent(new MouseEvent('mouseup', commonClickArgs));
  clickTarget.dispatchEvent(new MouseEvent('click', commonClickArgs));
}
