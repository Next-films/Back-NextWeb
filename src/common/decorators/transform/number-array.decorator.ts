import { Transform, TransformFnParams } from 'class-transformer';

export const ToNumberArray = () =>
  Transform(({ value }: TransformFnParams) => {
    if (!Array.isArray(value)) {
      return [Number(value)];
    }
    return value.map(v => Number(v));
  });
