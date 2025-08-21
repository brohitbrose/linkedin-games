// manifest.json handles direct navigation and refreshes, but not single-page
// app navigation to each game. This script provides SPA functionality.

const polyfilledBrowser = (typeof browser !== 'undefined') ? browser : chrome;
const gameScriptMap = {
  '/games/queens': 'queens.js',
  '/games/zip': 'zip.js',
  '/games/tango': 'tango.js',
  '/games/sudoku': 'sudoku.js',
  '/games/mini-sudoku': 'sudoku.js',
  '/games/minisudoku': 'sudoku.js',
};

polyfilledBrowser.webNavigation.onHistoryStateUpdated
    .addListener(({ tabId, url }) => {
      const path = new URL(url).pathname;
      for (const [prefix, script] of Object.entries(gameScriptMap)) {
        if (path.startsWith(prefix)) {
          polyfilledBrowser.scripting.executeScript({
            target: { tabId },
            files: [`${script}`],
          }).catch(err => console.error('Injection failed', err));
        }
      }
    });
