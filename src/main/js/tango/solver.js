import { TangoLine } from './line.js';

export function solveTango(gridArgs) {
  return new TangoGrid(...gridArgs).solve();
}

export class TangoGrid {

  // TangoLine[]
  #lines;
  // TangoLineQueue
  #taskQueue;

  constructor(initialYellows, initialBlues,
      downEqualSigns, downCrosses,
      rightEqualSigns, rightCrosses) {

    // Initialize buffers for local fields.
    this.#lines = new Array(12);
    this.#taskQueue = new TangoLineQueue();

    // Initialize argument builders for TangoLines, and add any lines that
    // contain a colored cell to #taskQueue.
    const rowYellows = newEmptyGroup();
    const rowBlues = newEmptyGroup();
    const colYellows = newEmptyGroup();
    const colBlues = newEmptyGroup();
    const rowEqualSigns = newEmptyGroup();
    const colEqualSigns = newEmptyGroup();
    const rowCrosses = newEmptyGroup();
    const colCrosses = newEmptyGroup();
    feedGroups(initialYellows, rowYellows, colYellows, this.#taskQueue);
    feedGroups(initialBlues, rowBlues, colBlues, this.#taskQueue);
    feedGroups(downEqualSigns, undefined, colEqualSigns, this.#taskQueue);
    feedGroups(rightEqualSigns, rowEqualSigns, undefined, this.#taskQueue);
    feedGroups(downCrosses, undefined, colCrosses, this.#taskQueue);
    feedGroups(rightCrosses, rowCrosses, undefined, this.#taskQueue);

    // Initialize the TangoLines.
    for (let i = 0; i < 6; i++) {
      this.#lines[i] = new TangoLine(i, rowYellows[i], rowBlues[i],
          rowEqualSigns[i], rowCrosses[i]);
      this.#lines[i + 6] = new TangoLine(i + 6, colYellows[i], colBlues[i],
          colEqualSigns[i], colCrosses[i]);
    }

    function newEmptyGroup() {
      return [[], [], [], [], [], []];
    }

    function feedGroups(seed, rowGroup, columnGroup, queue) {
      const shouldQueue = rowGroup && columnGroup;
      for (const idx of seed) {
        const c = idx % 6;
        const r = (idx - c) / 6;
        if (rowGroup) {
          rowGroup[r].push(c);
          if (shouldQueue) {
            queue.offer(r);
          }
        }
        if (columnGroup) {
          columnGroup[c].push(r);
          if (shouldQueue) {
            queue.offer(c + 6);
          }
        }
      }
    }

  }

  solve() {
    const markSequence = [];
    while (!this.#taskQueue.isEmpty()) {
      const poll = this.#taskQueue.poll();
      const line = this.#lines[poll];
      const changeList = line.consolidate();
      for (const delta of changeList) {
        this.#onDelta(line, delta, markSequence);
      }
    }
    return markSequence;
  }

  #onDelta(line, delta, markSequence) {
    const isRow = line.getId() < 6;
    // Unpack idx, color from delta, and choose appropriate output list.
    let idx, color;
    if (delta >= 0) {
      idx = delta;
      color = 1;
    } else {
      idx = -(delta + 1);
      color = 2;
    }
    // Update the perpendicular TangoLine.
    const crossLineId = isRow ? 6 + idx : idx;
    const crossLineIdx = isRow ? line.getId() : line.getId() - 6;
    this.#lines[crossLineId].assignColor(crossLineIdx, color);
    // Determine what values to push to the solve() output and taskQueue.
    let resultIdx, offer;
    if (isRow) {
      resultIdx = 6 * crossLineIdx + idx;
      offer = 6 + idx;
    } else {
      resultIdx = 6 * idx + crossLineIdx;
      offer = idx;
    }
    // Update the task queue.
    this.#taskQueue.offer(offer);
    // Perform the push to the solve() output.
    markSequence.push({'color': color, 'idx': resultIdx});
  }

}

/** At-most-once, bit-implemented queue for numbers in [0, 11]. */
export class TangoLineQueue {

  static #CAPACITY = 12;

  #bufferLittle; // bits 0-31
  #bufferBig; // bits 32-47
  #linePresences;
  #size;

  constructor() {
    this.#bufferLittle = 0;
    this.#bufferBig = 0;
    this.#linePresences = 0;
    this.#size = 0;
  }

  // Prerequisite: 0 <= line < CAPACITY
  offer(line) {
    const lineBit = (1 << line);
    if ((this.#linePresences & lineBit) !== 0) {
      return;
    }
    if (this.#size < 8) {
      this.#bufferLittle |= ((line + 1) << (this.#size << 2));
    } else {
      this.#bufferBig |= ((line + 1) << ((this.#size - 8) << 2));
    }
    this.#linePresences |= lineBit;
    this.#size++;
  }

  poll() {
    if (this.isEmpty()) {
      throw new Error("Can't call poll() on empty TangoLineQueue");
    }
    const result = (this.#bufferLittle & 15) - 1;
    this.#bufferLittle = (this.#bufferLittle >>> 4);
    if (this.#size > 8) {
      const carry = this.#bufferBig & 15;
      this.#bufferLittle |= (carry << 28);
      this.#bufferBig = (this.#bufferBig >>> 4);
    }
    // this.#linePresences -= (1 << result); // works, since bit must be set
    this.#linePresences &= ~(1 << result); // pure bitwise alternative
    this.#size--;
    return result;
  }

  isEmpty() {
    return this.#size === 0;
  }

}
