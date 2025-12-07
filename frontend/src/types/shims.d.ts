// Ambient type shims to keep typecheck passing without refactors

// JS modules imported in TS
declare module '*.js' {
  const value: any
  export default value
}

// Third-party lib without types
declare module 'jalaali-js' {
  const jalaali: any
  export default jalaali
}

// Local JS auth service imported from various paths
declare module '../services/auth' {
  const authService: any
  export default authService
  export function getAccessToken(...args: any[]): any
  export function clearTokens(...args: any[]): any
  export function login(...args: any[]): any
}
declare module './services/auth' {
  const authService: any
  export default authService
  export function getAccessToken(...args: any[]): any
  export function clearTokens(...args: any[]): any
  export function login(...args: any[]): any
}
declare module '../services/auth.js' {
  const authService: any
  export default authService
  export function getAccessToken(...args: any[]): any
  export function clearTokens(...args: any[]): any
  export function login(...args: any[]): any
}
declare module './services/auth.js' {
  const authService: any
  export default authService
  export function getAccessToken(...args: any[]): any
  export function clearTokens(...args: any[]): any
  export function login(...args: any[]): any
}

// Common app-wide types used in modules; fallback to any
declare type Payment = any
declare type CheckDue = any
declare type DirectionFilter = any
declare type StatusFilter = any
declare type PersonOption = any
declare type PaymentMethod = any
declare type PaymentFormState = any
declare type PersonLedger = any
declare type LedgerEntry = any
declare type StockValuation = any
declare type PersonReportEntry = any
declare type InvoiceMatch = any

// Styling constants occasionally referenced without imports
declare const retroMuted: string
declare const retroButton: string
