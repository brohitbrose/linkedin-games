const button = document.querySelector("button");

// Support both browser.* and chrome.* APIs.
const polyfilledBrowser = (typeof browser !== 'undefined') ? browser : chrome;
polyfilledBrowser.tabs.query({ active: true, currentWindow: true })
    .then(([tab]) => {
      const url = tab.url || "";
      const isQueens = url.includes("linkedin.com/games/queens");
      const isZip = url.includes("linkedin.com/games/zip");
      const isTango = url.includes("linkedin.com/games/tango");
      const isSudoku = url.includes("linkedin.com/games/sudo")
          || url.includes("linkedin.com/games/mini-sudo")
          || url.includes("linkedin.com/games/minisudo");

      if (isQueens) {
        enableButtonExecuteScript(button, 'Solve Queens', tab, () => {
          queensPopupButtonOnClick();
        });
      } else if (isZip) {
        enableButtonExecuteScript(button, 'Solve Zip', tab, () => {
          zipPopupButtonOnClick();
        });
      } else if (isTango) {
        enableButtonExecuteScript(button, 'Solve Tango', tab, () => {
          tangoPopupButtonOnClick();
        });
      } else if (isSudoku) {
        enableButtonExecuteScript(button, 'Solve Pseudoku', tab, () => {
          sudokuPopupButtonOnClick();
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
  button.title = "Not currently visiting supported Linkedin game URL";
}
