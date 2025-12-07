export function getAccessToken(): string | null
export function getRefreshToken(): string | null
export function setTokens(access: string, refresh: string): void
export function clearTokens(): void

export type LoginResult =
  | { otpRequired: true }
  | { otpRequired: false; access_token: string; refresh_token: string }

export function login(
  username: string,
  password: string,
  otp?: string
): Promise<LoginResult>

export function loginPhoneRequest(mobile: string): Promise<any>
export function verifyPhoneOtp(
  sessionId: string,
  otpCode: string
): Promise<{ access_token: string; refresh_token: string }>

export function refreshTokens(): Promise<{
  access_token: string
  refresh_token: string
}>

export function fetchWithAuth(input: string, init?: RequestInit): Promise<Response>

export function requestOtpSetup(): Promise<any>
export function verifyOtp(code: string): Promise<any>
export function disableOtp(code: string): Promise<any>

declare const _default: {
  login: typeof login
  loginPhoneRequest: typeof loginPhoneRequest
  verifyPhoneOtp: typeof verifyPhoneOtp
  refreshTokens: typeof refreshTokens
  fetchWithAuth: typeof fetchWithAuth
  setTokens: typeof setTokens
  getAccessToken: typeof getAccessToken
  getRefreshToken: typeof getRefreshToken
  clearTokens: typeof clearTokens
  requestOtpSetup: typeof requestOtpSetup
  verifyOtp: typeof verifyOtp
  disableOtp: typeof disableOtp
}
export default _default
export function getAccessToken(): string | null
export function getRefreshToken(): string | null
export function setTokens(access: string, refresh: string): void
export function clearTokens(): void

export function login(
  username: string,
  password: string,
  otp?: string,
): Promise<{ otpRequired: boolean; access_token?: string; refresh_token?: string }>

export function loginPhoneRequest(mobile: string): Promise<{ session_id: string; message?: string }>
export function verifyPhoneOtp(
  sessionId: string,
  otpCode: string,
): Promise<{ access_token: string; refresh_token: string }>

export function refreshTokens(): Promise<{ access_token: string; refresh_token: string }>

export function fetchWithAuth(input: string, init?: RequestInit): Promise<Response>

export function requestOtpSetup(): Promise<any>
export function verifyOtp(code: string): Promise<any>
export function disableOtp(code: string): Promise<any>

declare const _default: {
  login: typeof login
  loginPhoneRequest: typeof loginPhoneRequest
  verifyPhoneOtp: typeof verifyPhoneOtp
  refreshTokens: typeof refreshTokens
  fetchWithAuth: typeof fetchWithAuth
  setTokens: typeof setTokens
  getAccessToken: typeof getAccessToken
  getRefreshToken: typeof getRefreshToken
  clearTokens: typeof clearTokens
  requestOtpSetup: typeof requestOtpSetup
  verifyOtp: typeof verifyOtp
  disableOtp: typeof disableOtp
}
export default _default
