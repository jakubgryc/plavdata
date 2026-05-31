import { API_BASE_URL } from "../../config";

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  username: string;
}

interface DecodedToken {
  sub: string;
  exp: number;
}

class AuthApi {
  private readonly TOKEN_KEY = "auth_token";
  private readonly USERNAME_KEY = "auth_username";

  private decodeToken(token: string): DecodedToken | null {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
          .join(""),
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  }

  getTokenExpiration(): number | null {
    const token = this.getToken();
    if (!token) return null;

    const decoded = this.decodeToken(token);
    return decoded?.exp || null;
  }

  getTimeUntilExpiration(): number | null {
    const exp = this.getTokenExpiration();
    if (!exp) return null;

    const now = Math.floor(Date.now() / 1000);
    const remaining = exp - now;
    return remaining > 0 ? remaining : 0;
  }

  isTokenExpired(): boolean {
    const timeRemaining = this.getTimeUntilExpiration();
    return timeRemaining === null || timeRemaining <= 0;
  }

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Nesprávné uživatelské jméno nebo heslo");
      }
      throw new Error("Přihlášení se nezdařilo");
    }

    return await response.json();
  }

  saveToken(token: string, username: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USERNAME_KEY, username);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getUsername(): string | null {
    return localStorage.getItem(this.USERNAME_KEY);
  }

  removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USERNAME_KEY);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    return !this.isTokenExpired();
  }

  logout(): void {
    this.removeToken();
  }
}

export const authApi = new AuthApi();
