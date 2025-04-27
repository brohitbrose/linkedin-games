import { ZipGrid } from 'zip/solver.js';

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
  // Move 2c: no issues in moving up again.
  expect(grid.visitUp()).toBe(true);

  // Move 3a: can't move up due to wall.
  expect(grid.visitUp()).toBe(false);
  // Move 3b: can't move down since it's already in path.
  expect(grid.visitDown()).toBe(false);
  // Move 3c: can't move left due to wall.
  expect(grid.visitLeft()).toBe(false);
  // Move 3d: no issues in moving right.
  expect(grid.visitRight()).toBe(true);

  // Move as far right as we can.
  expect(grid.visitRight()).toBe(true);
  expect(grid.visitRight()).toBe(true);
  // Can't move right again due to wall.
  expect(grid.visitRight()).toBe(false);
  // Can't move up since it's too early to touch 5.
  expect(grid.visitUp()).toBe(false);
  // Move down.
  expect(grid.visitDown()).toBe(true);
  // Can't move down again due to wall (now we've tested all wall types).
  expect(grid.visitDown()).toBe(false);
  // Undo this detour.
  expect(grid.unvisit()).toBe(true);
  expect(grid.unvisit()).toBe(true);

  // Make our way to just right of the 3.
  expect(grid.visitUp()).toBe(true);
  expect(grid.visitUp()).toBe(true);
  expect(grid.visitLeft()).toBe(true);
  // Can't visit 3 just yet.
  expect(grid.visitLeft()).toBe(false);
  // But we can visit the 2 below it.
  expect(grid.visitDown()).toBe(true);
  expect(grid.visitLeft()).toBe(true);
  // And now we can visit the 3.
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
  expect(actual).toEqual(expected);
});
