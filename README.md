# linkedin-games

A Firefox- and Chrome-compatible browser plugin to solve the daily LinkedIn Games puzzles.
Currently supports Queens and Zip.
Simply click the plugin icon (you may want to pin it) after starting a game, and hit the `Solve` button to cheat.

## Prerequisites

- `node`
- `npm`

## Build Instructions

1. `npm install` (at least once, and on changes to `package*.json`)
2. `node build.js` (at least once, and on changes to `src`)

Setting up a watcher / dev server seemed like overkill for this simple of a plugin, but I'm open to PRs.

## Browser Installation Instructions

### Firefox

Load a temporary extension [here](about:debugging#/runtime/this-firefox) (this link will only work in Firefox) via `manifest.json`.

### Chrome

With `Developer mode` enabled, load an unpacked extension [here](chrome://extensions/) (this link will only work in Chrome) via the top-level directory (probably `linkedin-games`).
