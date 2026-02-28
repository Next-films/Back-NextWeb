import { Transform, TransformFnParams } from 'class-transformer';

export const ToBoolean = () =>
  Transform(({ obj, key }: TransformFnParams) =>
    obj[key] === 'true' ? true : obj[key] === 'false' ? false : obj[key],
  );
