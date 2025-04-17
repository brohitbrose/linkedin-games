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

Visit `about:debugging#/runtime/this-firefox` in your Firefox URL bar, then load a temporary extension via `manifest.json`.

### Chrome

Visit `chrome://extensions/` in your Chrome URL bar. With `Developer mode` enabled, load an unpacked extension via the source code's top-level folder.
