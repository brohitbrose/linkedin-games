import { QueensGrid } from 'queens/solver.js'

const gridSeed = [
  // 1  2  3  4  5  6  7  8
  5, 5, 5, 5, 0, 0, 8, 8, 8, // 0
  5, 7, 5, 5, 0, 0, 6, 8, 8, // 1
  5, 7, 7, 7, 6, 6, 6, 8, 8, // 2
  5, 5, 5, 5, 1, 8, 8, 8, 8, // 3
  5, 3, 3, 5, 1, 8, 8, 8, 8, // 4
  5, 5, 3, 3, 1, 8, 4, 4, 8, // 5
  5, 5, 5, 5, 1, 4, 4, 8, 8, // 6
  5, 5, 5, 2, 2, 2, 8, 8, 8, // 7
  5, 5, 5, 5, 2, 8, 8, 8, 8  // 8
];

const gridConstructorArgs = gridSeed.map((c, i) => ({'idx': i, 'color': c}));

test('Placing a queen forbids others in row/column/color/locale', () => {
  const grid = new QueensGrid(gridConstructorArgs);
  // Move 0: no issues.
  expect(grid.place(4, 2)).toBe(true);
  // Same row conflicts to the left and right.
  expect(grid.place(4, 0)).toBe(false);
  expect(grid.place(4, 8)).toBe(false);
  // Same column conflicts up and down.
  expect(grid.place(2, 2)).toBe(false);
  expect(grid.place(8, 2)).toBe(false);
  // Diagonal neighbor conflicts.
  expect(grid.place(3, 1)).toBe(false);
  expect(grid.place(3, 3)).toBe(false);
  expect(grid.place(5, 1)).toBe(false);
  expect(grid.place(5, 3)).toBe(false);
  // Move 1: diagonal non-neighbor, different color does not conflict.
  expect(grid.place(6, 0)).toBe(true);
  // Diagonal non-neighbor, same color does conflict.
  expect(grid.place(8, 2)).toBe(false);
});

test('QueensGrid.solve() generates the correct solution', () => {
  const grid = new QueensGrid(gridConstructorArgs);
  const solution = grid.solve();
  expect(solution.length).toBe(9);
  let found = true;
  [5, 10, 24, 31, 38, 52, 66, 80, 54]
    .forEach(e => { found = (found && solution.includes(e)); });
  expect(found).toBe(true);
});
