const button = document.querySelector("button");

// Support both browser.* and chrome.* APIs.
const polyfilledBrowser = (typeof browser !== 'undefined') ? browser : chrome;
polyfilledBrowser.tabs.query({ active: true, currentWindow: true })
    .then(([tab]) => {
      const url = tab.url || "";
      const isQueens = url.includes("linkedin.com/games/queens");
      const isZip = url.includes("linkedin.com/games/zip");

      if (isQueens) {
        enableButtonExecuteScript(button, 'Solve Queens', tab, () => {
          queensPopupButtonOnClick();
        });
      } else if (isZip) {
        enableButtonExecuteScript(button, 'Solve Zip', tab, () => {
          zipPopupButtonOnClick();
        });
      } else {
        disableButton(button);
      }
    });

function enableButtonExecuteScript(button, textContent, tab,
    script) {
  enableButton(button);
  button.textContent = textContent;
  button.addEventListener("click", () => {
    polyfilledBrowser.scripting.executeScript({
      target: { tabId: tab.id },
      func: script
    });
  });
}

function enableButton(button) {
  button.disabled = false;
  button.style.opacity = "1";
  button.style.cursor = "pointer";
}

function disableButton(button) {
  button.disabled = true;
  button.style.opacity = "0.5";
  button.style.cursor = "not-allowed";
  button.title = "Must be on linkedin.com/games/{queens|zip}";
}
