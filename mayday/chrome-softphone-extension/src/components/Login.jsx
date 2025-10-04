import React, { useState, useEffect } from "react";
import licenseService from "../licenseService";
import config from "../config.js";

const Login = ({ onLoginSuccess, onCancel }) => {
  const [host, setHost] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showManualHost, setShowManualHost] = useState(false);

  // Load stored host URL and auto-detect host based on current tab
  useEffect(() => {
    const loadHost = async () => {
      try {
        // First, try to load stored host URL
        const result = await chrome.storage.local.get(["hostUrl"]);
        if (result.hostUrl) {
          setHost(result.hostUrl);
          return; // Use stored host if available
        }

        // Check if chrome.tabs API is available
        if (!chrome.tabs) {
          // Fallback: Try to detect from current page URL
          try {
            const currentUrl = window.location.href;
            if (currentUrl) {
              const url = new URL(currentUrl);
              const domain = url.hostname;
              const port = url.port;

              let detectedHost = null;

              // Explicit Hugamara handling (cs.hugamara.com or any *.hugamara.com)
              if (
                domain === "cs.hugamara.com" ||
                domain.endsWith(".hugamara.com")
              ) {
                detectedHost = `${url.protocol}//cs.hugamara.com`;
              }
              // Strategy 1: If it's localhost, map to common backend ports
              else if (domain === "localhost") {
                if (port === "3000") {
                  // Dashboard on localhost:3000 -> backend on localhost:8004
                  detectedHost = `${url.protocol}//localhost:8004`;
                } else if (port === "8001") {
                  // Master server on localhost:8001 -> use same
                  detectedHost = `${url.protocol}//localhost:8001`;
                } else if (port === "8004") {
                  // Already on backend port -> use same
                  detectedHost = `${url.protocol}//localhost:8004`;
                } else {
                  // Any other localhost port -> try common backend ports
                  detectedHost = `${url.protocol}//localhost:8004`;
                }
              }
              // Strategy 2: For production domains, construct backend URL
              else if (domain.includes(".")) {
                // For any domain, try to construct the backend URL
                // Common patterns: domain.com -> domain.com or api.domain.com
                const possibleBackendHosts = [
                  domain, // Same domain (no port for production)
                  `api.${domain}`, // API subdomain
                  `backend.${domain}`, // Backend subdomain
                  domain.replace("www.", ""), // Remove www (no port)
                ];

                // For now, use the first pattern (same domain) as it's most common
                detectedHost = `${url.protocol}//${possibleBackendHosts[0]}`;
              }

              if (detectedHost) {
                setHost(detectedHost);
                return;
              }
            }
          } catch (fallbackError) {
            // Silent fallback - user can manually enter host
          }

          return; // Exit early if chrome.tabs is not available
        }

        // If chrome.tabs is available, use it
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });

        if (tab?.url) {
          const url = new URL(tab.url);
          const domain = url.hostname;
          const port = url.port;

          let detectedHost = null;

          // Explicit Hugamara handling (cs.hugamara.com or any *.hugamara.com)
          if (
            domain === "cs.hugamara.com" ||
            domain.endsWith(".hugamara.com")
          ) {
            detectedHost = `${url.protocol}//cs.hugamara.com`;
          }
          // Strategy 1: If it's localhost, map to common backend ports
          else if (domain === "localhost") {
            if (port === "3000") {
              // Dashboard on localhost:3000 -> backend on localhost:8004
              detectedHost = `${url.protocol}//localhost:8004`;
            } else if (port === "8001") {
              // Master server on localhost:8001 -> use same
              detectedHost = `${url.protocol}//localhost:8001`;
            } else if (port === "8004") {
              // Already on backend port -> use same
              detectedHost = `${url.protocol}//localhost:8004`;
            } else {
              // Any other localhost port -> try common backend ports
              detectedHost = `${url.protocol}//localhost:8004`;
            }
          }
          // Strategy 2: For production domains, construct backend URL
          else if (domain.includes(".")) {
            // For any domain, try to construct the backend URL
            // Common patterns: domain.com -> domain.com or api.domain.com
            const possibleBackendHosts = [
              domain, // Same domain (no port for production)
              `api.${domain}`, // API subdomain
              `backend.${domain}`, // Backend subdomain
              domain.replace("www.", ""), // Remove www (no port)
            ];

            // For now, use the first pattern (same domain) as it's most common
            detectedHost = `${url.protocol}//${possibleBackendHosts[0]}`;
          }

          if (detectedHost) {
            setHost(detectedHost);
          }
        }
      } catch (error) {
        // Silent error - user can manually enter host
      }
    };

    loadHost();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // For initial login, we need to use a known host or the auto-detected host
      const initialHost = host || "http://localhost:8004"; // Use auto-detected host or fallback
      // Determine API prefix from host (multi-tenant safe)
      const serverHost = initialHost;
      const hostname = new URL(serverHost).hostname;
      const apiBasePath = /(^|\.)hugamara\.com$/i.test(hostname)
        ? "/mayday-api"
        : "/api";
      const loginUrl = `${serverHost}${apiBasePath}/users/agent-login`;

      const response = await fetch(loginUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, isSoftphone: true }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `Login failed: ${response.statusText}`
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Login failed");
      }

      const { user, tokens } = data.data;

      // Use the auto-detected host (no need for backend configuration)
      // Reuse serverHost and apiBasePath computed above
      await chrome.storage.local.set({ hostUrl: serverHost, apiBasePath });

      // Validate tokens before proceeding
      if (!tokens || !tokens.sip) {
        throw new Error(
          "No authentication tokens received from server. Please contact support."
        );
      }

      // Validate SIP token format
      try {
        // Basic token validation - check if it's a valid JWT structure
        let tokenToCheck = tokens.sip;
        if (tokenToCheck.startsWith("Bearer ")) {
          tokenToCheck = tokenToCheck.substring(7);
        }

        const tokenParts = tokenToCheck.split(".");
        if (tokenParts.length !== 3) {
          throw new Error(
            `Invalid JWT format: expected 3 parts, got ${tokenParts.length}`
          );
        }

        console.log("[Login] SIP token validation passed");
        console.log(
          "[Login] Token preview:",
          tokenToCheck.substring(0, 50) + "..."
        );

        // Test decode the payload for debugging
        try {
          const payload = JSON.parse(atob(tokenParts[1]));
          console.log("[Login] Token payload preview:", {
            userId: payload.userId,
            username: payload.username,
            role: payload.role,
            extension: payload.extension,
            exp: new Date(payload.exp * 1000).toISOString(),
          });
        } catch (decodeError) {
          console.warn(
            "[Login] Could not decode token payload for preview:",
            decodeError
          );
        }
      } catch (tokenError) {
        console.error("[Login] SIP token validation failed:", tokenError);
        throw new Error(
          `Invalid authentication token received: ${tokenError.message}. Please try logging in again.`
        );
      }

      // Validate user data
      if (!user || !user.username) {
        throw new Error(
          "Incomplete user data received from server. Please contact support."
        );
      }

      // Generate client fingerprint
      console.log("[Login] Generating client fingerprint...");
      const clientFingerprint = licenseService.generateClientFingerprint();
      console.log("[Login] Client fingerprint generated:", clientFingerprint);

      // Initialize sessionResult variable outside the try block
      let sessionResult = null;

      try {
        console.log("[Login] Starting atomic session setup...");

        // Use atomic session setup instead of separate validate + create
        console.log("[Login] Setting up session atomically...");
        sessionResult = await licenseService.atomicSessionSetup(
          tokens.sip,
          user.username,
          clientFingerprint
        );
        console.log("[Login] Atomic session setup successful:", sessionResult);

        // Store session info for display - but this will be overwritten by the license fetch below
        console.log(
          "[Login] Session result for initial storage:",
          sessionResult
        );
        if (sessionResult.license) {
          const sessionLicenseInfo = {
            organization: sessionResult.license.organization,
            type: sessionResult.license.type,
            maxUsers: sessionResult.maxUsers,
            currentUsers: sessionResult.currentUsers,
            webrtcMaxUsers: 0, // Will be updated by license fetch
            features: {}, // Will be updated by license fetch
            status: "active", // Assume active if session was created
            externalManaged: false, // Will be updated by license fetch
          };

          await chrome.storage.local.set({ licenseInfo: sessionLicenseInfo });
          console.log(
            "[Login] Initial session license info stored:",
            sessionLicenseInfo
          );
        }

        // Get license information for display
        try {
          console.log("[Login] Step 3: Fetching license information...");
          const licenseResult = await licenseService.getCurrentLicense(
            tokens.sip
          );
          console.log("[Login] License information:", licenseResult);

          if (licenseResult.success && licenseResult.license) {
            // Parse features properly
            let features = {};
            if (licenseResult.license.license_type?.features) {
              try {
                features =
                  typeof licenseResult.license.license_type.features ===
                  "string"
                    ? JSON.parse(licenseResult.license.license_type.features)
                    : licenseResult.license.license_type.features;
              } catch (error) {
                console.warn("[Login] Error parsing license features:", error);
                features = {};
              }
            }

            console.log("[Login] Parsed license features:", features);

            const licenseInfo = {
              organization: licenseResult.license.organization_name,
              type: licenseResult.license.license_type?.name,
              status: licenseResult.license.status,
              maxUsers:
                licenseResult.license.license_type?.max_concurrent_users,
              webrtcMaxUsers:
                licenseResult.license.webrtc_allocation?.webrtc_max_users ||
                licenseResult.license.webrtc_max_users ||
                0,
              externalManaged: licenseResult.external_managed,
              features: features,
            };

            await chrome.storage.local.set({ licenseInfo });
            console.log("[Login] License info stored:", licenseInfo);
          }
        } catch (licenseError) {
          console.warn("[Login] Could not fetch license info:", licenseError);
          // Don't fail login if license info fetch fails
        }

        console.log("[Login] ✅ Atomic session setup completed successfully");
      } catch (error) {
        // Enhanced error handling
        let userMessage = "Failed to set up user session. ";

        if (error.message.includes("Maximum user limit reached")) {
          userMessage +=
            "The maximum number of users for your license is currently active. Please wait for another user to log out or contact your administrator.";
        } else if (
          error.message.includes("WebRTC Extension is not allocated")
        ) {
          userMessage +=
            "WebRTC Extension access is not configured for your license. Please contact your administrator to enable this feature.";
        } else if (error.message.includes("already logged in")) {
          userMessage +=
            "You are already logged in from another device. Only one session per user is allowed. Please try logging in again in a few moments, or contact your administrator if the issue persists.";
        } else if (error.message.includes("not enabled in your license")) {
          userMessage +=
            "Your current license plan does not include WebRTC Extension access. Please contact your administrator to upgrade your license.";
        } else if (error.message.includes("409")) {
          userMessage +=
            "Session conflict detected. This usually happens when a previous session wasn't properly closed. Please try logging in again in a few moments, or contact your administrator if the issue persists.";
        } else {
          userMessage += error.message;
        }

        console.error("[Login] Session setup failed:", {
          error: error.message,
          status: error.status,
          response: error.response,
        });

        setError(userMessage);
        setLoading(false);
        return;
      }

      // Store all necessary data
      console.log("[Login] Step 3: Storing user data...");
      const storageData = {
        token: tokens.sip,
        licenseToken: tokens.license,
        user: user,
        hostUrl: serverHost, // Store the host URL from server response
        sip_server: user.pjsip?.server,
        sip_extension: user.extension,
        sip_password: user.pjsip?.password,
        sip_transport: user.pjsip?.transport || "wss",
        sip_ws_port: user.pjsip?.wsPort || "8089",
        webrtc_enabled: user.pjsip?.webrtc || false,
        ice_servers: user.pjsip?.ice_servers || [
          { urls: "stun:stun.l.google.com:19302" },
        ],
        ws_servers: user.pjsip?.ws_servers || null,
        clientFingerprint: clientFingerprint,
        sessionInfo: {
          maxUsers: sessionResult?.maxUsers || 0,
          currentUsers: sessionResult?.currentUsers || 0,
          sessionToken: sessionResult?.sessionToken || null,
          hostUrl: serverHost, // Also store in session info
        },
      };

      console.log("[Login] Storing data in chrome.storage.local:", {
        hasToken: !!storageData.token,
        hasUser: !!storageData.user,
        hasSessionInfo: !!storageData.sessionInfo,
        ws_servers: storageData.ws_servers,
        sip_server: storageData.sip_server,
        sip_extension: storageData.sip_extension,
      });

      chrome.storage.local.set(storageData, () => {
        if (chrome.runtime.lastError) {
          console.error("[Login] Storage error:", chrome.runtime.lastError);
          throw new Error(
            `Failed to save login data: ${chrome.runtime.lastError.message}`
          );
        }

        console.log(
          "[Login] Data stored successfully, sending login_success message"
        );
        chrome.runtime.sendMessage({ type: "login_success" }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn(
              "[Login] Background script message warning:",
              chrome.runtime.lastError
            );
          } else {
            console.log("[Login] Background script responded:", response);
          }
        });

        console.log("[Login] Calling onLoginSuccess callback");
        onLoginSuccess();
      });
    } catch (err) {
      console.error("[Login] Login process failed:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && onCancel) {
      onCancel();
    }
  };

  const handleClose = () => {
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 2147483647,
        backdropFilter: "blur(12px)",
        animation: "fadeIn 0.3s ease-out",
      }}
    >
      <div
        style={{
          backgroundColor: "#0f0f0f",
          borderRadius: "20px",
          boxShadow:
            "0 32px 64px rgba(0, 0, 0, 0.9), 0 16px 32px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
          minWidth: "420px",
          maxWidth: "500px",
          maxHeight: "90vh",
          position: "relative",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          background:
            "linear-gradient(145deg, #0f0f0f 0%, #1a1a1a 50%, #0f0f0f 100%)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          animation: "slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Scrollable content container */}
        <div
          style={{
            padding: "48px 40px 40px 40px",
            overflowY: "auto",
            maxHeight: "calc(90vh - 40px)",
            scrollbarWidth: "thin",
            scrollbarColor: "#6366f1 #0f0f0f",
          }}
        >
          {/* Close button */}
          {onCancel && (
            <button
              onClick={handleClose}
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                fontSize: "20px",
                cursor: "pointer",
                color: "#a1a1aa",
                padding: "10px",
                borderRadius: "12px",
                width: "44px",
                height: "44px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                zIndex: 10,
                backdropFilter: "blur(8px)",
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "rgba(239, 68, 68, 0.1)";
                e.target.style.borderColor = "rgba(239, 68, 68, 0.3)";
                e.target.style.color = "#ef4444";
                e.target.style.transform = "scale(1.05)";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
                e.target.style.borderColor = "rgba(255, 255, 255, 0.1)";
                e.target.style.color = "#a1a1aa";
                e.target.style.transform = "scale(1)";
              }}
              title="Close"
            >
              ✕
            </button>
          )}

          {/* Header with Logo */}
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            {/* Logo Container */}
            <div
              style={{
                width: "88px",
                height: "88px",
                margin: "0 auto 24px auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#ffffff",
                borderRadius: "20px",
                boxShadow:
                  "0 12px 32px rgba(99, 102, 241, 0.3), 0 4px 16px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.8)",
                border: "2px solid rgba(99, 102, 241, 0.2)",
                position: "relative",
                overflow: "hidden",
                animation: "logoFloat 3s ease-in-out infinite",
              }}
            >
              {/* Use the logo with fallbacks */}
              <img
                src={chrome.runtime.getURL("logo128.png")}
                alt="Mayday Logo"
                style={{
                  width: "64px",
                  height: "64px",
                  filter: "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))",
                  backgroundColor: "transparent",
                }}
                onError={(e) => {
                  // Fallback to icon if logo fails to load
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "flex";
                }}
              />
              {/* Fallback icon if both logos don't load */}
              <div
                style={{
                  display: "none",
                  width: "64px",
                  height: "64px",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "36px",
                  color: "#6366f1",
                  filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))",
                }}
              >
                📞
              </div>
            </div>

            <h1
              style={{
                margin: "0 0 12px 0",
                color: "#ffffff",
                fontWeight: "800",
                fontSize: "32px",
                letterSpacing: "-0.8px",
                paddingRight: onCancel ? "60px" : "0",
                background: "linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Mayday Bar
            </h1>
            <p
              style={{
                margin: 0,
                color: "#a1a1aa",
                fontSize: "15px",
                fontWeight: "500",
                paddingRight: "60px",
                letterSpacing: "0.2px",
              }}
            >
              Professional WebRTC Extension
            </p>
          </div>

          {/* License info notice */}
          <div
            style={{
              backgroundColor: "rgba(99, 102, 241, 0.08)",
              border: "1px solid rgba(99, 102, 241, 0.2)",
              borderRadius: "16px",
              padding: "20px 24px",
              marginBottom: "32px",
              fontSize: "14px",
              color: "#a5b4fc",
              boxShadow:
                "0 8px 24px rgba(99, 102, 241, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
              fontWeight: "500",
              lineHeight: "1.6",
              backdropFilter: "blur(8px)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "12px",
              }}
            >
              <span style={{ fontSize: "18px", marginRight: "10px" }}>🔐</span>
              <strong style={{ color: "#ffffff", fontSize: "15px" }}>
                Security & Licensing
              </strong>
            </div>
            <div style={{ color: "#cbd5e1", lineHeight: "1.6" }}>
              This extension enforces enterprise-grade security with user limits
              and concurrent session restrictions. Only one active session per
              user is permitted for maximum security.
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "24px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "12px",
                  fontWeight: "700",
                  color: "#ffffff",
                  fontSize: "15px",
                  letterSpacing: "0.3px",
                }}
              >
                Host Server
              </label>
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <input
                  type="url"
                  value={host || "Not configured"}
                  onChange={(e) => setHost(e.target.value)}
                  disabled={!showManualHost}
                  required
                  placeholder="https://your-backend-server.com"
                  style={{
                    width: "100%",
                    padding: "16px 20px",
                    border: host
                      ? "2px solid #10b981"
                      : "2px solid rgba(99, 102, 241, 0.3)",
                    borderRadius: "16px",
                    fontSize: "15px",
                    backgroundColor: "rgba(15, 15, 15, 0.8)",
                    color: host ? "#10b981" : "#a5b4fc",
                    boxShadow: host
                      ? "0 8px 24px rgba(16, 185, 129, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
                      : "0 8px 24px rgba(99, 102, 241, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
                    fontWeight: "500",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    opacity: showManualHost ? 1 : 0.7,
                    cursor: showManualHost ? "text" : "not-allowed",
                    backdropFilter: "blur(8px)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    right: "16px",
                    color: host ? "#10b981" : "#6366f1",
                    fontSize: "18px",
                    filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {host ? (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  ) : (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
                    </svg>
                  )}
                </div>
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: host ? "#10b981" : "#a1a1aa",
                  marginTop: "8px",
                  fontStyle: "italic",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontWeight: "500",
                }}
              >
                {host ? (
                  <>
                    <span
                      style={{
                        fontSize: "14px",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    </span>
                    <span>Auto-detected host: {host}</span>
                  </>
                ) : (
                  <>
                    <span
                      style={{
                        fontSize: "14px",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
                      </svg>
                    </span>
                    <span>
                      Host URL could not be auto-detected from current page
                    </span>
                  </>
                )}
              </div>

              {/* First-time user guidance */}
              {!host && (
                <div
                  style={{
                    marginTop: "12px",
                    padding: "12px",
                    backgroundColor: "#1a2a3a",
                    border: "1px solid #4a9eff",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "#4a9eff",
                  }}
                >
                  <div style={{ fontWeight: "600", marginBottom: "6px" }}>
                    🔧 Auto-Detection Failed
                  </div>
                  <div style={{ lineHeight: "1.4" }}>
                    The extension couldn't automatically detect your backend
                    server.
                    <br />
                    This usually happens when:
                    <br />
                    • You're not on a supported domain
                    <br />
                    • Your backend server uses a non-standard port
                    <br />• You're accessing the extension from an unsupported
                    page
                  </div>

                  {/* Manual host input option */}
                  <div
                    style={{
                      marginTop: "12px",
                      paddingTop: "12px",
                      borderTop: "1px solid #333",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setShowManualHost(!showManualHost)}
                      style={{
                        background: "none",
                        border: "1px solid #4a9eff",
                        color: "#4a9eff",
                        padding: "6px 12px",
                        borderRadius: "4px",
                        fontSize: "11px",
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = "#4a9eff";
                        e.target.style.color = "#ffffff";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = "transparent";
                        e.target.style.color = "#4a9eff";
                      }}
                    >
                      {showManualHost
                        ? "Hide Manual Input"
                        : "Manual Host Input"}
                    </button>

                    {showManualHost && (
                      <div style={{ marginTop: "8px" }}>
                        <input
                          type="url"
                          placeholder="https://your-backend-server.com"
                          value={host}
                          onChange={(e) => setHost(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            border: "1px solid #4a9eff",
                            borderRadius: "4px",
                            fontSize: "12px",
                            backgroundColor: "#1a1a1a",
                            color: "#ffffff",
                          }}
                        />
                        <div
                          style={{
                            fontSize: "10px",
                            color: "#999",
                            marginTop: "4px",
                          }}
                        >
                          ⚠️ Enter your backend server URL (e.g.,
                          https://your-domain.com)
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "12px",
                  fontWeight: "700",
                  color: "#ffffff",
                  fontSize: "15px",
                  letterSpacing: "0.3px",
                }}
              >
                Email Address
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter your email address"
                  style={{
                    width: "100%",
                    padding: "16px 20px 16px 52px",
                    border: "2px solid rgba(99, 102, 241, 0.3)",
                    borderRadius: "16px",
                    fontSize: "15px",
                    backgroundColor: "rgba(15, 15, 15, 0.8)",
                    color: "#ffffff",
                    boxShadow:
                      "0 8px 24px rgba(99, 102, 241, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
                    fontWeight: "500",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    backdropFilter: "blur(8px)",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#6366f1";
                    e.target.style.boxShadow =
                      "0 12px 32px rgba(99, 102, 241, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)";
                    e.target.style.transform = "translateY(-2px)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(99, 102, 241, 0.3)";
                    e.target.style.boxShadow =
                      "0 8px 24px rgba(99, 102, 241, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05)";
                    e.target.style.transform = "translateY(0)";
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: "20px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#6366f1",
                    fontSize: "18px",
                    filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: "32px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "12px",
                  fontWeight: "700",
                  color: "#ffffff",
                  fontSize: "15px",
                  letterSpacing: "0.3px",
                }}
              >
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  style={{
                    width: "100%",
                    padding: "16px 20px 16px 52px",
                    border: "2px solid rgba(99, 102, 241, 0.3)",
                    borderRadius: "16px",
                    fontSize: "15px",
                    backgroundColor: "rgba(15, 15, 15, 0.8)",
                    color: "#ffffff",
                    boxShadow:
                      "0 8px 24px rgba(99, 102, 241, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
                    fontWeight: "500",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    backdropFilter: "blur(8px)",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#6366f1";
                    e.target.style.boxShadow =
                      "0 12px 32px rgba(99, 102, 241, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)";
                    e.target.style.transform = "translateY(-2px)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(99, 102, 241, 0.3)";
                    e.target.style.boxShadow =
                      "0 8px 24px rgba(99, 102, 241, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05)";
                    e.target.style.transform = "translateY(0)";
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: "20px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#6366f1",
                    fontSize: "18px",
                    filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                  </svg>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "20px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "rgba(99, 102, 241, 0.1)",
                    border: "1px solid rgba(99, 102, 241, 0.2)",
                    color: "#6366f1",
                    fontSize: "18px",
                    cursor: "pointer",
                    padding: "8px",
                    borderRadius: "8px",
                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "36px",
                    height: "36px",
                    backdropFilter: "blur(8px)",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.color = "#a5b4fc";
                    e.target.style.backgroundColor = "rgba(99, 102, 241, 0.2)";
                    e.target.style.borderColor = "rgba(99, 102, 241, 0.4)";
                    e.target.style.transform = "translateY(-50%) scale(1.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = "#6366f1";
                    e.target.style.backgroundColor = "rgba(99, 102, 241, 0.1)";
                    e.target.style.borderColor = "rgba(99, 102, 241, 0.2)";
                    e.target.style.transform = "translateY(-50%) scale(1)";
                  }}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
                    </svg>
                  ) : (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div
                style={{
                  color: "#fca5a5",
                  marginBottom: "24px",
                  padding: "20px 24px",
                  backgroundColor: "rgba(239, 68, 68, 0.08)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  borderRadius: "16px",
                  fontSize: "14px",
                  lineHeight: "1.6",
                  whiteSpace: "pre-line",
                  maxHeight: "200px",
                  overflowY: "auto",
                  boxShadow:
                    "0 8px 24px rgba(239, 68, 68, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "12px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "18px",
                      marginRight: "10px",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
                    </svg>
                  </span>
                  <strong style={{ color: "#ef4444", fontSize: "15px" }}>
                    Authentication Error
                  </strong>
                </div>
                {error}

                {/* Show debug info in development */}
                {process.env.NODE_ENV === "development" && (
                  <div
                    style={{
                      marginTop: "12px",
                      padding: "12px",
                      backgroundColor: "#1a1a1a",
                      border: "1px solid #444",
                      borderRadius: "8px",
                      fontSize: "11px",
                      color: "#888",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
                    }}
                  >
                    <strong>Debug Info:</strong>
                    <br />• Host: {host}
                    <br />• Time: {new Date().toLocaleString()}
                    <br />• Check browser console for detailed logs
                  </div>
                )}
              </div>
            )}

            <div style={{ display: "flex", gap: "16px" }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  flex: 1,
                  padding: "18px 24px",
                  backgroundColor: loading
                    ? "rgba(75, 85, 99, 0.8)"
                    : "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: "16px",
                  fontSize: "16px",
                  fontWeight: "800",
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: loading
                    ? "0 4px 12px rgba(0, 0, 0, 0.2)"
                    : "0 12px 32px rgba(99, 102, 241, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
                  textTransform: "uppercase",
                  letterSpacing: "0.8px",
                  position: "relative",
                  overflow: "hidden",
                  backdropFilter: "blur(8px)",
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.target.style.background =
                      "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)";
                    e.target.style.boxShadow =
                      "0 16px 40px rgba(99, 102, 241, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3)";
                    e.target.style.transform = "translateY(-3px)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.target.style.background =
                      "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)";
                    e.target.style.boxShadow =
                      "0 12px 32px rgba(99, 102, 241, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)";
                    e.target.style.transform = "translateY(0)";
                  }
                }}
              >
                {loading ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <div
                      style={{
                        width: "18px",
                        height: "18px",
                        border: "2px solid transparent",
                        borderTop: "2px solid white",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                        marginRight: "10px",
                      }}
                    />
                    Authenticating...
                  </div>
                ) : (
                  "Sign In"
                )}
              </button>
              {onCancel && (
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  style={{
                    padding: "18px 24px",
                    backgroundColor: "rgba(239, 68, 68, 0.1)",
                    color: "#ef4444",
                    border: "2px solid rgba(239, 68, 68, 0.3)",
                    borderRadius: "16px",
                    fontSize: "16px",
                    fontWeight: "800",
                    cursor: loading ? "not-allowed" : "pointer",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow:
                      "0 8px 24px rgba(239, 68, 68, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
                    textTransform: "uppercase",
                    letterSpacing: "0.8px",
                    backdropFilter: "blur(8px)",
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.target.style.backgroundColor = "rgba(239, 68, 68, 0.2)";
                      e.target.style.borderColor = "rgba(239, 68, 68, 0.5)";
                      e.target.style.boxShadow =
                        "0 12px 32px rgba(239, 68, 68, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)";
                      e.target.style.transform = "translateY(-3px)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      e.target.style.backgroundColor = "rgba(239, 68, 68, 0.1)";
                      e.target.style.borderColor = "rgba(239, 68, 68, 0.3)";
                      e.target.style.boxShadow =
                        "0 8px 24px rgba(239, 68, 68, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)";
                      e.target.style.transform = "translateY(0)";
                    }
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          {/* Footer */}
          <div
            style={{
              marginTop: "32px",
              paddingTop: "24px",
              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
              textAlign: "center",
              fontSize: "13px",
              color: "#a1a1aa",
            }}
          >
            <p
              style={{
                margin: "0 0 12px 0",
                fontWeight: "600",
                color: "#ffffff",
              }}
            >
              Enterprise WebRTC Communication
            </p>
            <p style={{ margin: "0 0 8px 0", fontSize: "12px" }}>
              Version 1.0.3 • Powered by MM-iCT
            </p>
            <p style={{ margin: "0 0 8px 0", fontSize: "12px" }}>
              <a
                href="https://maydaycrm.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "#6366f1",
                  textDecoration: "none",
                  fontWeight: "500",
                  transition: "color 0.2s ease",
                }}
                onMouseEnter={(e) => (e.target.style.color = "#a5b4fc")}
                onMouseLeave={(e) => (e.target.style.color = "#6366f1")}
              >
                Mayday CRM
              </a>
            </p>
            <p style={{ margin: 0, fontSize: "11px", color: "#71717a" }}>
              <span style={{ marginRight: "4px" }}>©</span>
              {new Date().getFullYear()} MM-iCT. All rights reserved.
            </p>
          </div>

          {/* CSS for animations and styling */}
          <style>
            {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            
            @keyframes fadeIn {
              0% { 
                opacity: 0; 
                backdrop-filter: blur(0px);
              }
              100% { 
                opacity: 1; 
                backdrop-filter: blur(12px);
              }
            }
            
            @keyframes slideIn {
              0% { 
                opacity: 0; 
                transform: translateY(30px) scale(0.95);
              }
              100% { 
                opacity: 1; 
                transform: translateY(0) scale(1);
              }
            }
            
            @keyframes logoFloat {
              0%, 100% { 
                transform: translateY(0px); 
              }
              50% { 
                transform: translateY(-4px); 
              }
            }
            
            /* Custom scrollbar styles for webkit browsers */
            ::-webkit-scrollbar {
              width: 8px;
            }
            
            ::-webkit-scrollbar-track {
              background: rgba(15, 15, 15, 0.8);
              border-radius: 4px;
            }
            
            ::-webkit-scrollbar-thumb {
              background: linear-gradient(135deg, #6366f1, #8b5cf6);
              border-radius: 4px;
            }
            
            ::-webkit-scrollbar-thumb:hover {
              background: linear-gradient(135deg, #7c3aed, #a855f7);
            }
            
            /* Input focus animations */
            input:focus {
              outline: none !important;
            }
            
            /* Button ripple effect */
            button {
              position: relative;
              overflow: hidden;
            }
            
            button::before {
              content: '';
              position: absolute;
              top: 50%;
              left: 50%;
              width: 0;
              height: 0;
              background: rgba(255, 255, 255, 0.1);
              border-radius: 50%;
              transform: translate(-50%, -50%);
              transition: width 0.6s, height 0.6s;
            }
            
            button:active::before {
              width: 300px;
              height: 300px;
            }
          `}
          </style>
        </div>
      </div>
    </div>
  );
};

export default Login;
