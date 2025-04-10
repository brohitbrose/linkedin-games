const button = document.querySelector("button");

const polyfilledBrowser = (typeof browser !== 'undefined') ? browser : chrome;
polyfilledBrowser.tabs.query({ active: true, currentWindow: true })
    .then(([tab]) => {
      const url = tab.url || "";
      const isQueens = url.includes("linkedin.com/games/queens");
      const isZip = url.includes("linkedin.com/games/zip");

      if (isQueens) {
        enableButton(button);
        button.addEventListener("click", () => {
          // TODO: consider more structure in msg arg
          polyfilledBrowser.tabs.sendMessage(tab.id, 0);
        });
      } else if (isZip) {
        enableButton(button);
        button.addEventListener("click", () => {
          polyfilledBrowser.tabs.sendMessage(tab.id, 1);
        });
      } else {
        disableButton(button);
      }
    });

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
