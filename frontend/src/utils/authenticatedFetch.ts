import { authApi } from "./auth";

/**
 * Make an authenticated API request with the JWT token.
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = authApi.getToken();

  if (!token) {
    throw new Error("No authentication token found");
  }

  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // If unauthorized, clear token and throw error
  if (response.status === 401) {
    authApi.removeToken();
    throw new Error("Session expired. Please log in again.");
  }

  return response;
}
