export class ApiCinemaAccessTokenPayload {
  name: string;
  iat: number;
  exp: number;
}

export enum ExternalApiTokenExpAtEnum {
  '1D' = '1d',
  '1W' = '1w',
  '1M' = '1mo',
  '3M' = '3mo',
  '6M' = '6mo',
  '1Y' = '1y',
  'F' = 'F',
}
