import {expect} from '@jest/globals';
import { TangoLine } from 'tango/line.js';

function toConsolidateTo(line, expected) {
  if (!(line instanceof TangoLine)) {
    throw new TypeError('expected TangoLine, found ' + JSON.stringify(line));
  }
  if (!(expected instanceof Array)) {
    throw new TypeError('expected Array, found ' + JSON.stringify(expected));
  }
  const actual = line.consolidate();
  // Array comparison
  if (actual.length !== expected.length) {
    return {
      message: () =>
        `expected ${this.utils.printReceived(
          actual
        )} to have the same size as ${this.utils.printExpected(
          expected
        )}`,
      pass: false
    };
  }
  actual.sort();
  expected.sort();
  for (let i = 0; i < actual.length; i++) {
    if (actual[i] !== expected[i]) {
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
  return {
    message: () =>
      `expected ${this.utils.printReceived(
        actual,
      )} not to equal ${this.utils.printExpected(
        expected
      )}`,
    pass: true,
  };
}

expect.extend({ toConsolidateTo });
