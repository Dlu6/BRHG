import { ENDPOINTS } from "../config/endpoints";

// Helper for authenticated API calls
async function fetchWithAuth(url, options = {}) {
  // This service will need the auth token.
  // We'll need a way to get it from Redux state or secure storage.
  // For now, we'll accept it as an argument.
  const { token, ...fetchOptions } = options;

  const headers = {
    "Content-Type": "application/json",
    ...fetchOptions.headers,
  };

  if (token) {
    const authHeader = token.startsWith?.("Bearer ")
      ? token
      : `Bearer ${token}`;
    headers["Authorization"] = authHeader;
  }

  const res = await fetch(url, { ...fetchOptions, headers });

  if (!res.ok) {
    let errorData;
    try {
      errorData = await res.json();
    } catch (e) {
      errorData = { message: `Request failed with status ${res.status}` };
    }
    throw new Error(errorData.message || "API request failed");
  }

  return res.json();
}

export const getPauseStatus = async (token) => {
  const url = `${ENDPOINTS.BASE_URL}/users/pause-status`;
  return fetchWithAuth(url, { token });
};

export const pause = async (token, reason = "Manual Pause") => {
  const url = `${ENDPOINTS.BASE_URL}/users/pause`;
  return fetchWithAuth(url, {
    method: "POST",
    token,
    body: JSON.stringify({ pauseReason: reason }),
  });
};

export const unpause = async (token) => {
  const url = `${ENDPOINTS.BASE_URL}/users/unpause`;
  return fetchWithAuth(url, {
    method: "POST",
    token,
  });
};

export const getProfile = async (token) => {
  const url = `${ENDPOINTS.BASE_URL}/users/profile`;
  return fetchWithAuth(url, { token });
};

export const getAllAgentsStatus = async (token) => {
  const url = `${ENDPOINTS.BASE_URL}/agent-status`;
  return fetchWithAuth(url, { token });
};
