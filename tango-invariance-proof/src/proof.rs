use crate::grid::generate_ambiguous_line_masks;

pub fn run_proof() {
  print_prelude();
  generate_ambiguous_lines();
}

fn print_prelude() {
  println!("================");
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
}

fn generate_ambiguous_lines() {
  println!("================");
  println!("First, we identify (via backtracking) all possible lines where at \
      least one solution exists, but no move can be made because for every \
      unmarked cell in the line, a Sun-marking and Moon-marking solution both \
      exist.");
  let ambiguous_masks = generate_ambiguous_line_masks();
  println!(">>> Discovered {} purely ambiguous lines", ambiguous_masks.len());
}