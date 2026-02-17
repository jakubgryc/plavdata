import { authenticatedFetch } from "./authenticatedFetch";

/**
 * Helper function to handle API requests with consistent error handling
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @param authenticated - Whether to use authenticated fetch (default: true)
 */
async function apiRequest<T>(
  url: string,
  options?: RequestInit,
  authenticated: boolean = true,
): Promise<T> {
  const fetchFn = authenticated ? authenticatedFetch : fetch;
  const response = await fetchFn(url, options);

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const error = await response.json();
      errorMessage = error.detail || errorMessage;
    } catch {
      // If response.json() fails, use default message
    }
    throw new Error(errorMessage);
  }

  // Handle DELETE requests (typically no response body)
  if (options?.method === "DELETE") {
    return undefined as T;
  }

  return response.json();
}

/**
 * Helper for GET requests
 * @param url - The URL to fetch
 * @param authenticated - Whether to use authenticated fetch (default: true)
 */
export function apiGet<T>(
  url: string,
  authenticated: boolean = true,
): Promise<T> {
  return apiRequest<T>(url, undefined, authenticated);
}

/**
 * Helper for POST requests
 * @param url - The URL to fetch
 * @param data - The data to send in the request body
 * @param authenticated - Whether to use authenticated fetch (default: true)
 */
export function apiPost<T>(
  url: string,
  data: unknown,
  authenticated: boolean = true,
): Promise<T> {
  return apiRequest<T>(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
    authenticated,
  );
}

/**
 * Helper for PATCH requests
 * @param url - The URL to fetch
 * @param data - The data to send in the request body
 * @param authenticated - Whether to use authenticated fetch (default: true)
 */
export function apiPatch<T>(
  url: string,
  data: unknown,
  authenticated: boolean = true,
): Promise<T> {
  return apiRequest<T>(
    url,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
    authenticated,
  );
}

/**
 * Helper for DELETE requests
 * @param url - The URL to fetch
 * @param authenticated - Whether to use authenticated fetch (default: true)
 */
export function apiDelete<T = void>(
  url: string,
  authenticated: boolean = true,
): Promise<T> {
  return apiRequest<T>(
    url,
    {
      method: "DELETE",
    },
    authenticated,
  );
}
