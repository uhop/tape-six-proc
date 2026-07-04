/**
 * Wraps every text line into a `{type, name: line}` test event
 * (default `type`: `'stdout'`). Used to forward a worker's stderr
 * to the reporter.
 */
export function wrap(type?: string): TransformStream<string, {type: string; name: string}>;

export default wrap;
