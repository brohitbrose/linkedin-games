use crate::grid::{debug_col_unset_grid, generate_ambiguous_and_fixed_line_masks};

pub fn run_proof() {
  print_prelude();
  generate_ambiguous_grids();
}

fn print_prelude() {
  println!("================================== Overview ==================================");
  println!("This program will attempt to prove a property of LinkedIn's Tango \
      game.");
  println!("A grid subject to 'Invariant A' is one that");
  println!("  - Has exactly one solution");
  println!("  - Contains N blank cells");
  println!("  - May be solved by a sequence of moves [m_1, ... m_N] such that \
      each m_i indicates the marking of a blank cell into its final color.");
  println!("A grid subject to 'Invariant B' is one where");
  println!("  - Invariant A is true");
  println!("  - Any m_i can be made by considering only the row or column of \
      the currently blank target cell.");
  println!("We wish to show that every Invariant A grid is also an Invariant B \
      grid.");
  println!();
  println!("Our strategy is to generate every possible board where no move can \
      currently be made by considering any row or column alone, then show that \
      every such board has multiple possible solutions.");
  println!();
}

fn generate_ambiguous_grids() {
  println!("========================= Generating Ambiguous Grids =========================");
  println!("First, we identify (via backtracking) all possible lines where at \
      least one solution exists, yet no move can be made (because for every \
      unmarked cell in the line, a Sun-marking and Moon-marking solution both \
      exist); we call such lines 'ambiguous'.");
  println!("We also need all filled-out lines; a grid where no moves can be \
      confidently made can only consist of either ambiguous lines or filled-out
      lines (hereafter 'fixed' lines).");
  println!();
  println!("> Generating all ambiguous lines and filled lines (22 bits per line)...");
  let temp = generate_ambiguous_and_fixed_line_masks();
  let ambiguous_masks = temp.0;
  let fixed_masks = temp.1;
  let ambiguous_count = ambiguous_masks.len();
  let fixed_count = fixed_masks.len();
  println!("Discovered {} ambiguous, {} fixed lines.", ambiguous_count,
      fixed_count);
  println!();

  println!("The next step (a tricky one at that) is to use this information to \
      efficiently generate all possible grids that are comprised solely of \
      ambiguous lines.");
  println!("We use the fact that choosing row colors fixes column colors (note \
      that row signs have no impact on column signs) to devise a backtracking \
      strategy with aggressive pruning:");
  println!("  - Choose one of the {} sequences as the first row value.",
      ambiguous_count + fixed_count);
  println!("  - For each column, confirm that at least one ambiguous line \
      exists with the colors fixed by this row.");
  println!("  - If so, pick a sequence for the second row and repeat; \
      otherwise, backtrack and try another sequence for the first row.");
  println!("  - If we've successfully placed 6 rows, then we've made great \
      headway, but we're not quite done. Notice that column signs have not \
      been fixed yet.");
  println!("  - The current state actually pertains to a network of grids. We \
      yield all of them by iterating over all permutations of ambiguous \
      columns that are subject to the provided colors.");
  println!();
  println!("The default bitmask representation of a line doesn't help us prune \
      much.");
  println!("If the leading 12 bits represented the 6 in-order colors instead, \
      prefix-based pruning would be very viable; every row update would add \
      two bits to every running column prefix.");
  println!("We switch our bitmasks to this representation instead.");
  println!();
  println!("> Remapping ambiguous lines...");
  let mut ambiguous_col_optimized_masks: Vec<i32> = ambiguous_masks.iter()
      .map(|m| line_to_col_optimized_mask(*m))
      .collect();
  ambiguous_col_optimized_masks.sort();
  let mut fixed_col_optimized_masks: Vec<i32> = fixed_masks.iter()
      .map(|m| line_to_col_optimized_mask(*m))
      .collect();
  fixed_col_optimized_masks.sort();
  println!("Remapped {}, {} ambiguous, fixed lines.", ambiguous_col_optimized_masks.len(),
      fixed_col_optimized_masks.len());
  println!();

  let mut grid_generator = AmbiguousGridGenerator::new(
      &ambiguous_col_optimized_masks,
      &fixed_col_optimized_masks);
  grid_generator.backtrack_rows();
  
}

fn col_optimized_to_line_mask(col_optimized_mask: i32) -> i32 {
  // Function happens to be an involution!
  line_to_col_optimized_mask(col_optimized_mask)
}

fn line_to_col_optimized_mask(line_mask: i32) -> i32 {
  let chunks_mask = (1 << 22) - 1;
  let chunks = (line_mask >> 0) & chunks_mask;
  let mut result_chunks = 0;
  for i in 0..11 {
    let chunk = (chunks >> (i << 1)) & 3;
    let target = 10 - i;
    result_chunks |= chunk << (target << 1);
  }
  result_chunks
}

fn col_optimized_color(col_optimized_mask: i32, idx: usize) -> u8 {
  let shift = 20 - (idx << 1);
  ((col_optimized_mask >> (20 - (idx << 1))) & 3) as u8
}

fn col_optimized_sign(col_optimized_mask: i32, idx: usize) -> u8 {
  ((col_optimized_mask >> (8 - (idx << 1))) & 3) as u8
}

struct AmbiguousGridGenerator<'a> {
  rows: [i32; 6],
  col_prefixes: [i32; 6],
  row_depth: u8,
  col_indices: [u16; 6],
  col_depth: u8,
  ambiguous_masks: &'a Vec<i32>,
  fixed_masks: &'a Vec<i32>,
}

impl AmbiguousGridGenerator<'_> {

  fn new<'a>(ambiguous_masks: &'a Vec<i32>, fixed_masks: &'a Vec<i32>)
        -> AmbiguousGridGenerator<'a> {
    AmbiguousGridGenerator {
      rows: [0, 0, 0, 0, 0, 0],
      col_prefixes: [0, 0, 0, 0, 0, 0],
      row_depth: 0,
      col_indices: [0, 0, 0, 0, 0, 0],
      col_depth: 0,
      ambiguous_masks: ambiguous_masks,
      fixed_masks: fixed_masks,
    }
  }

  fn backtrack_rows(&mut self) {
    if self.row_depth == 6 {
      let grid_readable_masks = self.rows
          .map(|m| col_optimized_to_line_mask(m));
      debug_col_unset_grid(grid_readable_masks);
      return;
    }
    for i in self.fixed_masks.into_iter().rev() {
      self.rows[self.row_depth as usize] = *i;
      self.update_col_prefixes();
      if self.validate_col_prefixes() {
        self.row_depth += 1;
        self.backtrack_rows();
        self.row_depth -= 1;
      }
      self.undo_col_prefixes();
      self.rows[self.row_depth as usize] = 0;
    }
    for i in self.ambiguous_masks.into_iter().rev() {
      self.rows[self.row_depth as usize] = *i;
      self.update_col_prefixes();
      if self.validate_col_prefixes() {
        self.row_depth += 1;
        self.backtrack_rows();
        self.row_depth -= 1;
      }
      self.undo_col_prefixes();
      self.rows[self.row_depth as usize] = 0;
    }
  }

  fn update_col_prefixes(&mut self) {
    let col_optimized_row_mask = self.rows[self.row_depth as usize];
    for i in 0..6 {
      let color_to_add = col_optimized_color(col_optimized_row_mask, i) as i32;
      self.col_prefixes[i] |= color_to_add << (20 - (self.row_depth << 1));
    }
  }

  fn validate_col_prefixes(&self) -> bool {
    for col_prefix in self.col_prefixes {
      if self.row_depth == 5 {
        if !self.ambiguous_masks_has_prefix(col_prefix) 
            && !self.fixed_masks_contains(col_prefix) {
            return false;
        }
      } else {
        if !self.ambiguous_masks_has_prefix(col_prefix) 
            && !self.fixed_masks_has_prefix(col_prefix) {
            return false;
        }
      }
    }
    true
  }

  fn undo_col_prefixes(&mut self) {
    for i in 0..6 {
      let delete_mask = !(3 << (20 - (self.row_depth << 1)));
      self.col_prefixes[i] &= delete_mask;
    }
  }

  fn ambiguous_masks_has_prefix(&self, prefix: i32) -> bool {
    let result = self.ambiguous_masks.binary_search(&prefix);
    match result {
      Ok(_) => true,
      Err(e) => e + 1 <= self.ambiguous_masks.len()
          && (self.ambiguous_masks[e + 1] & prefix) == prefix,
    }
  }

  fn fixed_masks_has_prefix(&self, target: i32) -> bool {
    let result = self.fixed_masks.binary_search(&target);
    match result {
      Ok(_) => true,
      Err(e) => e + 1 <= self.fixed_masks.len()
          && (self.fixed_masks[e + 1] & target) == target,
    }
  }

  fn fixed_masks_contains(&self, target: i32) -> bool {
    let result = self.fixed_masks.binary_search(&target);
    match result {
      Ok(_) => true,
      Err(_) => false,
    }
  }

  fn backtrack_cols(&self) {

  }

}
