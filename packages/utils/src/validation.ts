const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidUsername(username: string): boolean {
  return USERNAME_RE.test(username)
}

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email)
}
