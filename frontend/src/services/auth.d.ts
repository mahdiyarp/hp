// Minimal auth service type declarations (stub during refactor)
export interface AuthService {
  fetchWithAuth(path: string, init?: RequestInit): Promise<Response>
  login(u: string, p: string, otp?: string): Promise<any>
  loginPhoneRequest(mobile: string): Promise<any>
  verifyPhoneOtp(sessionId: string, otp: string): Promise<any>
}
export const authService: AuthService
export function login(username: string, password: string, otp?: string): Promise<any>
export function loginPhone(phone: string, otp?: string, session?: string): Promise<any>
export function loginPhoneRequest(mobile: string): Promise<any>
export function verifyPhoneOtp(sessionId: string, otp: string): Promise<any>
export function getAccessToken(): string | null
export function clearTokens(): void
export default authService
