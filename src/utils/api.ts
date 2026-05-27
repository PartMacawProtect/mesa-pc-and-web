/**
 * API Url Resolution Helper for Mesa Serenity Messenger.
 */

// Helper to resolve the correct URL based on environment.
export function getApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // 1. Try to read user-defined server URL from localStorage
  const savedUrl = typeof localStorage !== 'undefined' ? localStorage.getItem("MESA_SERVER_URL") : null;
  if (savedUrl) {
    const baseUrl = savedUrl.endsWith('/') ? savedUrl.slice(0, -1) : savedUrl;
    return `${baseUrl}${cleanEndpoint}`;
  }

  // 2. Check build-time environment variable VITE_API_URL
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl) {
    const baseUrl = envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
    return `${baseUrl}${cleanEndpoint}`;
  }

  // 3. Fallback for Electron client to target the hardcoded localhost if not configured,
  // or default to current origin in relative browser mode
  const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;
  if (isElectron) {
    // If we're loaded locally in electron offline, default backend address to localhost:3000
    if (window.location.protocol === 'file:') {
      return `http://localhost:3000${cleanEndpoint}`;
    }
  }

  return cleanEndpoint;
}

