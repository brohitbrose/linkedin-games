import { ZipGrid, solver } from 'zip/solver.js';

const gridSeed = [
  6,
  6,
  [25, 7, 1, 34, 10, 28],
  [7, 8, 21, 22],
  [12, 16, 18, 22],
];

test('Visit-type methods behave as expected', () => {
  const grid = new ZipGrid(gridSeed[0], gridSeed[1], gridSeed[2], gridSeed[3],
      gridSeed[4]);
  // Move 1: no issues in moving up.
  expect(grid.visitUp()).toBe(true);
  // Move 2a: can't visit left due to wall.
  expect(grid.visitLeft()).toBe(false);
  // Move 2b: can't visit right since it will isolate cell 13 (early prune).
  expect(grid.visitRight()).toBe(false);
  // Move 2b: can't visit down since it's already in path.
  expect(grid.visitDown()).toBe(false);
  // Move 2c: can no issues in moving up again.
  expect(grid.visitUp()).toBe(true);


});

test('ZipGrid.solve() generates the correct solution', () => {
  const grid = new ZipGrid(gridSeed[0], gridSeed[1], gridSeed[2], gridSeed[3],
      gridSeed[4]);
  const actual = grid.solve();
  const expected = [
      25, 19, 13, 14, 15,  9,
      3,  2,  8, 7,  1,  0, 
      6, 12, 18, 24, 30, 31,
      32, 33, 34, 35, 29, 23,
      17, 11,  5, 4, 10, 16,
      22, 21, 20, 26, 27, 28
  ];
  expect(actual.length).toBe(36);
  expect(expected.length).toBe(36);
  for (let i = 0; i < 36; i++) {
    expect(actual[i]).toBe(expected[i]);
  }
});

// test('Placing a queen forbids others in row/column/color/locale', () => {
//   const grid = new QueensGrid(gridConstructorArgs);
//   // Move 0: no issues.
//   expect(grid.place(4, 2)).toBe(true);
//   // Same row conflicts to the left and right.
//   expect(grid.place(4, 0)).toBe(false);
//   expect(grid.place(4, 8)).toBe(false);
//   // Same column conflicts up and down.
//   expect(grid.place(2, 2)).toBe(false);
//   expect(grid.place(8, 2)).toBe(false);
//   // Diagonal neighbor conflicts.
//   expect(grid.place(3, 1)).toBe(false);
//   expect(grid.place(3, 3)).toBe(false);
//   expect(grid.place(5, 1)).toBe(false);
//   expect(grid.place(5, 3)).toBe(false);
//   // Move 1: diagonal non-neighbor, different color does not conflict.
//   expect(grid.place(6, 0)).toBe(true);
//   // Diagonal non-neighbor, same color does conflict.
//   expect(grid.place(8, 2)).toBe(false);
// });

// test('QueensGrid.solve() generates the correct solution', () => {
//   const grid = new QueensGrid(gridConstructorArgs);
//   const solution = grid.solve();
//   expect(solution.length).toBe(9);
//   let found = true;
//   [5, 10, 24, 31, 38, 52, 66, 80, 54]
//     .forEach(e => { found = (found && solution.includes(e)); });
//   expect(found).toBe(true);
// });
