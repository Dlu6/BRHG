const CREDENTIALS_KEY = "savedCredentials";

// Save credentials
export const saveCredentials = (credentials) => {
  localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
};

// Get saved credentials
export const getSavedCredentials = () => {
  const saved = localStorage.getItem(CREDENTIALS_KEY);
  return saved ? JSON.parse(saved) : null;
};

// Auth token functions
export const setAuthToken = (token) => {
  // Remove 'Bearer ' prefix if it exists
  const cleanToken = token.replace("Bearer ", "");
  localStorage.setItem("authToken", cleanToken);
};

export const getAuthToken = () => {
  const token =
    localStorage.getItem("authToken") || localStorage.getItem("token");
  return token ? token.replace("Bearer ", "") : null;
};

export const clearAuthToken = () => {
  localStorage.removeItem("authToken");
};

// Refresh token functions
export const setRefreshToken = (token) => {
  // Store refresh token securely
  localStorage.setItem("refreshToken", token);
};

export const getRefreshToken = () => {
  return localStorage.getItem("refreshToken");
};

export const removeRefreshToken = () => {
  localStorage.removeItem("refreshToken");
};

// User settings functions
export const saveUserSettings = (settings) => {
  localStorage.setItem("userSettings", JSON.stringify(settings));
};

export const getUserSettings = () => {
  const settings = localStorage.getItem("userSettings");
  return settings ? JSON.parse(settings) : null;
};

// User data functions
export const setUserData = (userData) => {
  localStorage.setItem("userData", JSON.stringify(userData));
};

export const getUserData = () => {
  const data = localStorage.getItem("userData");
  try {
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

// Cleanup functions
export const clearAuth = () => {
  localStorage.removeItem("authToken");
};

export const clearSavedCredentials = () => {
  localStorage.removeItem(CREDENTIALS_KEY);
};

export const clear = () => {
  localStorage.removeItem(CREDENTIALS_KEY);
  localStorage.removeItem("authToken");
  localStorage.removeItem("token");
  localStorage.removeItem("mongoToken");
  localStorage.removeItem("userSettings");
  localStorage.removeItem("userData");
  localStorage.removeItem("refreshToken"); // Clear refresh token on logout
};

// Add these new functions
const getMongoToken = () => {
  const token = localStorage.getItem("mongoToken");
  return token ? `Bearer ${token}` : null;
};

const setMongoToken = (token) => {
  localStorage.setItem("mongoToken", token);
};

// Add this function before the export statement
const getApiUrl = () => {
  // Return the API URL from localStorage or use a default
  return (
    localStorage.getItem("apiUrl") ||
    process.env.REACT_APP_API_URL ||
    "http://localhost:8004"
  );
};

// And this function to set it
const setApiUrl = (url) => {
  localStorage.setItem("apiUrl", url);
};

// Authentication state manager to prevent re-render loops
const AUTH_STATE_KEY = "authState";
const LOGOUT_FLAG_KEY = "isLoggingOut";

export const setAuthState = (state) => {
  localStorage.setItem(AUTH_STATE_KEY, JSON.stringify(state));
};

export const getAuthState = () => {
  const state = localStorage.getItem(AUTH_STATE_KEY);
  return state
    ? JSON.parse(state)
    : { isAuthenticated: false, isLoggingOut: false };
};

export const setLogoutFlag = (isLoggingOut) => {
  localStorage.setItem(LOGOUT_FLAG_KEY, JSON.stringify(isLoggingOut));
};

export const isLoggingOut = () => {
  const flag = localStorage.getItem(LOGOUT_FLAG_KEY);
  return flag ? JSON.parse(flag) : false;
};

export const clearLogoutFlag = () => {
  localStorage.removeItem(LOGOUT_FLAG_KEY);
};

// Enhanced authentication check that considers logout state
export const canInitializeServices = () => {
  const token = getAuthToken();
  const logoutFlag = isLoggingOut();
  return token && !logoutFlag;
};

// Registration state functions
export const saveAsteriskRegistrationState = (state) => {
  localStorage.setItem("asteriskRegistrationState", JSON.stringify(state));
};

export const getAsteriskRegistrationState = () => {
  const state = localStorage.getItem("asteriskRegistrationState");
  return state ? JSON.parse(state) : null;
};

// Export the storageService object with all functions
export const storageService = {
  saveCredentials,
  getSavedCredentials,
  setAuthToken,
  getAuthToken,
  clearAuthToken,
  setRefreshToken,
  getRefreshToken,
  removeRefreshToken,
  saveUserSettings,
  getUserSettings,
  setUserData,
  getUserData,
  clearAuth,
  clearSavedCredentials,
  clear,
  getMongoToken,
  setMongoToken,
  getApiUrl,
  setApiUrl,
  saveAsteriskRegistrationState,
  getAsteriskRegistrationState,
};
