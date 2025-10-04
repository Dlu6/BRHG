// src/auth/UserContext.js

import {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import apiClient from "../api/apiClient";
import { jwtDecode } from "jwt-decode";
import { useDispatch } from "react-redux";
import { fetchCurrentLicense } from "../features/licenses/licenseSlice";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setUser(null);
    apiClient.defaults.headers.common["Authorization"] = "";
  }, []);

  useEffect(() => {
    const checkUser = () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const decodedToken = jwtDecode(token);
          const currentTime = Date.now() / 1000;
          if (decodedToken.exp < currentTime) {
            logout();
          } else {
            apiClient.defaults.headers.common[
              "Authorization"
            ] = `Bearer ${token}`;
            setUser({
              id: decodedToken.id,
              username: decodedToken.username,
              role: decodedToken.role,
            });
            dispatch(fetchCurrentLicense());
          }
        } catch (error) {
          console.error("Token validation failed", error);
          logout();
        }
      }
      setLoading(false);
    };
    checkUser();
  }, [dispatch, logout]);

  const login = useCallback(
    async (username, password) => {
      // Note: This logic assumes your API returns a token on successful login.
      // The actual API call to your backend's /login endpoint is managed by apiClient.
      const response = await apiClient.post("/users/login", {
        username,
        password,
      });
      const { token: apiToken } = response.data; // Assuming token is in response.data

      localStorage.setItem("token", apiToken);
      apiClient.defaults.headers.common["Authorization"] = `Bearer ${apiToken}`;
      const decodedUser = jwtDecode(apiToken);
      const userData = {
        id: decodedUser.id,
        username: decodedUser.username,
        role: decodedUser.role,
      };
      setUser(userData);
      dispatch(fetchCurrentLicense());
      return { user: userData };
    },
    [dispatch]
  );

  const contextValue = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      loading,
      login,
      logout,
    }),
    [user, loading, login, logout]
  );

  return (
    <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>
  );
};
