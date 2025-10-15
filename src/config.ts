// Centralized runtime configuration with sane defaults

export const API_BASE_URL: string =
  process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

export const API_TIMEOUT_MS: number = Number.parseInt(
  process.env.REACT_APP_API_TIMEOUT_MS || '12000',
  10
);


