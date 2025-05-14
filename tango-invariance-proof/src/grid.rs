use std::{fmt::{Debug, Display}, mem::MaybeUninit};

pub fn generate_ambiguous_line_masks() -> Vec<i32> {
  let mut result = Vec::with_capacity(858);
  for i in 0..(3 as i32).pow(11) {
    let mask = ternary_to_encoded_binary(i);
    match consolidate_mask(mask) {
      Ok(consolidation) => {
        if consolidation == 0 {
          result.push(mask);
        }
      },
      Err(_) => (),
    }
  }
  result
}

fn ternary_to_encoded_binary(n: i32) -> i32 {
  let mut encoded = 0;
  let mut shift = 0;
  let mut x = n;
  while x > 0 {
    let trit = x % 3;
    encoded |= trit << shift;
    shift += 2;
    x /= 3;
  }
  return encoded;
}

fn consolidate_mask(mask: i32) -> Result<i32, LineError> {
  let line = Line::try_from(mask)?;
  if line.colored_cell_count() == 6 {
    return Ok(-1);
  }
  let solutions = solve_mask(mask)?;
  if solutions.len() == 0 {
    return Ok(-2);
  }
  let mask_colors = Line::mask_color_mask(mask);
  let mut sieve = (2 as i32).pow(12) - 1;
  sieve -= mask_colors;
  for solution in solutions.iter() {
    let solution_colors = Line::mask_color_mask(*solution);
    sieve &= solution_colors;
  }
  Ok(sieve)
}

fn solve_mask(mask: i32) -> Result<Vec<i32>, LineError> {
  let mut line = Line::try_from(mask)?;
  solve_line(&mut line)
}

fn solve_line(line: &mut Line) -> Result<Vec<i32>, LineError> {
  let mut results: Vec<i32> = Vec::with_capacity(16);
  backtrack_line(line, -1, &mut results);
  return Ok(results);
}

fn backtrack_line(line: &mut Line, last_colored_idx: i32,
    solutions: &mut Vec<i32>) {
  if line.colored_cell_count() == 6 {
    solutions.push(line.full_mask() as i32);
    return;
  }
  // Seek to first non-colored idx
  let mut i: i32 = last_colored_idx + 1;
  while i < 6 {
    if line.color(i as usize) == 0 {
      break;
    }
    i += 1;
  }
  assert_ne!(i, 6);
  let mut found_any = false;
  if line.set_color(i as usize, 1) {
    found_any = true;
    backtrack_line(line, i, solutions);
    line.uncolor(i as usize, 1);
  }
  if line.set_color(i as usize, 2) {
    found_any = true;
    backtrack_line(line, i, solutions);
    line.uncolor(i as usize, 2);
  }
  if !found_any {
    return;
  }
}


struct Grid {
  rows: [Line; 6],
  cols: [Line; 6],
}

impl TryFrom<([i32; 6], [i32; 6])> for Grid {
  type Error = LineError;

  fn try_from(values: ([i32; 6], [i32; 6])) -> Result<Self, Self::Error> {
    let row_seeds = values.0;
    let col_signs = values.1;
    // Fallible array init pattern.
    let mut rows: [MaybeUninit<Line>; 6] = unsafe {
      MaybeUninit::uninit().assume_init()
    };
    for (i, val) in row_seeds.into_iter().enumerate() {
      match Line::try_from(val) {
        Ok(line) => rows[i] = MaybeUninit::new(line),
        Err(e) => {
          // Drop already-initialized lines to avoid leaks.
          for j in 0..i {
            unsafe { 
              std::ptr::drop_in_place(rows[j].as_mut_ptr());
            }
          }
          return Err(e);
        }
      }
    }
    // SAFETY: all row elements are initialized, thus transmutation is safe.
    // Note rebinding of the rows variable.
    let rows = unsafe {
      std::mem::transmute::<_, [Line; 6]>(rows)
    };
    // Fallible array init pattern.
    let mut cols: [MaybeUninit<Line>; 6] = unsafe {
      MaybeUninit::uninit().assume_init()
    };
    for i in 0..6 {
      let mut col_mask = col_signs[i] << 12;
      for j in 0..6 {
        let row = &rows[j];
        col_mask |= ((*row).color(i) as i32) << (j << 1);
      }
      match Line::try_from(col_mask) {
        Ok(line) => cols[i] = MaybeUninit::new(line),
        Err(e) => {
          // Drop already-initialized lines to avoid leaks.
          for j in 0..i {
            unsafe {
              std::ptr::drop_in_place(cols[j].as_mut_ptr());
            }
          }
          return Err(e);
        }
      }
    }
    // SAFETY: all row elements are initialized, thus transmutation is safe.
    // Note rebinding of the cols variable.
    let cols = unsafe { std::mem::transmute::<_, [Line; 6]>(cols) };
    Ok(Grid { rows, cols })
  }
}

impl Display for Grid {

  fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
    writeln!(f, "Grid {{ ")?;
    writeln!(f, "  =========================")?;
    for i in 0..5 {
      fmt_row(&self, f, i)?;
      fmt_col_signs(&self, f, i)?;
    }
    fmt_row(&self, f, 5)?;
    writeln!(f, "  =========================")?;
    return write!(f, "}}");

    fn fmt_row(context: &Grid, f: &mut std::fmt::Formatter<'_>, i: usize)
        -> std::fmt::Result {
      write!(f, "  |")?;
      let row = &context.rows[i];
      for j in 0..(Line::DIM - 1) as usize {
        let color = match (*row).color(j) {
          Line::YELLOW => 'S',
          Line::BLUE => 'M',
          _ => '.',
        };
        let sign = match (*row).sign(j) {
          Line::EQUAL => '=',
          Line::CROSS => 'x',
          _ => '|',
        };
        write!(f, " {} {}", color, sign)?;
      }
      let last_color = match (*row).color((Line::DIM - 1) as usize) {
        Line::YELLOW => 'S',
        Line::BLUE => 'M',
        _ => '.',
      };
      writeln!(f, " {} |", last_color)
    }

    fn fmt_col_signs(context: &Grid, f: &mut std::fmt::Formatter<'_>, i: usize)
        -> std::fmt::Result {
      write!(f, "  |")?;
      for j in 0..(Line::DIM - 1) as usize {
        let col = &context.cols[j];
        let sign = match (*col).sign(i) {
          Line::EQUAL => '=',
          Line::CROSS => 'x',
          _ => '-',
        };
        write!(f, " {} +", sign)?;
      }
      let sign = match (*(&context.cols[5])).sign(i) {
        Line::EQUAL => '=',
        Line::CROSS => 'x',
        _ => '-',
      };
      writeln!(f, " {} |", sign)
    }

  }

}

#[derive(Debug)]
struct Line {
  data: i32,
  yellow_count: u8,
  blue_count: u8,
}

impl Line {

  const EMPTY: u8 = 0;
  const YELLOW: u8 = 1;
  const BLUE: u8 = 2;
  const EQUAL: u8 = 1;
  const CROSS: u8 = 2;
  const DIM: u8 = 6;

  fn validate(&self) -> Result<(), LineError> {
    if self.yellow_count > 3 {
      return Err(LineError::TooManyYellows);
    }
    if self.blue_count > 3 {
      return Err(LineError::TooManyBlues);
    }
    for i in 0..(Self::DIM as usize - 2) {
      let c = self.color(i);
      if c != Self::EMPTY && c == self.color(i + 1) && c == self.color(i + 2) {
        return Err(LineError::TooManyConsecutives(i));
      }
      self.validate_sign(i)?;
    }
    self.validate_sign(Self::DIM as usize - 2)
  }

  fn validate_sign(&self, i: usize) -> Result<(), LineError> {
    let sign = self.sign(i);
    let before = self.color(i);
    let after = self.color(i + 1);
    let product = before * after;
    if sign == Self::EQUAL && product == 2 {
      return Err(LineError::EqualSignViolation(i));
    } else if sign == Self::CROSS && (product == 1 || product == 4) {
      return Err(LineError::CrossSignViolation(i));
    }
    Ok(())
  }

  fn color(&self, i: usize) -> u8 {
    Self::mask_color(self.data, i)
  }

  fn mask_color(mask: i32, i: usize) -> u8 {
    debug_assert!(i < Self::DIM as usize, "Invalid index {}", i);
    ((mask >> (i << 1)) & 0x3) as u8
  }

  fn set_color(&mut self, i: usize, color: u8) -> bool {
    let new_data = Self::mask_set_color(self.data, i, color);
    if new_data != self.data {
      self.data = new_data;
      if color == Self::YELLOW {
        self.yellow_count += 1;
      } else {
        self.blue_count += 1;
      }
      match self.validate() {
        Ok(_) => {
          return true;
        },
        Err(_) => {
          self.uncolor(i, color);
          return false;
        },
      }
    } else {
      false
    }
  }

  fn mask_set_color(mask: i32, i: usize, color: u8) -> i32 {
    assert!(i < Self::DIM as usize, "Invalid index {}", i);
    assert!(color == Self::YELLOW || color == Self::BLUE,
        "Invalid color {}", color);
    let offset = (i << 1) as i32;
    let old_color_mask = mask & (3 << offset);
    if old_color_mask == 0 {
      mask | ((color as i32) << offset)
    } else {
      mask
    }
  }

  fn uncolor(&mut self, i: usize, color: u8) {
    assert!(i < Self::DIM as usize, "Invalid index {}", i);
    assert!(color == Self::YELLOW || color == Self::BLUE,
        "Invalid color {}", color);
    self.data &= !(3 << (i << 1));
    if color == Self::YELLOW {
      self.yellow_count -= 1;
    } else {
      self.blue_count -= 1;
    }
  }

  fn sign(&self, i: usize) -> u8 {
    assert!(i < (Self::DIM - 1) as usize, "Invalid index {}", i);
    let offset = ((Self::DIM as usize) + i) << 1;
    ((self.data >> offset) & 0x3) as u8
  }

  fn full_mask(&self) -> i32 {
    self.data
  }

  fn color_mask(&self) -> i32 {
    Self::mask_color_mask(self.data)
  }

  fn mask_color_mask(mask: i32) -> i32 {
    mask & 0xFFF
  }

  fn colored_cell_count(&self) -> u8 {
    self.yellow_count + self.blue_count
  }

}

impl Display for Line {
  fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
    write!(f, "Line {{ ")?;
    for i in 0..(Self::DIM - 1) as usize {
      let color = match self.color(i) {
        Self::YELLOW => 'S',
        Self::BLUE => 'M',
        _ => '.',
      };
      let sign = match self.sign(i) {
        Self::EQUAL => '=',
        Self::CROSS => 'x',
        _ => '|',
      };
      write!(f, "{}{}", color, sign)?;
    }

    // Final color without following sign
    let last_color = match self.color((Self::DIM - 1) as usize) {
      Self::YELLOW => 'S',
      Self::BLUE => 'M',
      _ => '.',
    };
    write!(f, "{} }}", last_color)
  }
}


impl TryFrom<i32> for Line {
  type Error = LineError;

  fn try_from(value: i32) -> Result<Self, Self::Error> {
    let mut yellow_count: u8 = 0;
    let mut blue_count: u8 = 0;
    for i in 0..Self::DIM {
      let color = Self::mask_color(value, i as usize);
      if color == Self::YELLOW {
        yellow_count += 1;
      } else if color == Self::BLUE {
        blue_count += 1;
      } else if color != Self::EMPTY {
        return Err(LineError::InvalidColor(color));
      }
    }
    for i in 0..Self::DIM - 1 {
      let offset = (Self::DIM + i) << 1;
      let sign = ((value & (3 << offset)) >> offset) as u8;
      if sign != Self::EQUAL && sign != Self::CROSS && sign != Self::EMPTY {
        return Err(LineError::InvalidSign(sign));
      }
    }
    let result = Line {
      data: value,
      yellow_count: yellow_count,
      blue_count: blue_count,
    };
    match result.validate() {
      Ok(_) => Ok(result),
      Err(e) => Err(e),
    }
  }
}

#[derive(Debug, PartialEq)]
enum LineError {
  TooManyYellows,
  TooManyBlues,
  TooManyConsecutives(usize),
  InvalidColor(u8),
  InvalidSign(u8),
  EqualSignViolation(usize),
  CrossSignViolation(usize),
}

impl Display for LineError {
  fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
    match self {
      Self::TooManyYellows => write!(f, "Too many yellow cells"),
      Self::TooManyBlues => write!(f, "Too many blue cells"),
      Self::TooManyConsecutives(i) => write!(f,
          "Too many consecutive same-colored cells at index {}", i),
      Self::InvalidColor(c) => write!(f, "Invalid color value: {}", c),
      Self::InvalidSign(s) => write!(f, "Invalid sign value: {}", s),
      Self::EqualSignViolation(i) => write!(f,
          "Equality constraint not upheld at index {}", i),
      Self::CrossSignViolation(i) => write!(f,
          "Inequality constraint not upheld at index {}", i),
    }
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
    fn instantiate_blank_lines() {
      for i in 0..(3 as i32).pow(5) {
        let line = Line::try_from(ternary_to_encoded_binary(i) << 12)
            .unwrap();
        assert_eq!(line.colored_cell_count(), 0);
      }
    }

  #[test]
  fn colorize_sign_free_line() {
    let mut line = Line::try_from(1).unwrap();
    assert_eq!(line.set_color(0, Line::YELLOW), false);
    assert_eq!(line.set_color(0, Line::BLUE), false);
    assert_eq!(line.set_color(1, Line::YELLOW), true);
    assert_eq!(line.set_color(1, Line::BLUE), false);
    assert_eq!(line.set_color(2, Line::YELLOW), false);
    assert_eq!(line.set_color(2, Line::BLUE), true);
    assert_eq!(line.set_color(3, Line::YELLOW), true);
    assert_eq!(line.set_color(4, Line::YELLOW), false);
    assert_eq!(line.set_color(5, Line::YELLOW), false);
    assert_eq!(line.set_color(4, Line::BLUE), true);
    assert_eq!(line.set_color(4, Line::BLUE), false);
    assert_eq!(line.set_color(5, Line::BLUE), true);
  }

  #[test]
  fn colorize_signed_line() {
    let mut line = Line::try_from((0b101001 << 12) | 1)
        .unwrap();
    assert_eq!(line.set_color(0, Line::YELLOW), false);
    assert_eq!(line.set_color(0, Line::BLUE), false);
    assert_eq!(line.set_color(1, Line::YELLOW), true);
    assert_eq!(line.set_color(1, Line::BLUE), false);
    assert_eq!(line.set_color(2, Line::YELLOW), false);
    assert_eq!(line.set_color(2, Line::BLUE), true);
    assert_eq!(line.set_color(3, Line::BLUE), false);
    assert_eq!(line.set_color(3, Line::YELLOW), true);
    assert_eq!(line.set_color(4, Line::YELLOW), false);
    assert_eq!(line.set_color(5, Line::YELLOW), false);
    assert_eq!(line.set_color(4, Line::BLUE), true);
    assert_eq!(line.set_color(4, Line::BLUE), false);
    assert_eq!(line.set_color(5, Line::BLUE), true);
  }

  #[test]
  fn solve_blank_line() {
    let solutions = solve_mask(0);
    assert_eq!(solutions.unwrap().len(), 14);
  }

  #[test]
  fn solve_one_mark_line() {
    let solutions = solve_mask(1);
    assert_eq!(solutions.unwrap().len(), 7);
  }

  #[test]
  fn solve_some_equals_line() {
    let solutions = solve_mask(0b00_00_01_00_01_00_00_00_00_00_00);
    assert_eq!(solutions.unwrap().len(), 2);
  }

  #[test]
  fn solve_some_crosses_line() {
    let solutions = solve_mask(0b00_00_10_00_10_00_00_00_00_00_00);
    assert_eq!(solutions.unwrap().len(), 8);
  }

  #[test]
  fn consolidate_lines() {
    assert_eq!(consolidate_mask(0).unwrap(), 0);
    assert_eq!(consolidate_mask(0b01_01).unwrap(), 0b_10_00_00_10_00_00);
    assert_eq!(consolidate_mask(0b01_01_01), Err(LineError::TooManyConsecutives(0)));
    assert_eq!(consolidate_mask(0b00_00_00_01_00_00_10_00_00_00_00).unwrap(),
      0b01_00_00_00_00_00);
  }

  #[test]
  fn generate_ambiguities() {
    let ambiguities = generate_ambiguous_line_masks();
    assert_eq!(ambiguities.len(), 858);
  }

  #[test]
  fn generate_grid() {
    let grid = Grid::try_from(([1, 1, 2, 0, 0, 0], [1, 0, 0, 0, 0, 0]));
    println!("{}", grid.unwrap());
    let grid = Grid::try_from(([1, 2, 1, 0, 0, 0], [10, 0, 0, 0, 0, 0]));
    println!("{}", grid.unwrap());
  }
  
}
