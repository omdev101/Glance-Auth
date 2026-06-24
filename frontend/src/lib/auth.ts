/**
 * Authentication utility functions for Next-Zen
 */

import { TOKEN_KEY, USER_KEY } from '@/config';

/**
 * Get the authentication token from local storage
 * @returns The JWT token or null if not found
 */
export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * Get the current user from local storage
 * @returns The user object or null if not found
 */
export const getUser = (): any => {
  const userJson = localStorage.getItem(USER_KEY);
  return userJson ? JSON.parse(userJson) : null;
};

/**
 * Set the authentication token and user in local storage
 * @param token The JWT token to store
 * @param user The user object to store
 */
export const setAuth = (token: string, user: any): void => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

/**
 * Clear authentication data from local storage
 */
export const clearAuth = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

/**
 * Check if the user is authenticated
 * @returns True if the user has a token, false otherwise
 */
export const isAuthenticated = (): boolean => {
  return !!getToken();
};

/**
 * Parse the JWT token to get user information
 * @returns The decoded token payload or null if invalid
 */
export const parseToken = (): any | null => {
  const token = getToken();
  if (!token) return null;
  
  try {
    // Split the token and get the payload (second part)
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error parsing token:', error);
    return null;
  }
};

/**
 * Get user role from the token
 * @returns The user role or null if not found
 */
export const getUserRole = (): string | null => {
  const payload = parseToken();
  return payload?.role || null;
};
