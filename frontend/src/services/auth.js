/**
 * Legacy JS shim: re-export the TypeScript implementation.
 * Keep this file minimal to avoid duplication and parsing issues.
 */
export * from './auth.ts'
import def from './auth.ts'
export default def
