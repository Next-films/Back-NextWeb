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
/*
*
*
        External auth tokens admin
*
*
*/
export const ADMIN_EXTERNAL_AUTH_TOKEN_VALIDATION_RULES /* as ValidationRulesConstantsType */ = {
  NAME: {
    LENGTH_MIN: 3,
    LENGTH_MAX: 30,
  },
} as const;
/*
*
*
        Admin banned providers movies
*
*
*/
export const ADMIN_BANNED_PROVIDERS_MOVIES_VALIDATION_RULES /* as ValidationRulesConstantsType */ =
  {
    PROVIDER_ID: {
      LENGTH_MIN: 1,
      LENGTH_MAX: 50,
    },
    MOVIE_NAME: {
      LENGTH_MIN: 1,
      LENGTH_MAX: 100,
    },
  } as const;
