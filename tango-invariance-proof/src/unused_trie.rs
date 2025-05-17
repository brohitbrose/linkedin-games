struct LineMaskTrie {
  // Fanout 3 because the next two bits may be 00/01/10; 11 is illegal.
  children: [Option<Box<LineMaskTrie>>; 3],
  is_terminal: bool,
}

impl LineMaskTrie {

  fn new() -> Self {
    Self {
      children: Default::default(),
      is_terminal: false,
    }
  }

  /// Insert a 22-bit value as 11 2-bit chunks.
  fn insert(&mut self, bits: u32) {
    let mut node = self;
    for i in (0..22).step_by(2).rev() {
      let idx = ((bits >> i) & 3) as usize;
      node = node.children[idx].get_or_insert_with(|| Box::new(LineMaskTrie::new()));
    }
    node.is_terminal = true;
  }

  /// Full-match check for whether a 22-bit value exists in the trie.
  fn contains(&self, mut bits: u32) -> bool {
    let mut node = self;
    for i in (0..22).step_by(2).rev() {
      let idx = ((bits >> i) & 3) as usize;
      match &node.children[idx] {
        Some(next) => node = next,
        None => return false,
      }
    }
    node.is_terminal
  }

  /// Check if any value in the trie starts with the given prefix (as first `n` 2-bit chunks).
  fn has_prefix(&self, bits: u32, chunk_count: usize) -> bool {
    let mut node = self;
    for i in (0..(chunk_count * 2)).step_by(2).rev() {
      let idx = ((bits >> i) & 0b11) as usize;
      match &node.children[idx] {
        Some(next) => node = next,
        None => return false,
      }
    }
    true
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_basic_trie() {
    let mut trie = LineMaskTrie::new();
    assert_eq!(trie.contains(0), false);
    assert_eq!(trie.has_prefix(0, 1), false);
    trie.insert(0);
    assert_eq!(trie.contains(0), true);
    assert_eq!(trie.has_prefix(0, 1), true);
  }

}
