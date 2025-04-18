import { QueensGrid, solver } from 'queens/solver.js'

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

const gridConstructorArgs = Array.from(gridSeed.entries())
    .map(([i, c]) => {
       return {'idx': i, 'color': c}
     });

test('Placing a queen forbids others in row/column/color/locale, ', () => {
  const grid = new QueensGrid(gridConstructorArgs);
  // Move 0: no issues.
  expect(grid.place(4, 2)).toBe(true);
  // Same row conflict to the left.
  expect(grid.place(4, 0)).toBe(false);
  // Same row conflict to the right.
  expect(grid.place(4, 8)).toBe(false);
  // Same column conflict up.
  expect(grid.place(2, 2)).toBe(false);
  // Same column conflict down.
  expect(grid.place(8, 2)).toBe(false);
});
