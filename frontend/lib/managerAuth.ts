const TOKEN_KEY = 'zod_manager_token';
const NAME_KEY = 'zod_manager_name';

export function getManagerToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

export function getManagerName(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(NAME_KEY);
}

export function setManagerSession(token: string, name: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(NAME_KEY, name);
}

export function clearManagerSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(NAME_KEY);
}

export function isManagerLoggedIn(): boolean {
  return !!getManagerToken();
}

export function managerHeaders(): HeadersInit {
  const token = getManagerToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
