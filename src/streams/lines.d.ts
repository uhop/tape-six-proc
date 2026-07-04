/**
 * Re-chunks a text stream into lines: buffers a partial line across chunks,
 * splits on `\r?\n`, and emits one string per complete line (terminator
 * stripped). A non-empty tail is flushed as the final line.
 */
export function lines(): TransformStream<string, string>;

export default lines;
