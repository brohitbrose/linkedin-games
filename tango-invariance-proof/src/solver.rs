struct ProgressQueue {
  buffer_little: u32,
  buffer_big: u32,
  line_presences: u16,
  size: u8,
}

impl ProgressQueue {

  fn new() {
    ProgressQueue { 0, 0, 0, 0 }
  }

}