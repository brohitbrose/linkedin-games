# linkedin-games

A Firefox- and Chrome-compatible browser plugin to solve daily LinkedIn Games puzzles. Currently supports (note: the links below open https://www.linkedin.com):

- [Queens](https://www.linkedin.com/games/queens/)
- [Zip](https://www.linkedin.com/games/zip/)
- [Tango](https://www.linkedin.com/games/tango/)

Stay tuned for more!

## Usage (Post-Installation)

Simply click the plugin's icon in your toolbar (you may want to pin the plugin for convenience) after starting a game, and hit the `Solve` button to cheat.

## Prerequisites

- `node`
- `npm`

Note that Manifest V3 APIs are used throughout this project.

## Build Instructions

1. `npm install` (at least once, and on changes to `package*.json`)
2. `node build.js` (at least once, and on changes to `src`)

Potential gotchas:

- Unit tests are currently NOT automatically run during the `node build.js` step. See the following subsection for how to run these.
- To avoid needing to manually run `node build.js` all the time, a build server / watcher would be nice. Setting this up seemed like overkill for this simple of a plugin (read: I was lazy), but I'm open to PRs.

### Unit Test Execution Instructions

- `npm test`

## Browser Installation Instructions

### Firefox

Visit `about:debugging#/runtime/this-firefox` in your Firefox URL bar, then load a temporary extension via `manifest.json`.

### Chrome

Visit `chrome://extensions/` in your Chrome URL bar. With `Developer mode` enabled, load an unpacked extension via the source code's top-level folder.
