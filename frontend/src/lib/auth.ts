import { apiLogin, clearToken, getToken } from "./api";

export function isAuthenticated(): boolean {
  return typeof window !== "undefined" && Boolean(getToken());
}

export async function login(username: string, password: string): Promise<void> {
  await apiLogin(username, password);
}

export function logout(): void {
  clearToken();
}
