import React, { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./Header.css"; // We'll create this CSS file next
import maydaylogo from "../assets/images/logo.svg";
import { LogoutOutlined, UserOutlined } from "@ant-design/icons";

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, isLoading } = useAuth();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const toggleUserMenu = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  const handleLogout = async () => {
    try {
      await logout();
      setIsUserMenuOpen(false);
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Close menus on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
  }, [location]);

  // Effect for header scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isUserMenuOpen && !event.target.closest(".user-menu-container")) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isUserMenuOpen]);

  return (
    <header
      className={`app-header ${isScrolled ? "scrolled" : ""} ${
        isMobileMenuOpen ? "menu-open" : ""
      }`}
    >
      <div className="logo">
        <NavLink to="/">
          <img src={maydaylogo} alt="Mayday Logo" className="header-logo-img" />
          <div className="logo-text-container">
            <h1 className="header-logo-text">Mayday</h1>
            <span className="header-tagline">...a CRM built for urgency!</span>
          </div>
        </NavLink>
      </div>
      <nav className={`main-nav ${isMobileMenuOpen ? "open" : ""}`}>
        <ul>
          <li>
            <NavLink
              to="/"
              className={({ isActive }) => (isActive ? "active" : "")}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Product
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/features"
              className={({ isActive }) => (isActive ? "active" : "")}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Features
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/pricing"
              className={({ isActive }) => (isActive ? "active" : "")}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Pricing
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/solutions"
              className={({ isActive }) => (isActive ? "active" : "")}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Solutions
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/contact"
              className={({ isActive }) => (isActive ? "active" : "")}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Contact Us
            </NavLink>
          </li>

          {/* Authenticated user navigation */}
          {isAuthenticated && (
            <>
              <li>
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) => (isActive ? "active" : "")}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Dashboard
                </NavLink>
              </li>
              {(user?.role === "admin" || user?.role === "super_admin") && (
                <li>
                  <NavLink
                    to="/admin"
                    className={({ isActive }) => (isActive ? "active" : "")}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Admin
                  </NavLink>
                </li>
              )}
            </>
          )}
        </ul>
      </nav>

      <div className="header-actions">
        {isLoading ? (
          <div className="auth-loading">
            <span className="loading-spinner-small"></span>
          </div>
        ) : isAuthenticated ? (
          <div className="user-menu-container">
            <button
              className="user-menu-button"
              onClick={toggleUserMenu}
              aria-label="User menu"
              aria-expanded={isUserMenuOpen}
            >
              <span className="user-avatar">
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </span>
              <span className="user-name">{user?.name}</span>
              <span
                className={`dropdown-arrow ${isUserMenuOpen ? "open" : ""}`}
              >
                ▼
              </span>
            </button>

            {isUserMenuOpen && (
              <div className="user-dropdown">
                <div className="user-info">
                  <div className="user-details">
                    <span className="user-display-name">{user?.name}</span>
                    <span className="user-email">{user?.email}</span>
                    <span className={`user-role role-${user?.role}`}>
                      {user?.role === "super_admin"
                        ? "Super Admin"
                        : user?.role === "admin"
                        ? "Administrator"
                        : "User"}
                    </span>
                  </div>
                </div>
                <div className="dropdown-divider"></div>
                <div className="dropdown-links">
                  <NavLink
                    to="/dashboard"
                    className="dropdown-link"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    🏠 Dashboard
                  </NavLink>
                  {(user?.role === "admin" || user?.role === "super_admin") && (
                    <NavLink
                      to="/admin"
                      className="dropdown-link"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      🛠️ Admin Panel
                    </NavLink>
                  )}
                </div>
                <div className="dropdown-divider"></div>
                <button className="logout-button" onClick={handleLogout}>
                  Logout
                  <LogoutOutlined
                    style={{ fontSize: "16px", marginLeft: "5px" }}
                  />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="login-only-actions">
            <NavLink to="/login" className="login-button">
              <UserOutlined />
              Manager
            </NavLink>
          </div>
        )}
      </div>

      <button
        className="hamburger-menu"
        onClick={toggleMobileMenu}
        aria-label="Toggle menu"
        aria-expanded={isMobileMenuOpen}
      >
        {/* Simple hamburger icon using spans */}
        <span></span>
        <span></span>
        <span></span>
      </button>
    </header>
  );
};

export default Header;
