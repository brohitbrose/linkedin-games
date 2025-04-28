# linkedin-games

https://github.com/user-attachments/assets/8c7d7c48-01db-40f8-aa06-ec2156c84417

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

Note that Manifest V3 APIs are used throughout this project's source code.

## Build Instructions

1. `npm install` (at least once, and on changes to `package*.json`)
2. `node build.js` (at least once, and on changes to `src`)

Potential gotchas:

- Unit tests are currently NOT automatically run during the `node build.js` step. See the following subsection for how to run these.
- To avoid needing to manually run `node build.js` all the time, a build server / watcher would be nice. Setting this up seemed like overkill for this simple of a plugin (read: I was lazy), but I'm open to PRs.

### Unit Test Execution Instructions

- `npm test`

## From-Source Browser Installation Instructions

### Firefox

Visit `about:debugging#/runtime/this-firefox` in your Firefox URL bar, then load a temporary extension via `manifest.json`.

### Chrome

Visit `chrome://extensions/` in your Chrome URL bar. With `Developer mode` enabled, load an unpacked extension via the source code's top-level folder.

## Solver Algorithm Overviews

### Queens

The Queens solver uses a comically simple recursive, short-circuiting backtracking algorithm.

```
# Source code sorts by ascending order of cell count, but any order works.
colors := [color1, color2, ..., colorN]
placements := []
backtrack(0, placements)
# By this point, placements contains the desired result.

function backtrack(depth, colors, placements):
  if depth = boardLength:
    return True
  currentColor := colors[depth]
  for cell in currentColor's cells:
    if cell can be marked as a queen:
      mark cell and invalidate row/col/locale
      placements.push(cell)
      shortCircuit := backtrack(depth + 1, placements)
      unmark cell and restore row/col/locale
      if shortCircuit:
        return True
      else:
        placements.pop()
```

Some notes on how we determine queen placement validity:

- With color choice being one-to-one with recursion depth, we do not have to explicitly track color validity.
- The bookkeeping to track row/column validity is trivially handled via boolean array(s) or bitfields.
- For tracking locale validity (i.e. ensuring that all neighboring cells of a placed queen are marked as invalid), notice that row/column validity already handles everything but diagonal neighbors. Thus, we simply tack on a per-cell counter that identifies how many already-placed queens diagonally touch this cell.
The number is at most 2, as in the following example:

```
..000000..
..010100..
..00Q000..
..010201..
..0000Q0..
..000101..
```

### Zip

The Zip solver uses the exact same baseline algorithm as the one for Queens: try exploring in a depth-first manner while abiding by constraints all constraints and backtracking as needed, and short-circuit return whenever we achieve the required depth.

The only noteworthy mention here is a cell degree based *path pruning* strategy atop the *explicit rules* (which are themselves few and really only forbid wall- or self-crossing paths).
See the doc comments for `ZipGrid#canVisitUp` in [solver.js](./src/main/js/zip/solver.js) for a detailed explanation of the pruning strategy.

### Tango

Stay tuned!

<!-- Solving Tango is very easily achievable via backtracking as well, but we opted for an additional challenge: can we code a solution that works with zero guesswork involved,

First, a few observations:

- According to the puzzle page:
   > Each puzzle has one right answer and can be solved via deduction (you should never have to make a guess).
- If a Tango puzzle has a unique solution, then there must be at least one cell marked as a Sun or a Moon.
- Even though a Tango puzzle operates on a *grid*, it is really a constraint satisfaction problem on 12 distinct *lines*.
   - This in no way implies the lines are *independent*; in fact, each of the 6 cells in a line impacts exactly one other line (the perpendicular line that intersects that that cell).
 -->