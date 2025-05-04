import { TangoLine } from 'tango/line.js';
import './expectTango.js';

test('Strategic solver is equivalent to brute-force', () => {
  for (const seed of generateEncodedBinaryFromTernary()) {
    let bruteForceLine, strategicLine;
    // If constructing bruteForce throws an exception, constructing strategic
    // definitely will.
    try {
      bruteForceLine = SimpleLine.fromSeed(seed);
    } catch (e) {
      expect(() => tangoLineFromSeed(seed)).toThrow();
      continue;
    }
    // If constructing strategic throws an exception, then bruteForce better
    // not yield any values (assuming it didn't throw create-time exception).
    try {
      strategicLine = tangoLineFromSeed(seed);
    } catch (e) {
      expect(simpleConsolidate(bruteForceLine)).toEqual([]);
      continue;
    }
    // If strategic throws exception during consolidation, then bruteForce
    // better not yield any values.
    let strategicLineCopy;
    try {
      strategicLineCopy = tangoLineFromSeed(seed);
      strategicLineCopy.consolidate();
    } catch (e) {
      expect(simpleConsolidate(bruteForceLine)).toEqual([]);
      continue;
    }
    // In all other cases, strategic's consolidation should be the same as
    // bruteForce's.
    expect(strategicLine).toConsolidateTo(simpleConsolidate(bruteForceLine));
  }
});

function* generateEncodedBinaryFromTernary() {
  const max = 3 ** 11;

  for (let n = 0; n < max; n++) {
    let encoded = 0;
    let shift = 0;
    let x = n;

    while (x > 0) {
      const trit = x % 3;
      let bits;
      switch (trit) {
        case 0: bits = 0b00; break;
        case 1: bits = 0b01; break;
        case 2: bits = 0b10; break;
      }
      encoded |= (bits << shift);
      shift += 2;
      x = Math.floor(x / 3);
    }

    yield encoded;
  }
}

function simpleConsolidate(line) {
  if (line.coloredCellCount() === 6) {
    return [];
  }
  const results = [];
  backtrack(line, -1, results);
  if (results.length === 0) {
    return [];
  }
  const seed = line.toSeedMask();
  let initial = 2 ** 12 - 1;
  // Turn off the originally present numbers
  for (let i = 0; i < 6; i++) {
    initial -= (line.getColor(i) << (i << 1));
  }
  for (const result of results) {
    initial &= result;
  }
  const result = [];
  let i = 0;
  while (initial !== 0) {
    const color = initial & 3;
    if (color === 1) {
      result.push(i);
    } else if (color === 2) {
      result.push(-(i + 1));
    }
    initial = initial >>> 2;
    i++;
  }
  return result;
}

function backtrack(line, lastColoredIdx, results) {
  if (line.coloredCellCount() === 6) {
    results.push(line.toMarkMask());
    return;
  }
  // Seek to first non-colored idx
  let i = lastColoredIdx + 1;
  for ( ; i < 6; i++) {
    if (line.getColor(i) === 0) {
      break;
    }
  }
  if (i == 6) {
    throw new Error("assertion");
  }
  let foundAny = false;
  if (line.color(i, 1)) {
    foundAny = true;
    backtrack(line, i, results);
    line.uncolor(i);
  }
  if (line.color(i, 2)) {
    foundAny = true;
    backtrack(line, i, results);
    line.uncolor(i);
  }
  if (!foundAny) {
    return;
  }
}

function tangoLineFromSeed(seed) {
  const yellowCells = [],
      blueCells = [],
      equalSigns = [],
      crosses = [];
  for (let i = 0; i < 6; i++) {
    const data = seed & 0x3;
    if (data === 1) {
      yellowCells.push(i);
    } else if (data === 2) {
      blueCells.push(i);
    } else if (data !== 0) {
      throw new Error("Fixme strategic");
    }
    seed = seed >>> 2;
  }
  for (let i = 0; i < 5; i++) {
    const data = seed & 0x3;
    if (data === 1) {
      equalSigns.push(i);
    } else if (data === 2) {
      crosses.push(i);
    } else if (data !== 0) {
      throw new Error("FIXME STRATEGIC");
    }
    seed = seed >>> 2;
  }
  return new TangoLine(0, yellowCells, blueCells, equalSigns, crosses);
}

export class SimpleLine {

  static #EMPTY_COLOR = 0;
  static #YELLOW_COLOR = 1;
  static #BLUE_COLOR = 2;
  static #DIMENSION = 6;

  #cellColors;
  #signs
  #yellowCount;
  #blueCount;

  constructor(cellColors, signs) {

    if (cellColors.length !== SimpleLine.#DIMENSION) {
      throw new Error("cellColors must have length 6, provided " + cellColors);
    }
    if (signs.length !== 5) {
      throw new Error("signs must have length 5, provided " + signs);
    }

    this.#cellColors = cellColors;
    this.#signs = signs;
    this.#yellowCount = 0;
    this.#blueCount = 0;
    for (const color of cellColors) {
      if (color === SimpleLine.#YELLOW_COLOR) {
        this.#yellowCount++;
      } else if (color === SimpleLine.#BLUE_COLOR) {
        this.#blueCount++;
      } else if (color !== SimpleLine.#EMPTY_COLOR) {
        throw new Error("Found invalid color " + color);
      }
    }
    for (const sign of signs) {
      if (sign < 0 || sign > 2) {
        throw new Error("Found invalid sign " + sign);
      }
    }

    this.validate();

  }

  getColor(idx) {
    return this.#cellColors[idx];
  }

  getYellowCount() {
    return this.#yellowCount;
  }

  getBlueCount() {
    return this.#blueCount;
  }

  color(idx, color) {
    const oldColor = this.#cellColors[idx];
    if (oldColor !== SimpleLine.#EMPTY_COLOR) {
      return false;
    }
    this.#cellColors[idx] = color;
    if (color === SimpleLine.#YELLOW_COLOR) {
      this.#yellowCount++;
    } else if (color === SimpleLine.#BLUE_COLOR) {
      this.#blueCount++;
    } else {
      return false;
    }
    try {
      this.validate();
    } catch (e) {
      this.uncolor(idx);
      return false;
    }
    return true;
  }

  uncolor(idx) {
    const color = this.#cellColors[idx];
    if (color === SimpleLine.#YELLOW_COLOR) {
      this.#yellowCount--;
    } else if (color === SimpleLine.#BLUE_COLOR) {
      this.#blueCount--;
    } else {
      throw new Error("Tried to uncolor cell " + idx + " with unexexpected color " + color);
    }
    this.#cellColors[idx] = SimpleLine.#EMPTY_COLOR;
  }

  validate() {
    // Validate color counts
    if (this.#yellowCount > 3) {
      throw new Error("Too many yellow: " + this.#cellColors);
    }
    if (this.#blueCount > 3) {
      throw new Error("Too many blue: " + this.#cellColors);
    }
    // Validate run lengths < 3
    for (let i = 0; i < this.#cellColors.length - 2; i++) {
      const color = this.#cellColors[i];
      if (color !== SimpleLine.#EMPTY_COLOR
          && color === this.#cellColors[i + 1]
          && color === this.#cellColors[i + 2]) {
        throw new Error("Too many same-color consecutives: " + this.#cellColors);
      }
    }
    // Validate signs
    for (let i = 0; i < SimpleLine.#DIMENSION; i++) {
      const sign = this.#signs[i];
      const before = this.#cellColors[i];
      const after = this.#cellColors[i + 1];
      if (sign === 1 && before * after === 2) {
        throw new Error("Equal sign condition not upheld at index " + sign);
      } else if (sign === 2 && (before * after === 1 || before * after === 4)) {
        throw new Error("Cross sign condition not upheld at index " + sign);
      }
    }
  }

  coloredCellCount() {
    return this.#yellowCount + this.#blueCount;
  }

  static fromSeed(seed) {
    const cellColors = new Array(6).fill(0);
    const signs = new Array(5).fill(0);
    for (let i = 0; i < 6; i++) {
      const data = seed & 0x3;
      if (data === SimpleLine.#YELLOW_COLOR || data === SimpleLine.#BLUE_COLOR) {
        cellColors[i] = data;
      } else if (data !== SimpleLine.#EMPTY_COLOR) {
        throw new Error("Fixme");
      }
      seed = seed >>> 2;
    }
    for (let i = 0; i < 5; i++) {
      const data = seed & 0x3;
      if (data === 1 || data === 2) {
        signs[i] = data;
      } else if (data !== 0) {
        throw new Error("FIXME");
      }
      seed = seed >>> 2;
    }
    return new SimpleLine(cellColors, signs);
  }

  toMarkMask() {
    let mask = 0;
    for (let i = 0; i < SimpleLine.#DIMENSION; i++) {
      mask |= (this.getColor(i) << (i << 1));
    }
    return mask;
  }

  toSeedMask() {
    let mask = 0;
    for (let i = 0; i < SimpleLine.#DIMENSION; i++) {
      mask |= (this.getColor(i) << (i << 1));
    }
    for (let i = 0; i < SimpleLine.#DIMENSION - 1; i++) {
      mask |= (this.#signs[i] << ((i + 6) << 1));
    }
    return mask;
  }

  debug() {
    console.log(JSON.stringify({
      cellColors: this.#cellColors,
      signs: this.#signs,
    }));
  }

}
