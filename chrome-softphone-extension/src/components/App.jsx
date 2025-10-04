import React, { useState, useEffect, useRef } from "react";
import Login from "./Login";
import SoftphoneBar from "./SoftphoneBar";

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [showSoftphone, setShowSoftphone] = useState(false);
  const [showFloatingButton, setShowFloatingButton] = useState(true);
  const [showRestoreHint, setShowRestoreHint] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ top: 20, right: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Resize functionality
  const [softphoneHeight, setSoftphoneHeight] = useState(60); // Default height in pixels
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStartY, setResizeStartY] = useState(0);
  const [resizeStartHeight, setResizeStartHeight] = useState(0);

  // Timer ref for the restore hint
  const restoreHintTimerRef = useRef(null);

  // Load persisted state from localStorage
  useEffect(() => {
    const savedButtonState = localStorage.getItem(
      "mayday-floating-button-state"
    );
    const savedSoftphoneHeight = localStorage.getItem(
      "mayday-softphone-height"
    );

    if (savedButtonState) {
      try {
        const state = JSON.parse(savedButtonState);
        setShowFloatingButton(state.visible !== false); // Default to true if not specified
        if (state.position) {
          setButtonPosition(state.position);
        }
      } catch (error) {
        console.warn("Failed to parse floating button state:", error);
      }
    }

    if (savedSoftphoneHeight) {
      try {
        const height = parseInt(savedSoftphoneHeight, 10);
        if (height >= 60 && height <= 200) {
          setSoftphoneHeight(height);
        }
      } catch (error) {
        console.warn("Failed to parse softphone height:", error);
      }
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    const state = {
      visible: showFloatingButton,
      position: buttonPosition,
    };
    localStorage.setItem("mayday-floating-button-state", JSON.stringify(state));
  }, [showFloatingButton, buttonPosition]);

  // Save softphone height to localStorage
  useEffect(() => {
    localStorage.setItem("mayday-softphone-height", softphoneHeight.toString());
  }, [softphoneHeight]);

  // Handle restore hint timer
  useEffect(() => {
    if (!showFloatingButton) {
      // Show hint immediately when button is dismissed
      setShowRestoreHint(true);

      // Set timer to hide hint after 1 minute (60000ms)
      restoreHintTimerRef.current = setTimeout(() => {
        setShowRestoreHint(false);
      }, 60000);
    } else {
      // Clear timer and hide hint when button is restored
      setShowRestoreHint(false);
      if (restoreHintTimerRef.current) {
        clearTimeout(restoreHintTimerRef.current);
        restoreHintTimerRef.current = null;
      }
    }

    // Cleanup timer on unmount
    return () => {
      if (restoreHintTimerRef.current) {
        clearTimeout(restoreHintTimerRef.current);
        restoreHintTimerRef.current = null;
      }
    };
  }, [showFloatingButton]);

  // Resize handlers
  const handleResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeStartY(e.clientY);
    setResizeStartHeight(softphoneHeight);
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";
  };

  const handleResizeMove = (e) => {
    if (!isResizing) return;

    const deltaY = e.clientY - resizeStartY;
    const newHeight = Math.max(60, Math.min(200, resizeStartHeight + deltaY));
    setSoftphoneHeight(newHeight);
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  };

  // Add global resize event listeners
  useEffect(() => {
    if (isResizing) {
      const handleMouseMove = (e) => handleResizeMove(e);
      const handleMouseUp = () => handleResizeEnd();

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isResizing, resizeStartY, resizeStartHeight]);

  useEffect(() => {
    // Check initial authentication state
    chrome.storage.local.get("token", (result) => {
      if (result.token) {
        setIsAuthenticated(true);
        setShowSoftphone(true); // Auto-show softphone if authenticated
      }
      setIsLoading(false);
    });

    // Listen for storage changes to handle logout
    const handleStorageChange = (changes, namespace) => {
      if (namespace === "local" && changes.token) {
        if (changes.token.newValue) {
          setIsAuthenticated(true);
          setShowSoftphone(true);
        } else {
          setIsAuthenticated(false);
          setShowSoftphone(false);
          setShowLogin(false);
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    // Listen for messages from background script
    const messageListener = (request, sender, sendResponse) => {
      if (request.type === "toggle_login") {
        setShowLogin(true);
      } else if (request.type === "toggle_softphone") {
        setShowSoftphone(!showSoftphone);
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    // Listen for incoming call events from content script
    const handleIncomingCall = (event) => {
      // console.log("[App] 🔔 Incoming call event received:", event);
      // Forward the event to the SoftphoneBar component
      window.dispatchEvent(
        new CustomEvent("sip_incoming_call", {
          detail: event.detail,
        })
      );
    };

    window.addEventListener("incoming_call", handleIncomingCall);

    // Listen for keyboard shortcut to restore floating button (Ctrl+Shift+M)
    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.shiftKey && event.key === "M") {
        setShowFloatingButton(true);
        setButtonPosition({ top: 20, right: 20 }); // Reset to default position
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
      chrome.runtime.onMessage.removeListener(messageListener);
      window.removeEventListener("incoming_call", handleIncomingCall);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showSoftphone]);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setShowLogin(false);
    setShowSoftphone(true);
  };

  const handleLoginCancel = () => {
    setShowLogin(false);
  };

  const toggleSoftphone = () => {
    if (!isAuthenticated) {
      setShowLogin(true);
    } else {
      setShowSoftphone(!showSoftphone);
    }
  };

  const dismissFloatingButton = () => {
    setShowFloatingButton(false);
  };

  // Drag handlers
  const handleMouseDown = (e) => {
    if (e.target.closest(".close-button")) {
      return; // Don't start drag if clicking the close button
    }

    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });

    // Prevent text selection and other default behaviors
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    e.preventDefault();

    // Calculate new position
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;

    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const buttonSize = 50; // Button is 50px x 50px

    // Constrain to viewport bounds
    const constrainedX = Math.max(
      0,
      Math.min(newX, viewportWidth - buttonSize)
    );
    const constrainedY = Math.max(
      0,
      Math.min(newY, viewportHeight - buttonSize)
    );

    // Convert to top/right positioning
    setButtonPosition({
      top: constrainedY,
      right: viewportWidth - constrainedX - buttonSize,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add mouse move and mouse up listeners to document when dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "none"; // Prevent text selection while dragging

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.userSelect = "";
      };
    }
  }, [isDragging, dragOffset]);

  if (isLoading) {
    return null; // Don't show anything while loading
  }

  return (
    <div>
      {/* Floating toggle button */}
      {showFloatingButton && (
        <div
          onMouseDown={handleMouseDown}
          style={{
            position: "fixed",
            top: `${buttonPosition.top}px`,
            right: `${buttonPosition.right}px`,
            width: "50px",
            height: "50px",
            backgroundColor: isAuthenticated ? "#27ae60" : "#3498db",
            borderRadius: "50%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            cursor: isDragging ? "grabbing" : "grab",
            zIndex: 2147483646,
            boxShadow: isDragging
              ? "0 8px 20px rgba(0,0,0,0.5)"
              : "0 4px 12px rgba(0,0,0,0.3)",
            transition: isDragging ? "none" : "all 0.3s ease",
            border: "2px solid white",
            userSelect: "none",
            transform: isDragging ? "scale(1.1)" : "scale(1)",
          }}
          onMouseEnter={(e) => {
            if (!isDragging) {
              e.target.style.transform = "scale(1.1)";
              e.target.style.boxShadow = "0 6px 16px rgba(0,0,0,0.4)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isDragging) {
              e.target.style.transform = "scale(1)";
              e.target.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
            }
          }}
          onClick={!isDragging ? toggleSoftphone : undefined}
          title={
            isAuthenticated
              ? showSoftphone
                ? "Hide Mayday Softphone (Drag to move, X to dismiss)"
                : "Show Mayday Softphone (Drag to move, X to dismiss)"
              : "Login to Mayday Softphone (Drag to move, X to dismiss)"
          }
        >
          {/* Close button */}
          <div
            className="close-button"
            onClick={(e) => {
              e.stopPropagation();
              dismissFloatingButton();
            }}
            style={{
              position: "absolute",
              top: "-8px",
              right: "-8px",
              width: "20px",
              height: "20px",
              backgroundColor: "#e74c3c",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "white",
              fontSize: "12px",
              fontWeight: "bold",
              border: "2px solid white",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#c0392b";
              e.target.style.transform = "scale(1.1)";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "#e74c3c";
              e.target.style.transform = "scale(1)";
            }}
            title="Dismiss button (Ctrl+Shift+M to restore)"
          >
            ×
          </div>

          {/* Phone icon */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="white"
            style={{
              transform: showSoftphone ? "rotate(135deg)" : "rotate(0deg)",
              transition: "transform 0.3s ease",
              pointerEvents: "none", // Prevent icon from interfering with drag
            }}
          >
            <path d="M6.62,10.79C8.06,13.62 10.38,15.94 13.21,17.38L15.41,15.18C15.69,14.9 16.08,14.82 16.43,14.93C17.55,15.3 18.75,15.5 20,15.5A1,1 0 0,1 21,16.5V20A1,1 0 0,1 20,21A17,17 0 0,1 3,4A1,1 0 0,1 4,3H7.5A1,1 0 0,1 8.5,4C8.5,5.25 8.7,6.45 9.07,7.57C9.18,7.92 9.1,8.31 8.82,8.59L6.62,10.79Z" />
          </svg>

          {/* Authentication indicator dot */}
          {!isAuthenticated && (
            <div
              style={{
                position: "absolute",
                top: "-5px",
                right: "-5px",
                width: "16px",
                height: "16px",
                backgroundColor: "#e74c3c",
                borderRadius: "50%",
                border: "2px solid white",
                pointerEvents: "none",
              }}
            />
          )}
        </div>
      )}

      {/* Restore button hint - show if button is dismissed and within the 1-minute window */}
      {!showFloatingButton && showRestoreHint && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            color: "white",
            padding: "8px 12px",
            borderRadius: "6px",
            fontSize: "12px",
            zIndex: 2147483645,
            animation: "fadeIn 0.5s ease-in-out",
            userSelect: "none",
          }}
        >
          Press Ctrl+Shift+M to restore Mayday Floating Bar!
        </div>
      )}

      {/* Show softphone bar if enabled */}
      {showSoftphone && (
        <SoftphoneBar
          isAuthenticated={isAuthenticated}
          height={softphoneHeight}
          onResizeStart={handleResizeStart}
        />
      )}

      {/* Show login modal when requested */}
      {showLogin && (
        <Login
          onLoginSuccess={handleLoginSuccess}
          onCancel={handleLoginCancel}
        />
      )}

      {/* Add CSS animation */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default App;
