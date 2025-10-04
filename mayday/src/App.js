import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Header from "./components/Header";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";

// Public pages
import HomePage from "./pages/HomePage";
import FeaturesPage from "./pages/FeaturesPage";
import SolutionsPage from "./pages/SolutionsPage";
import PricingPage from "./pages/PricingPage";
import ContactPage from "./pages/ContactPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";

// Authentication pages
import LoginPage from "./pages/LoginPage";

// Protected pages
import DashboardPage from "./pages/DashboardPage";
import AdminPage from "./pages/AdminPage";

import "./App.css"; // General app styles

function App() {
  return (
    <AuthProvider>
      <Router
      // basename="/web"
      >
        <div className="App">
          <Header />
          <main>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/features" element={<FeaturesPage />} />
              <Route path="/solutions" element={<SolutionsPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />

              {/* Authentication Routes */}
              <Route path="/login" element={<LoginPage />} />

              {/* Protected Routes - Require Authentication */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes - Require Admin Role (admin or super_admin) */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute adminOnly={true}>
                    <AdminPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute adminOnly={true}>
                    <AdminPage />
                  </ProtectedRoute>
                }
              />

              {/* 404 Route - Add this as the last route */}
              <Route
                path="*"
                element={
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: "60vh",
                      textAlign: "center",
                      padding: "20px",
                    }}
                  >
                    <h1
                      style={{
                        fontSize: "4rem",
                        margin: "0",
                        color: "#667eea",
                      }}
                    >
                      404
                    </h1>
                    <h2 style={{ color: "#333", marginBottom: "1rem" }}>
                      Page Not Found
                    </h2>
                    <p style={{ color: "#666", marginBottom: "2rem" }}>
                      The page you're looking for doesn't exist.
                    </p>
                    <a
                      href="/"
                      style={{
                        background:
                          "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        color: "white",
                        padding: "12px 24px",
                        borderRadius: "8px",
                        textDecoration: "none",
                        fontWeight: "600",
                      }}
                    >
                      Go Home
                    </a>
                  </div>
                }
              />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
