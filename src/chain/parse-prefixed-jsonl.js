'use strict';

export const parse = (prefix, type = 'stdout') => {
  let rest = '';
  let lastLineWasJSON = false;
  return new TransformStream({
    transform(line, controller) {
      if (line.startsWith(prefix)) {
        try {
          const value = JSON.parse(line.slice(prefix.length));
          if (value && typeof value == 'object') {
            controller.enqueue(value);
          }
          lastLineWasJSON = true;
        } catch (_) {
          // squelch
        }
        return;
      }
      if (lastLineWasJSON) {
        rest += line;
        lastLineWasJSON = false;
      } else {
        controller.enqueue({type, name: rest});
        rest = line;
      }
    },
    flush(controller) {
      if (lastLineWasJSON ? rest : true) {
        controller.enqueue({type, name: rest});
      }
      lastLineWasJSON = false;
      rest = '';
    }
  });
};

export default parse;
