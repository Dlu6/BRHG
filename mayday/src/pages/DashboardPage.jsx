import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { protectedAPI } from "../services/api";
import { LogoutOutlined } from "@ant-design/icons";
import "./DashboardPage.css";

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await protectedAPI.getDashboard();
      setDashboardData(response.data);
    } catch (err) {
      setError(err.message || "Failed to fetch dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        {/* Dashboard Header */}
        <div className="dashboard-header">
          <div className="welcome-section">
            <h1>Welcome back, {user?.name}!</h1>
            <p>Here's what's happening with your account today.</p>
          </div>
          <div className="header-actions">
            <button onClick={handleLogout} className="logout-button">
              Logout
              <LogoutOutlined />
            </button>
          </div>
        </div>

        {/* User Info Card */}
        <div className="user-info-card">
          <h2>Account Information</h2>
          <div className="user-details">
            <div className="detail-item">
              <span className="label">Name:</span>
              <span className="value">{user?.name}</span>
            </div>
            <div className="detail-item">
              <span className="label">Email:</span>
              <span className="value">{user?.email}</span>
            </div>
            <div className="detail-item">
              <span className="label">Role:</span>
              <span className={`value role-${user?.role}`}>
                {user?.role === "admin" ? "Administrator" : "User"}
              </span>
            </div>
            <div className="detail-item">
              <span className="label">Account Status:</span>
              <span
                className={`value status-${
                  user?.isActive ? "active" : "inactive"
                }`}
              >
                {user?.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="detail-item">
              <span className="label">Last Login:</span>
              <span className="value">
                {user?.lastLogin
                  ? new Date(user.lastLogin).toLocaleString()
                  : "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Dashboard Data */}
        {error ? (
          <div className="error-card">
            <h2>Error</h2>
            <p>{error}</p>
            <button onClick={fetchDashboardData} className="retry-button">
              Try Again
            </button>
          </div>
        ) : dashboardData ? (
          <div className="dashboard-content">
            <h2>Dashboard Overview</h2>
            <div className="dashboard-grid">
              <div className="dashboard-card">
                <h3>🏠 Dashboard</h3>
                <p>{dashboardData.message}</p>
                <div className="dashboard-info">
                  <p>
                    <strong>Account Created:</strong>{" "}
                    {new Date(
                      dashboardData.dashboardData.accountCreated
                    ).toLocaleDateString()}
                  </p>
                  <p>
                    <strong>Total Logins:</strong>{" "}
                    {dashboardData.dashboardData.totalLogins}
                  </p>
                </div>
              </div>

              <div className="dashboard-card">
                <h3>🎯 Quick Actions</h3>
                <div className="quick-actions">
                  <button className="action-button">📊 View Analytics</button>
                  <button className="action-button">⚙️ Settings</button>
                  <button className="action-button">📋 Reports</button>
                </div>
              </div>

              <div className="dashboard-card">
                <h3>🔐 Security</h3>
                <div className="security-info">
                  <p>✅ Account is secure</p>
                  <p>✅ Two-factor authentication ready</p>
                  <p>✅ Regular security updates</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Admin Panel Link */}
        {user?.role === "admin" && (
          <div className="admin-section">
            <h2>Administrator Tools</h2>
            <div className="admin-actions">
              <a href="/admin" className="admin-link">
                🛠️ Admin Panel
              </a>
              <a href="/admin/users" className="admin-link">
                👥 User Management
              </a>
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <div className="navigation-section">
          <h2>Navigation</h2>
          <div className="nav-links">
            <a href="/" className="nav-link">
              🏠 Home
            </a>
            <a href="/features" className="nav-link">
              🚀 Features
            </a>
            <a href="/pricing" className="nav-link">
              💰 Pricing
            </a>
            <a href="/contact" className="nav-link">
              📞 Contact
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
