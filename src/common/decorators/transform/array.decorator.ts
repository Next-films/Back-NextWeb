import { Transform, TransformFnParams } from 'class-transformer';

export const ToArray = () =>
  Transform(({ value }: TransformFnParams) => {
    if (Array.isArray(value)) return value;

    if (typeof value === 'string') return value.split(',').map(item => item.trim());

    return [];
  });
