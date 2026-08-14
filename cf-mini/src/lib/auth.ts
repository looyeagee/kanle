const TOKEN_KEY = "admin_token";
const NICK_KEY = "admin_nickname";
const EMAIL_KEY = "admin_email";

export function getAdminToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getAdmin() {
  const token = getAdminToken();
  if (!token) return null;
  return {
    token,
    nickname: localStorage.getItem(NICK_KEY) || "",
    email: localStorage.getItem(EMAIL_KEY) || "",
  };
}

export function setAdmin(token: string, nickname: string, email: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(NICK_KEY, nickname);
  localStorage.setItem(EMAIL_KEY, email);
}

export function clearAdmin() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(NICK_KEY);
  localStorage.removeItem(EMAIL_KEY);
}

