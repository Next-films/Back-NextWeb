import { Transform, TransformFnParams } from 'class-transformer';

export const ToNumber = () =>
  Transform(({ value }: TransformFnParams) =>
    typeof value === 'number' ? value : Number.parseInt(value),
  );
