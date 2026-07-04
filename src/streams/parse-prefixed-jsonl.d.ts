import {TestEvent} from 'tape-six/utils/EventServer.js';

/**
 * Demultiplexes a worker's stdout lines: a line starting with `prefix` is
 * decoded as one JSONL test event and emitted as-is (undecodable prefixed
 * lines are dropped); any other line is passthrough text, coalesced and
 * re-emitted as a `{type, name}` event (default `type`: `'stdout'`).
 */
export function parse(prefix: string, type?: string): TransformStream<string, TestEvent>;

export default parse;
