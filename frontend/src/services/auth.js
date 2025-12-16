/*
LEGACY FILE: Do not use. See auth.ts for live implementation.

// Forward all exports to TypeScript source to avoid duplication
export * from './auth.ts'
export { default } from './auth.ts'
  const url = API_BASE + '/api/auth/verify-phone-otp'


// Legacy JS shim: re-export TypeScript implementation without duplication.
// This ensures tests that import './auth' resolve to the TS source.
export * from './auth.ts'
export { default } from './auth.ts'


  }




  



// Legacy JS shim: clean re-export to the TypeScript implementation.
// Keep this file minimal to avoid duplication and runtime issues.
export * from './auth.ts'
import def from './auth.ts'
export default def



    body: JSON.stringify({ code }),




  })




  if (!res.ok) throw new Error('Failed to verify OTP')




  return res.json()




}









export const disableOtp = async (code) => {




  const res = await fetchWithAuth('/api/auth/otp/disable', {




    method: 'POST',




    headers: { 'Content-Type': 'application/json' },




    body: JSON.stringify({ code }),




  })




  if (!res.ok) throw new Error('Failed to disable OTP')




  return res.json()




}









export default {



  login,



  loginPhoneRequest,



  verifyPhoneOtp,



  refreshTokens,



  fetchWithAuth,



  setTokens,



  getAccessToken,



  getRefreshToken,



  clearTokens,




  requestOtpSetup,




  verifyOtp,




  disableOtp,




}




