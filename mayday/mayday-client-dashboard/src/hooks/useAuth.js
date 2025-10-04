import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loginUser, logoutUser, restoreUser } from "../features/auth/authSlice";

// useAuth hook that checks if the user is authenticated
const useAuth = () => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);

  // Select user state and login/restore status from Redux store
  const user = useSelector((state) => state.auth.user);
  const status = useSelector((state) => state.auth.status);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const savedUser = JSON.parse(localStorage.getItem("user"));
        const token = localStorage.getItem("token");

        if (savedUser && token) {
          await dispatch(restoreUser({ user: savedUser, token })).unwrap();
        } else {
          dispatch(logoutUser());
        }
      } catch (error) {
        console.error("Auth restore failed:", error);
        dispatch(logoutUser());
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [dispatch]);

  // Login function
  const login = async (username, password) => {
    try {
      const result = await dispatch(loginUser({ username, password })).unwrap();

      // Store in localStorage (temporary, consider more secure options later)
      localStorage.setItem("user", JSON.stringify(result.user));
      localStorage.setItem("token", result.token);

      return result;
    } catch (error) {
      console.error("Login failed:", error);
      throw new Error(error || "Login failed");
    }
  };

  // Logout function
  const logout = () => {
    dispatch(logoutUser());
  };

  return {
    user,
    // Combine initial loading check with Redux status
    loading: loading || status === "loading",
    isAuthenticated: !!user,
    login,
    logout,
  };
};

export default useAuth;
