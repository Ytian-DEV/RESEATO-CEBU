export const env = {
  API_BASE_URL: process.env.REACT_APP_API_BASE_URL ?? 'http://localhost:4000',
} as const;