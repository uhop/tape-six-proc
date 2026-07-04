// @ts-self-types="./wrap-lines.d.ts"

export const wrap = (type = 'stdout') =>
  new TransformStream({
    transform(line, controller) {
      controller.enqueue({type, name: line});
    }
  });

export default wrap;
