/**
 * Returns true when running in a local (non-production) environment.
 * This includes both development and test modes, where in-memory
 * fallbacks and demo data are acceptable.
 */
export const isLocalEnv = () =>
  process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development';

/** @deprecated Use isLocalEnv instead. Kept for backward compatibility. */
export const isTestEnv = isLocalEnv;
