import React, { useState, useEffect, useCallback } from "react";
import LoginElectron from "./components/LoginElectron";
import Appbar from "./components/Appbar";
import ErrorBoundary from "./components/ErrorBoundary";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import PropTypes from "prop-types";

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Check for existing auth on mount
  useEffect(() => {
    const storedUserData = localStorage.getItem("userData");
    const authToken = localStorage.getItem("authToken");

    if (storedUserData && authToken) {
      setUserData(JSON.parse(storedUserData));
      setIsAuthenticated(true);
      navigate("/appbar");
    }
  }, []);

  const handleLoginSuccess = (data) => {
    setUserData(data);
    setIsAuthenticated(true);
  };

  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
    setUserData(null);
    navigate("/");
  }, [navigate]);

  // Protected Route component
  const ProtectedRoute = ({ children }) => {
    if (!isAuthenticated || !userData) {
      return <Navigate to="/" replace />;
    }
    return children;
  };

  ProtectedRoute.propTypes = {
    children: PropTypes.node.isRequired,
  };

  const handleSectionChange = (sectionId) => {
    setActiveSection(sectionId);
    localStorage.setItem("lastActiveSection", sectionId);
  };

  // Load last active section on mount
  useEffect(() => {
    const lastSection = localStorage.getItem("lastActiveSection");
    if (lastSection) {
      setActiveSection(lastSection);
    }
  }, []);

  const handleToggleCollapse = useCallback((collapsed) => {
    setIsCollapsed(collapsed);
  }, []);

  return (
    <Routes>
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to="/appbar" replace />
          ) : (
            <LoginElectron onLoginSuccess={handleLoginSuccess} />
          )
        }
      />
      <Route
        path="/appbar"
        element={
          <ProtectedRoute>
            <ErrorBoundary>
              <Appbar
                username={userData?.username}
                registrationTime={userData?.registrationTime}
                registrationStatus={userData?.registrationStatus}
                onLogout={handleLogout}
                activeSection={activeSection}
                onSectionChange={handleSectionChange}
                onToggleCollapse={handleToggleCollapse}
                isCollapsed={isCollapsed}
              />
            </ErrorBoundary>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default App;
