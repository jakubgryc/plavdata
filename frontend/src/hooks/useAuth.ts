import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { authApi } from "../utils/auth";

interface AuthState {
  isAuthenticated: boolean;
  username: string | null;
  timeRemaining: number | null;
}

export function useAuth() {
  const navigate = useNavigate();
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: authApi.isAuthenticated(),
    username: authApi.getUsername(),
    timeRemaining: authApi.getTimeUntilExpiration(),
  });

  useEffect(() => {
    const updateAuthState = () => {
      setAuthState({
        isAuthenticated: authApi.isAuthenticated(),
        username: authApi.getUsername(),
        timeRemaining: authApi.getTimeUntilExpiration(),
      });
    };

    // Update every second
    const interval = setInterval(updateAuthState, 1000);

    // Also listen for storage changes (in case user logs in/out in another tab)
    window.addEventListener("storage", updateAuthState);

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", updateAuthState);
    };
  }, []);

  const logout = () => {
    authApi.logout();
    setAuthState({
      isAuthenticated: false,
      username: null,
      timeRemaining: null,
    });
    window.dispatchEvent(new Event("storage"));
    navigate("/");
  };

  return {
    ...authState,
    logout,
  };
}

export function formatTimeRemaining(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return "Platnost vypršela";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${secs}s`;
}
