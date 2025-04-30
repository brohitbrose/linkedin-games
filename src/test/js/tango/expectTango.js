import {expect} from '@jest/globals';
import { TangoGrid } from 'tango/solver.js';
import { TangoLine } from 'tango/line.js';

function toConsolidateTo(line, expected) {
  if (!(line instanceof TangoLine)) {
    throw new TypeError('expected TangoLine, found ' + JSON.stringify(line));
  }
  if (!(expected instanceof Array)) {
    throw new TypeError('expected Array, found ' + JSON.stringify(expected));
  }
  const actual = line.consolidate();
  if (arrayEq(actual, expected)) {
    return {
      message: () =>
        `expected ${this.utils.printReceived(
          actual,
        )} not to equal ${this.utils.printExpected(
          expected
        )}`,
      pass: true,
    };
  } else {
    return {
      message: () =>
        `expected ${this.utils.printReceived(
          actual
        )} to be the same as ${this.utils.printExpected(
          expected
        )}`,
      pass: false
    };
  }
}

function toSolveTo(grid, expectedYellows, expectedBlues) {
  if (!(grid instanceof TangoGrid)) {
    throw new TypeError('expected TangoGrid, found ' + JSON.stringify(grid));
  }
  if (!(expectedYellows instanceof Array)) {
    throw new TypeError('expected Array, found '
        + JSON.stringify(expectedYellows));
  }
  if (!(expectedBlues instanceof Array)) {
    throw new TypeError('expected Array, found '
        + JSON.stringify(expectedBlues));
  }
  const solution = grid.solve();
  const yellows = solution.filter(m => m.color === 1).map(m => m.idx);
  const blues = solution.filter(m => m.color === 2).map(m => m.idx);
  if (!arrayEq(yellows, expectedYellows)) {
    return {
      message: () =>
        `expected ${this.utils.printReceived(
          actualYellows
        )} to be the same as ${this.utils.printExpected(
          expectedYellows
        )}`,
      pass: false
    };
  } else if (!arrayEq(blues, expectedBlues)) {
    return {
      message: () =>
        `expected ${this.utils.printReceived(
          actualBlues
        )} to be the same as ${this.utils.printExpected(
          expectedBlues
        )}`,
      pass: false
    };
  } else {
    return {
      message: () =>
        `expected ${this.utils.printReceived(
          actual
        )} to not solve to yellows=${this.utils.printExpected(
          expectedYellows
        )}, blues=${this.utils.printExpected(
          expectedBlues
        )}`,
      pass: true
    };
  }

}

function arrayEq(actual, expected) {
  if (actual.length !== expected.length) {
    return false;
  }
  actual.sort((a, b) => a - b);
  expected.sort((a, b) => a - b);
  for (let i = 0; i < actual.length; i++) {
    if (actual[i] !== expected[i]) {
      return false;
    }
  }
  return true;
}

expect.extend({ toConsolidateTo });
expect.extend({ toSolveTo });
