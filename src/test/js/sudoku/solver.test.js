import { SudokuGrid } from 'sudoku/solver.js';

test('Various mark() invocations behave as expected', () => {
  const grid = new SudokuGrid(6, 3, 2);
  // Can't write invalid numbers or to invalid cells.
  expect(() => grid.mark(0, 7)).toThrow();
  expect(() => grid.mark(0, 0)).toThrow();
  expect(() => grid.mark(-1, 1)).toThrow();
  expect(() => grid.mark(36, 6)).toThrow();
  // Marking top-left corner as 2 works.
  grid.mark(0, 2);
  // Can't change it, though (at least not like this).
  expect(() => grid.mark(0, 5)).toThrow();
  // Marking one left from top-right corner as 2 fails, but 3 works.
  expect(() => grid.mark(4, 2)).toThrow();
  grid.mark(4, 3);
  // Marking bottom-left corner as 2 fails, but 4 works.
  expect(() => grid.mark(30, 2)).toThrow();
  grid.mark(30, 4);
  // Marking two left of the bottom-right corner as 2 works.
  grid.mark(33, 2);
  // Marking one left of the bottom-right corner as 6 works.
  grid.mark(34, 6);
  // Marking one cell diagonal down-right top-left corner as 2 fails.
  expect(() => grid.mark(7, 2)).toThrow();
  // We can unmark the first cell, though, and set it to 5.
  expect(grid.unmark(0)).toBe(true);
  grid.mark(0, 5);
  // And now the previous failed operation can succeed.
  grid.mark(7, 2);
  // Fill the top-left region without failing.
  grid.mark(8, 3);
  grid.mark(6, 1);
  grid.mark(2, 4);
  grid.mark(1, 6);
  // Fill the top-right region, intentionally failing a few times.
  expect(() => grid.mark(3, 2)).toThrow();
  expect(() => grid.mark(4, 6)).toThrow();
  grid.mark(3, 1);
  expect(() => grid.mark(4, 3)).toThrow();
  grid.mark(5, 2);
  grid.mark(9, 4);
  grid.mark(10, 5);
  grid.mark(11, 6);
});

test('SudokuGrid.solve() generates the correct solution', () => {
  const grid = new SudokuGrid(6, 3, 2);
  // 2025/08/20 puzzle
  grid.mark(6, 1);
  grid.mark(7, 2);
  grid.mark(8, 3);
  grid.mark(13, 4);
  grid.mark(14, 5);
  grid.mark(15, 6);
  grid.mark(26, 6);
  grid.mark(27, 5);
  grid.mark(28, 1);
  grid.mark(33, 2);
  grid.mark(34, 6);
  grid.mark(35, 3);

  const grid2 = new SudokuGrid(6, 3, 2);
  // 2025/08/21 puzzle
  grid2.mark(1, 1);
  grid2.mark(6, 2);
  grid2.mark(7, 3);
  grid2.mark(8, 4);
  grid2.mark(13, 5);
  grid2.mark(21, 3);
  grid2.mark(23, 6);
  grid2.mark(28, 4);
  grid2.mark(33, 2);
  grid2.mark(35, 5);
});
