const button = document.querySelector("button");

chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  const url = tab.url || "";
  const isQueens = url.includes("linkedin.com/games/queens");
  const isZip = url.includes("linkedin.com/games/zip");

  if (isQueens) {
    button.disabled = false;
    button.style.opacity = "1";
    button.style.cursor = "pointer";
    button.addEventListener("click", () => {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          queensPopupButtonOnClick();
        }
      });
    });
  } else if (isZip) {
    button.disabled = false;
    button.style.opacity = "1";
    button.style.cursor = "pointer";
    button.addEventListener("click", () => {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          
        }
      });
    });
  } else {
    button.disabled = true;
    button.style.opacity = "0.5";
    button.style.cursor = "not-allowed";
    button.title = "Must be on linkedin.com/games/{queens|zip}";
  }
});
