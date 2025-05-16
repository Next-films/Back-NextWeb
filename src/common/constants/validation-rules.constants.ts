export type ValidationRulesConstantsType<T extends string = string> = {
  [K in T]: {
    LENGTH_MIN?: number;
    LENGTH_MAX?: number;
    PATTERN?: string;
  };
};
/*
*
*
        Query validation
*
*
*/
export const BASIC_QUERY_VALIDATION_RULES /* as ValidationRulesConstantsType */ = {
  PAGE: {
    LENGTH_MIN: 1,
    LENGTH_MAX: 100,
  },
  SIZE: {
    LENGTH_MIN: 1,
    LENGTH_MAX: 50,
  },
} as const;
type _BasicQueryValidationRulesType = typeof BASIC_QUERY_VALIDATION_RULES &
  ValidationRulesConstantsType;
