import { TangoGrid, TangoLineQueue } from 'tango/solver.js';
import { TangoLine } from 'tango/line.js';
import './expectTango.js';

test('Valid basic line constructs', () => {
  expect(new TangoLine(0, [], [], [], [])).toEqual(expect.any(TangoLine));
  expect(new TangoLine(0, [0, 2, 0, 2], [1, 3, 3, 1], [], []))
      .toEqual(expect.any(TangoLine));
});

test('Invalid line construction errors', () => {
  // Overlapping yellow and blue
  expect(() => new TangoLine(0, [0], [0], [], [])).toThrow();
  // Too many yellow
  expect(() => new TangoLine(0, [0, 1, 2, 3], [], [], [])).toThrow();
  // Too many blue
  expect(() => new TangoLine(0, [], [0, 1, 2, 3], [], [])).toThrow();
  // 
});

test('Line autosolves valid three of color', () => {
  expect(new TangoLine(0, [0, 2, 4], [], [], []))
      .toConsolidateTo([-6, -4, -2]);
});

test('Line autofills on encountering consecutive colors', () => {
  expect(new TangoLine(0, [0, 1], [4, 5], [], []))
      .toConsolidateTo([-3, 3]);
});

test('Line autosolves on consecutive colors when possible', () => {
  expect(new TangoLine(0, [1], [3, 4], [], []))
      .toConsolidateTo([2, 5, -1]);
});

test('Line autofills on engulfing color', () => {
  expect(new TangoLine(0, [], [2, 4], [], []))
      .toConsolidateTo([3]);
});

test('Line autofills on sign-free pigeonholes', () => {
  // One border unmarked; its neighbor and the other border share a color.
  expect(new TangoLine(0, [1, 5], [3], [], []))
      .toConsolidateTo([-1]);
  // One border unmarked; other border and its neighbor share a color.
  expect(new TangoLine(0, [], [0, 1], [], []))
      .toConsolidateTo([2, 5]);
  // Both border cells marked by the same color.
  expect(new TangoLine(0, [0, 5], [], [], []))
      .toConsolidateTo([-2, -5]);
  // Looks like a pigeonhole, but isn't.
  expect(new TangoLine(0, [0, 3], [1, 5], [], []))
      .toConsolidateTo([]);
});

test('Line autofills on equals', () => {
  expect(new TangoLine(0, [0], [5], [0, 4], []))
      .toConsolidateTo([1, -3, 3, -5]);
});

test('Line autofills on equals-containing pigeonholes', () => {
  // Unmarked cell that's part of equals touches marked.
  expect(new TangoLine(0, [5], [0], [1], []))
      .toConsolidateTo([1, 2, -4, -5]);
  // Similar to above, but other direction.
  expect(new TangoLine(0, [], [5], [3], []))
      .toConsolidateTo([-3, 3, 4]);
  // Unmarked border cell that's part of an equals, other border is marked.
  expect(new TangoLine(0, [], [0], [4], []))
      .toConsolidateTo([-4, 4, 5]);
  // Same as before, just in the other direction.
  expect(new TangoLine(0, [5], [], [0], []))
      .toConsolidateTo([-1, -2, 2]);
  // Equals in middle, one border cell marked.
  expect(new TangoLine(0, [5], [], [2], []))
      .toConsolidateTo([-1]);
});

test('Line autofills on cross', () => {
  expect(new TangoLine(0, [0], [5], [], [0, 4]))
      .toConsolidateTo([-2, 4]);
});

test('Line autofills on empty single-cross', () => {
  expect(new TangoLine(0, [1], [], [], [1, 2, 4]))
      .toConsolidateTo([-1, -3, 3]);
  expect(new TangoLine(0, [4], [], [], [3, 2, 0]))
      .toConsolidateTo([2, -4, -6]);
});

test('Line autofills on two single-cross', () => {
  expect(new TangoLine(0, [0], [], [], [1, 4]))
      .toConsolidateTo([-4]);
});

test('Line autofills on double-cross', () => {
  expect(new TangoLine(0, [], [3, 5], [], [0, 1]))
      .toConsolidateTo([0, -2, 2, 4]);
  expect(new TangoLine(0, [0, 4], [], [], [1, 2]))
      .toConsolidateTo([-2, 2, -4, -6]);
  expect(new TangoLine(0, [1, 5], [], [], [2, 3]))
      .toConsolidateTo([-1, -3, 3, -5]);
  expect(new TangoLine(0, [], [0, 2], [], [3, 4]))
      .toConsolidateTo([1, 3, -5, 5]);
});

test('Line autofills on certain single- and double-cross', () => {
  expect(new TangoLine(0, [0], [1], [], [0, 2, 3]))
      .toConsolidateTo([]);
  expect(new TangoLine(0, [2], [], [], [0, 2, 3]))
      .toConsolidateTo([-4, 4, -6]);
  expect(new TangoLine(0, [], [5], [], [0, 2, 3]))
      .toConsolidateTo([2, -4, 4]);
});

test('Line autofills on triple-cross', () => {
  expect(new TangoLine(0, [5], [], [], [0, 1, 2]))
      .toConsolidateTo([-5]);
  expect(new TangoLine(0, [5], [], [], [1, 2, 3]))
      .toConsolidateTo([-1]);
});

test('Line autofills on quadruple-cross', () => {
  expect(new TangoLine(0, [5], [], [], [0, 1, 2, 3]))
      .toConsolidateTo([-1, 1, -3, 3, -5]);
  expect(new TangoLine(0, [0], [], [], [1, 2, 3, 4]))
      .toConsolidateTo([-2, 2, -4, 4, -6]);
});

test('Line with no non-cross cells autofills', () => {
  // Double and double
  expect(new TangoLine(0, [0], [], [], [0, 1, 3, 4]))
      .toConsolidateTo([-2, 2, -4, 4, -6]);
  // Triple and single
  expect(new TangoLine(0, [], [5], [], [0, 2, 3, 4]))
      .toConsolidateTo([2, -4, 4]);
  // Quintuple
  expect(new TangoLine(0, [], [5], [], [0, 1, 2, 3, 4]))
      .toConsolidateTo([0, -2, 2, -4, 4]);
});

test('TangoLineQueue lifecycle', () => {
  const queue = new TangoLineQueue();
  for (let i = 11; i >= 0; i--) {
    queue.offer(i);
    queue.offer(i);
    queue.offer(i);
  }
  let result = 11;
  while (!queue.isEmpty()) {
    expect(queue.poll()).toBe(result--);
  }
  expect(() => queue.poll()).toThrow();
});

test('TangoGrid.solve() generates the correct solution', () => {
  // 2025/04/20 puzzle
  let gridArgs = [
    [9, 35], // initial suns
    [0, 26], // initial moons
    [2], // down equal signs
    [15, 17, 18, 21, 23], // down crosses
    [13, 33], // right equal signs
    [1, 10, 12, 24] // right crosses
  ];
  let grid = new TangoGrid(...gridArgs);
  expect(grid).toSolveTo(
      [1, 3, 4, 6, 10, 13, 14, 17, 18, 20, 21, 25, 28, 29, 30, 32],
      [2, 5, 7, 8, 11, 12, 15, 16, 19, 22, 23, 24, 27, 31, 33, 34]);

  // 2025/04/46 puzzle
  gridArgs = [
    [1, 2, 4, 15, 32, 34], // initial suns
    [3, 31, 33], // initial moons
    [6], // down equal signs
    [11, 14, 18, 23], // down crosses
    [20], // right equal signs
    [] // right crosses
  ];
  grid = new TangoGrid(...gridArgs);
  expect(grid).toSolveTo(
      [6, 9, 11, 12, 14, 19, 22, 23, 24, 25, 27, 35],
      [0, 5, 7, 8, 10, 13, 16, 17, 18, 20, 21, 26, 28, 29, 30]);
});
