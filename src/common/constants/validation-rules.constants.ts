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
        Films validation
*
*
*/
export const FILMS_VALIDATION_RULES /* as ValidationRulesConstantsType */ = {
  NAME: {
    LENGTH_MIN: 1,
    LENGTH_MAX: 100,
  },
  DESCRIPTION: { LENGTH_MIN: 10, LENGTH_MAX: 255 },
  ORIGINAL_NAME: { LENGTH_MIN: 1, LENGTH_MAX: 100 },
  ALTERNATIVE_NAME: { LENGTH_MIN: 1, LENGTH_MAX: 255 },
  DURATION: { LENGTH_MIN: 0, LENGTH_MAX: 40_000 },
  COUNTRY: { LENGTH_MIN: 1, LENGTH_MAX: 60 },
  GENRE: { LENGTH_MIN: 1, LENGTH_MAX: 50 },
  PROVIDER_ID: { LENGTH_MIN: 1, LENGTH_MAX: 20 },
  KP_ID: { LENGTH_MIN: 1, LENGTH_MAX: 30 },
} as const;
/*
*
*
        Cartoons validation
*
*
*/
export const CARTOONS_VALIDATION_RULES /* as ValidationRulesConstantsType */ = {
  NAME: {
    LENGTH_MIN: 1,
    LENGTH_MAX: 100,
  },
} as const;
/*
*
*
        Serials validation
*
*
*/
export const SERIALS_VALIDATION_RULES /* as ValidationRulesConstantsType */ = {
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
  SEARCH_NAME: {
    LENGTH_MIN: 1,
    LENGTH_MAX: 100,
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
/*
*
*
        Admin moderation movies task 
*
*
*/
export const ADMIN_MODERATION_MOVIES_TASK_VALIDATION_RULES /* as ValidationRulesConstantsType */ = {
  SEARCH_MOVIE_NAME: {
    LENGTH_MIN: 1,
    LENGTH_MAX: 100,
  },
} as const;
/*
*
*
        Logs
*
*
*/
export const CONVERTER_LOGS_VALIDATION_RULES /* as ValidationRulesConstantsType */ = {
  MOVIE_KP_ID: {
    LENGTH_MIN: 1,
    LENGTH_MAX: 30,
  },
  KEYS: {
    LENGTH_MIN: 5,
    LENGTH_MAX: 255,
  },
} as const;
/*
*
*
        Basic movies
*
*
*/
export const MOVIES_VALIDATION_RULES /* as ValidationRulesConstantsType */ = {
  KP_ID: { LENGTH_MIN: 1, LENGTH_MAX: 30 },
} as const;
