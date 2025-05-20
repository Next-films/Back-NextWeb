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

/*
*
*
        Genre validation
*
*
*/
export const GENRE_VALIDATION_RULES /* as ValidationRulesConstantsType */ = {
  NAME: {
    LENGTH_MIN: 1,
    LENGTH_MAX: 100,
  },
} as const;
type _GenreValidationRulesType = typeof GENRE_VALIDATION_RULES & ValidationRulesConstantsType;
/*
*
*
        Auth admin
*
*
*/
export const ADMIN_AUTH_VALIDATION_RULES /* as ValidationRulesConstantsType */ = {
  PASSWORD: {
    LENGTH_MIN: 6,
    LENGTH_MAX: 20,
    PATTERN: /^(?=.*[A-ZА-Я])(?=.*\d)[\d!$%&*?@A-Za-zА-я]+$/,
  },
  EMAIL: {
    PATTERN: /^[\w%+.-]+@[\d.A-Za-z-]+\.[A-Za-z]{2,4}$/,
  },
  USERNAME: {
    LENGTH_MIN: 4,
    LENGTH_MAX: 25,
    PATTERN: /^[a-zA-Z0-9_&#\-!@]+$/,
  },
} as const;
type _AdminAuthValidationRulesType = typeof ADMIN_AUTH_VALIDATION_RULES &
  ValidationRulesConstantsType;
