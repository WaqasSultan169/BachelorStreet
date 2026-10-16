/**
 * Maps Auth.js `?error=` codes (and our own codes) to safe, friendly messages
 * for the sign-in page.
 */
export function authErrorMessage(code?: string | null): string | undefined {
  if (!code) return undefined;
  switch (code) {
    case "AccountNotLinked":
    case "OAuthAccountNotLinked":
      return "An account with this email already exists. Sign in with your password, then link Google from your account settings.";
    case "OAuthSignin":
    case "OAuthCallback":
    case "OAuthCallbackError":
      return "We couldn't complete Google sign-in. Please try again.";
    case "AccessDenied":
      return "That sign-in was denied. Try a different method or contact support.";
    case "Verification":
      return "This sign-in link is invalid or has expired.";
    case "CredentialsSignin":
      return "Invalid email or password.";
    case "Configuration":
      return "Sign-in is temporarily unavailable. Please try again later.";
    default:
      return "We couldn't sign you in. Please try again.";
  }
}
