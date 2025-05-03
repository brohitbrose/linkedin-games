# linkedin-games

https://github.com/user-attachments/assets/8c7d7c48-01db-40f8-aa06-ec2156c84417

A Firefox- and Chrome-compatible browser plugin to solve the daily LinkedIn Games puzzles. Currently supports (note: the links below open https://www.linkedin.com):

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

Visit `about:debugging#/runtime/this-firefox` in your Firefox URL bar, then load a temporary extension via `firefox-dist/manifest.json`.

To ensure that source changes take place, make sure to run `node build.js`, then "Reload" the extension in the aforementioned link.

### Chrome

Visit `chrome://extensions/` in your Chrome URL bar. With `Developer mode` enabled, load an unpacked extension via `chrome-dist/`.

To ensure that source changes take place, make sure to run `node build.js`, then "Refresh" the extension in the aforementioned link.

## Solver Algorithm Overviews

### Queens

<details><summary>(Expand for overview)</summary>

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
- For tracking locale validity (i.e. ensuring that all neighboring cells of a placed queen are marked as invalid), notice that row/column validity already handles everything but diagonal neighbors.
Thus, we simply tack on a per-cell counter that identifies how many already-placed queens diagonally touch this cell.
Any counter is at most 2, as in the following example:

```
. . . . . . . . .
. . 0 0 0 0 0 . .
. . 1 0 1 0 0 . .
. . 0 * 0 0 0 . .
. . 1 0 2 0 1 . .
. . 0 0 0 * 0 . .
. . 0 0 1 0 1 . .
. . . . . . . . .
```

</details>

### Zip

<details><summary>(Expand for overview)</summary>

The Zip solver uses the exact same baseline algorithm as the one for Queens: try exploring in a depth-first manner while abiding by constraints all constraints and backtracking as needed, and short-circuit return whenever we achieve the required depth.

The only noteworthy mention here is a cell degree based *path pruning* strategy atop the *explicit rules* (which are themselves few and really only forbid wall- or self-crossing paths).
See the doc comments for `ZipGrid#canVisitUp` in [solver.js](./src/main/js/zip/solver.js) for a detailed explanation of the pruning strategy.

</details>

### Tango

<details><summary>(Expand for overview)</summary>

Backtracking trivially solves Tango, too--but brute-forcing isn't very satisfying, and we've already done it twice.
Given that LinkedIn promises the following:

- Each puzzle has **one right answer** and can be solved via deduction (you should **never have to make a guess**)

, we implement something more elegant.

#### `consolidateLine()`

Though LinkedIn's definition of a "guess" is not formally specified, we'll assume that we have following guarantee:

- **Invariant A:** For any provided puzzle with $`N`$ blank cells, there exists a sequence of moves $`[m_1, m_2, ..., m_N]`$ that solves the puzzle where each $`m_i`$ indicates the finalizing of some blank cell; furthermore, we can confidently make each $`m_i`$ at least as early as every $`m_{j>i}`$.

This at least gets us started toward a guess-free algorithm: iterate over every blank cell, check if we can confidently mark it, do so if we can, and repeat until no blank cells remain.
But this strategy wastes work; in the early stages of solving a puzzle, most blank cells cannot be marked, and we're checking all of them.
Furthermore, it's quite unbounded as to what the "check if we can confidently mark a blank cell" entails.

It's hard to proceed any further from here without additional assumptions.^(\*)
However, official Tango puzzles seem to always have a stronger guarantee than the one we mentioned:

- **Invariant B:** In addition to Invariant A holding true, every $`m_i`$ can be made at the appropriate time by simply considering either the row or the column that contains it.

_\* Invariant B may always be provably true given Invariant A._
_If this is the case, then Invariant B is just a logical conclusion, not an additional assumption._
_Unfortunately, I lack the mathematical finesse to prove this relationship myself--any takers will be greatly welcome!._

If we assume that Invariant B is true, a far more practical strategy becomes possible.

**Observation:** If we treat all "lines" (rows and columns) in a vacuumn, a blank cell in a line can be deduced _only if_ there is at least one other cell in the line.

This can be proven via contradiction: a line must have exactly one solution; if a line is blank, then both the intended solution and its complement (i.e. flip every Sun/Moon) will satisfy any equality/inequality constraints and the "no-triply-consecutive" requirement.

**Observation:** If a cell isn't currently solvable, then it definitely remains unsolvable unless either its containing row its containing column column receives an update.

Let's assume that we have a `consolidateLine(line)` method that accepts a line, marks every cell that can confidently be marked, then returns the changelist.
The following algorithm provably solves an Invariant B type Tango grid while limiting the number of explored blank cells to only reasonable candidates.

```
lineQueue := [] # duplicate-free queue
for each mark-containing line (markedLine):
  lineQueue.offer(markedLine)

while lineQueue is not empty:
  line := lineQueue.poll()
  newMarkedCells := consolidateLine(line)
  for cell in newMarkedCells:
    perp := orthogonal to line that intersects at cell
    lineQueue.offer(perp)
```

#### Theoretically Optimal Solver

</details>
