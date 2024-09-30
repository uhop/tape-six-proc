'use strict';

export const parse = () =>
  new TransformStream({
    transform(line, controller) {
      try {
        const value = JSON.parse(line);
        if (value && typeof value == 'object') {
          controller.enqueue(value);
        }
      } catch (_) {
        // squelch
      }
    }
  });

export default parse;
