import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const ProtectedRoute = ({
  children,
  adminOnly = false,
  superAdminOnly = false,
}) => {
  const { isAuthenticated, isLoading, user, isAdmin, isSuperAdmin } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check super admin access if required
  if (superAdminOnly && !isSuperAdmin()) {
    return (
      <div className="access-denied">
        <h2>Access Denied</h2>
        <p>You don't have permission to access this page.</p>
        <p>Super Administrator access required.</p>
      </div>
    );
  }

  // Check admin access if required
  if (adminOnly && !isAdmin()) {
    return (
      <div className="access-denied">
        <h2>Access Denied</h2>
        <p>You don't have permission to access this page.</p>
        <p>Administrator access required.</p>
        <p>Current role: {user?.role}</p>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
