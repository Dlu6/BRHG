import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { adminAPI, licenseAPI } from "../services/api";
import "./AdminPage.css";
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  Table,
  DatePicker,
  InputNumber,
  Space,
  Switch,
} from "antd";
import moment from "moment";
import { LogoutOutlined } from "@ant-design/icons";
import { io } from "socket.io-client";

const { Option } = Select;

const AdminPage = () => {
  const { user, logout } = useAuth();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isUpdateModalVisible, setIsUpdateModalVisible] = useState(false);
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const [editingLicense, setEditingLicense] = useState(null);
  const [selectedLicense, setSelectedLicense] = useState(null);
  // const [licenseToSuspend, setLicenseToSuspend] = useState(null);
  const [licenseAction, setLicenseAction] = useState(null);
  const [adminData, setAdminData] = useState(null);
  const [usersData, setUsersData] = useState(null);
  const [licenses, setLicenses] = useState([]);
  const [licenseTypes, setLicenseTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [notification, setNotification] = useState(null);
  const [userAction, setUserAction] = useState(null);
  const [isUserConfirmModalVisible, setIsUserConfirmModalVisible] =
    useState(false);
  const [webRTCData, setWebRTCData] = useState({});
  const [isWebRTCModalVisible, setIsWebRTCModalVisible] = useState(false);
  const [licenseUsers, setLicenseUsers] = useState([]);
  const [isUserWebRTCModalVisible, setIsUserWebRTCModalVisible] =
    useState(false);
  const [isFingerprintModalVisible, setIsFingerprintModalVisible] =
    useState(false);
  const [fingerprintForm] = Form.useForm();
  const [availableFingerprints, setAvailableFingerprints] = useState([]);
  const [allFeatures, setAllFeatures] = useState({});

  // License Type State
  const [isLicenseTypeModalVisible, setIsLicenseTypeModalVisible] =
    useState(false);
  const [editingLicenseType, setEditingLicenseType] = useState(null);
  const [licenseTypeForm] = Form.useForm();

  // Slave Server State
  const [slaveServers, setSlaveServers] = useState([]);
  const [isSlaveServerModalVisible, setIsSlaveServerModalVisible] =
    useState(false);
  const [editingSlaveServer, setEditingSlaveServer] = useState(null);
  const [isSlaveServerHealthModalVisible, setIsSlaveServerHealthModalVisible] =
    useState(false);
  const [slaveServerHealthData, setSlaveServerHealthData] = useState([]);
  const [slaveServerForm] = Form.useForm();

  // Form instances - declare all forms together
  const [form] = Form.useForm();
  const [updateForm] = Form.useForm();
  const [webRTCForm] = Form.useForm();

  // Ensure forms are properly initialized
  useEffect(() => {
    try {
      // Reset forms when component mounts
      if (form) {
        form.resetFields();
      }
      if (updateForm) {
        updateForm.resetFields();
      }
      if (webRTCForm) {
        webRTCForm.resetFields();
      }
      if (fingerprintForm) {
        fingerprintForm.resetFields();
      }
    } catch (error) {
      console.warn("Form initialization warning:", error);
    }
  }, [form, updateForm, webRTCForm, fingerprintForm]);

  // Clear available fingerprints when modal is closed
  useEffect(() => {
    if (!isModalVisible) {
      setAvailableFingerprints([]);
    }
  }, [isModalVisible]);

  // Custom notification system to replace antd message
  const showNotification = (message, type = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchAdminData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const usersResponse = await adminAPI.getUsers();
      const users = usersResponse.data?.users || usersResponse.data || [];
      const totalUsers = users.length;

      setAdminData({ adminData: { totalUsers } });
      setUsersData({ data: { users: users } });
    } catch (err) {
      setError(err.message || "Failed to fetch admin data");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLicenseData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("Fetching license data...");
      const [licensesRes, typesRes] = await Promise.all([
        licenseAPI.getLicenses(),
        licenseAPI.getLicenseTypes(),
      ]);
      // console.log("License types response:", typesRes);
      // Handle the response structure - licensesRes.data contains the array
      const licensesData = licensesRes?.data || [];
      const typesData = (typesRes?.data || []).filter(
        (type) => type && type._id && type.name
      );
      // console.log("Filtered license types:", typesData);
      setLicenses(licensesData);
      setLicenseTypes(typesData);
    } catch (err) {
      console.error("Error fetching license data:", err);
      setError(err.message || err || "Failed to fetch license data");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSlaveServersData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("Fetching slave servers data...");

      const apiUrl =
        process.env.REACT_APP_LICENSE_API_URL || "http://localhost:8001";
      const response = await fetch(`${apiUrl}/slave-servers`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setSlaveServers(result.data);
        console.log(
          `Loaded ${result.data.length} slave servers:`,
          result.data.map((s) => ({ domain: s.domain, status: s.status }))
        );
      } else {
        throw new Error(result.message || "Failed to fetch slave servers");
      }
    } catch (err) {
      console.error("Error fetching slave servers:", err);
      setError(err.message || "Failed to fetch slave servers");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllFeatures = useCallback(async () => {
    try {
      const res = await licenseAPI.getAllFeatures();
      setAllFeatures(res.data);
    } catch (err) {
      console.error("Error fetching all features:", err);
    }
  }, []);

  // Helper function to communicate with specific slave servers
  const callSlaveServerAPI = useCallback(
    async (slaveServer, endpoint, options = {}) => {
      const { method = "GET", body = null, additionalHeaders = {} } = options;

      try {
        const response = await fetch(`${slaveServer.api_url}${endpoint}`, {
          method,
          headers: {
            "Content-Type": "application/json",
            "X-Internal-API-Key": process.env.REACT_APP_INTERNAL_API_KEY,
            ...additionalHeaders,
          },
          body: body ? JSON.stringify(body) : null,
        });

        if (!response.ok) {
          throw new Error(
            `${slaveServer.domain} responded with status: ${response.status}`
          );
        }

        return await response.json();
      } catch (error) {
        console.error(`Error calling ${slaveServer.domain}${endpoint}:`, error);
        throw new Error(`${slaveServer.domain}: ${error.message}`);
      }
    },
    []
  );

  // Enhanced function to check multiple servers in parallel
  const handleCheckAllServersHealth = async () => {
    try {
      setLoading(true);

      // Check all slave servers in parallel
      const healthChecks = slaveServers.map(async (server) => {
        try {
          const result = await callSlaveServerAPI(server, "/api/health");
          return {
            server_id: server._id,
            domain: server.domain,
            health_status: "healthy",
            response_data: result,
            error: null,
          };
        } catch (error) {
          return {
            server_id: server._id,
            domain: server.domain,
            health_status: "unhealthy",
            response_data: null,
            error: error.message,
          };
        }
      });

      const healthResults = await Promise.allSettled(healthChecks);
      const results = healthResults.map((result) =>
        result.status === "fulfilled"
          ? result.value
          : {
              health_status: "unhealthy",
              error: "Connection timeout or network error",
            }
      );

      setSlaveServerHealthData(results);
      setIsSlaveServerHealthModalVisible(true);

      const healthyCount = results.filter(
        (r) => r.health_status === "healthy"
      ).length;
      showNotification(
        `Health check completed: ${healthyCount}/${results.length} servers healthy`,
        healthyCount === results.length ? "success" : "warning"
      );

      fetchSlaveServersData(); // Refresh to show updated health status
    } catch (error) {
      showNotification(
        `Failed to check server health: ${error.message}`,
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "overview" || activeTab === "users") {
      fetchAdminData();
    } else if (activeTab === "licenses" || activeTab === "license-types") {
      fetchLicenseData();
      fetchAllFeatures();
    } else if (activeTab === "slave-servers") {
      fetchSlaveServersData();
    }
  }, [
    activeTab,
    fetchAdminData,
    fetchLicenseData,
    fetchSlaveServersData,
    fetchAllFeatures,
  ]);

  useEffect(() => {
    // Use the master server URL for WebSocket connection
    const socket = io(
      process.env.REACT_APP_LICENSE_API_URL || "http://localhost:8001",
      {
        path: "/socket.io/",
        transports: ["websocket", "polling"],
        timeout: 5000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      }
    );

    socket.on("connect", () => {
      console.log("AdminPage connected to WebSocket for license updates.");
    });

    socket.on("connect_error", (error) => {
      console.warn("WebSocket connection failed:", error.message);
      // Don't show error notification to user as this is not critical
    });

    const handleLicenseUpdate = (data) => {
      console.log("Received license update from server:", data);
      showNotification(
        "License information has been updated. Refreshing...",
        "info"
      );
      // This function already exists in your component and will refetch the data
      fetchLicenseData();
    };

    // Listen for the custom event from the backend
    socket.on("license:updated", handleLicenseUpdate);

    // Clean up when the component unmounts to prevent memory leaks
    return () => {
      socket.off("license:updated", handleLicenseUpdate);
      socket.off("connect_error");
      socket.disconnect();
    };
  }, [fetchLicenseData]); // fetchLicenseData is a dependency

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const handleUserAction = (user, action) => {
    setUserAction({ user, action });
    setIsUserConfirmModalVisible(true);
  };

  const handleConfirmUserAction = async () => {
    if (!userAction) return;
    const { user, action } = userAction;

    try {
      let result;
      if (action === "suspend") {
        result = await adminAPI.updateUser(user._id, { isActive: false });
        if (result.success) {
          showNotification(
            result.message || "User suspended successfully!",
            "success"
          );
        } else {
          showNotification(
            result.error || result.message || "Failed to suspend user.",
            "error"
          );
          return;
        }
      } else if (action === "activate") {
        result = await adminAPI.verifyUser(user._id);
        if (result.success) {
          showNotification(
            result.message || "User activated successfully!",
            "success"
          );
        } else {
          showNotification(
            result.error || result.message || "Failed to activate user.",
            "error"
          );
          return;
        }
      } else if (action === "delete") {
        result = await adminAPI.deleteUser(user._id);
        if (result.success) {
          showNotification(
            result.message || "User deleted successfully!",
            "success"
          );
        } else {
          showNotification(
            result.error || result.message || "Failed to delete user.",
            "error"
          );
          return;
        }
      }
      fetchAdminData(); // Refresh list
    } catch (err) {
      showNotification(
        `Failed to perform action: ${err.message || err}`,
        "error"
      );
    } finally {
      setIsUserConfirmModalVisible(false);
      setUserAction(null);
    }
  };

  const handleCancelUserAction = () => {
    setIsUserConfirmModalVisible(false);
    setUserAction(null);
  };

  const handleUpdateStatus = async (id, status) => {
    const license = licenses.find((l) => l._id === id);
    setLicenseAction({ id, status, license });
    setIsConfirmModalVisible(true);
  };

  const handleConfirmAction = async () => {
    if (!licenseAction) return;

    try {
      const result = await licenseAPI.updateLicenseStatus(
        licenseAction.id,
        licenseAction.status
      );

      if (result.success) {
        showNotification(
          result.message || `License status updated to ${licenseAction.status}`,
          "success"
        );
        fetchLicenseData(); // Refresh list
      } else {
        showNotification(
          result.error ||
            result.message ||
            `Failed to update status to ${licenseAction.status}`,
          "error"
        );
      }
    } catch (err) {
      showNotification(
        `Failed to update status: ${err.message || err}`,
        "error"
      );
    } finally {
      setIsConfirmModalVisible(false);
      setLicenseAction(null);
    }
  };

  const handleCancelAction = () => {
    setIsConfirmModalVisible(false);
    setLicenseAction(null);
  };

  const handleGenerateLicense = async (values) => {
    try {
      setLoading(true);

      // Additional validation
      if (
        !values.organization_name ||
        !values.server_fingerprint ||
        !values.license_type_id
      ) {
        showNotification("Please fill in all required fields.", "error");
        return;
      }

      const licenseData = {
        organization_name: values.organization_name,
        server_fingerprint: values.server_fingerprint,
        license_type_id: values.license_type_id,
        issued_at: values.issued_at ? values.issued_at.toISOString() : null,
        expires_at: values.expires_at ? values.expires_at.toISOString() : null,
      };
      const result = await licenseAPI.generateLicense(licenseData);

      if (result.success) {
        showNotification(
          result.message || "License generated successfully!",
          "success"
        );
        setIsModalVisible(false);
        form.resetFields();
        fetchLicenseData(); // Refresh the list
      } else {
        showNotification(
          result.error || result.message || "Failed to generate license.",
          "error"
        );
      }
    } catch (error) {
      showNotification(
        error.message || error || "Failed to generate license.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLicense = async (values) => {
    try {
      setLoading(true);
      const updatePayload = {
        ...values,
        issued_at: values.issued_at ? values.issued_at.toISOString() : null,
        expires_at: values.expires_at ? values.expires_at.toISOString() : null,
      };
      const result = await licenseAPI.updateLicense(
        editingLicense._id,
        updatePayload
      );

      if (result.success) {
        showNotification(
          result.message || "License updated successfully!",
          "success"
        );
        setIsUpdateModalVisible(false);
        fetchLicenseData(); // Refresh list
      } else {
        showNotification(
          result.error || result.message || "Failed to update license.",
          "error"
        );
      }
    } catch (error) {
      showNotification(
        error.message || error || "Failed to update license.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleShowDetailsModal = (license) => {
    console.log("Selected license for details>>>>>>>>:", license);

    setSelectedLicense(license);
    setIsDetailsModalVisible(true);
  };

  const handleShowUpdateModal = (license) => {
    // console.log(license, "license >>>>>>>>>>>>>>>>🔥");
    setEditingLicense(license);
    updateForm.setFieldsValue({
      organization_name: license.organization_name,
      license_type_id: license.license_type?._id,
      issued_at: license.issued_at ? moment(license.issued_at) : null,
      expires_at: license.expires_at ? moment(license.expires_at) : null,
      max_users: license.max_users,
    });
    setIsUpdateModalVisible(true);
  };

  const handleShowWebRTCModal = async (license) => {
    setEditingLicense(license);

    try {
      // Use the licenseAPI service to get WebRTC sessions from the master server
      const result = await licenseAPI.getWebRTCSessions(license._id);

      if (result.success) {
        setWebRTCData(result.data);
      } else {
        throw new Error(result.message || "Failed to fetch WebRTC data");
      }
    } catch (error) {
      console.error("Error fetching WebRTC data:", error);
      showNotification(`Failed to load WebRTC data: ${error.message}`, "error");

      // Fallback to basic data structure
      const fallbackData = {
        current_sessions: 0,
        max_sessions: license.webrtc_max_users || 0,
        active_users: [],
        session_history: [],
      };
      setWebRTCData(fallbackData);
    }

    webRTCForm.setFieldsValue({
      webrtc_max_users: license.webrtc_max_users || 0,
    });
    setIsWebRTCModalVisible(true);
  };

  const handleEndWebRTCSession = async (sessionId, username) => {
    Modal.confirm({
      title: "Are you sure you want to end this session?",
      content: `This will immediately terminate the session for ${username}.`,
      okText: "End Session",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          setLoading(true);
          const result = await licenseAPI.endWebRTCSession(
            editingLicense._id,
            sessionId
          );
          if (result.success) {
            showNotification(`WebRTC session ended for ${username}`, "success");
            const refreshed = await licenseAPI.getWebRTCSessions(
              editingLicense._id
            );
            if (refreshed.success) {
              setWebRTCData(refreshed.data);
            }
          } else {
            throw new Error(result.message || "Failed to end WebRTC session");
          }
        } catch (error) {
          console.error("Error ending WebRTC session:", error);
          showNotification(
            `Failed to end session: ${error.message || "Unknown error"}`,
            "error"
          );
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleEndAllWebRTCSessions = async () => {
    Modal.confirm({
      title: "Are you sure you want to end all sessions?",
      content:
        "This will immediately terminate all active WebRTC sessions for this license.",
      okText: "End All Sessions",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          setLoading(true);
          const result = await licenseAPI.endAllWebRTCSessions(
            editingLicense._id
          );
          if (result.success) {
            showNotification(
              "All WebRTC sessions ended successfully",
              "success"
            );
            const refreshed = await licenseAPI.getWebRTCSessions(
              editingLicense._id
            );
            if (refreshed.success) {
              setWebRTCData(refreshed.data);
            }
          } else {
            throw new Error(result.message || "Failed to end all sessions");
          }
        } catch (error) {
          console.error("Error ending all WebRTC sessions:", error);
          showNotification(
            `Failed to end all sessions: ${error.message || "Unknown error"}`,
            "error"
          );
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleUpdateWebRTCAllocation = async (values) => {
    try {
      setLoading(true);

      // Use the licenseAPI service to update WebRTC allocation on the master server
      const result = await licenseAPI.updateWebRTCAllocation(
        editingLicense._id,
        {
          webrtc_max_users: values.webrtc_max_users,
        }
      );

      if (result.success) {
        showNotification(
          `WebRTC allocation updated to ${values.webrtc_max_users} users successfully!`,
          "success"
        );

        // Refresh the license data to show updated values
        fetchLicenseData();
        setIsWebRTCModalVisible(false);
      } else {
        // Handle specific error cases with better user feedback
        let errorMessage =
          result.message || "Failed to update WebRTC allocation";

        if (result.message?.includes("cannot exceed total license users")) {
          const currentTotal = editingLicense?.max_users || 0;
          const requestedAllocation = values.webrtc_max_users;
          errorMessage = `WebRTC allocation cannot exceed total license users. You requested ${requestedAllocation} users, but your license only supports ${currentTotal} total users. Please increase your license capacity first.`;
        } else if (result.message?.includes("Cannot reduce allocation")) {
          const activeSessions = result.data?.active_sessions || 0;
          const requestedAllocation = values.webrtc_max_users;
          errorMessage = `Cannot reduce WebRTC allocation to ${requestedAllocation} users while ${activeSessions} users are currently active. Please wait for some users to log out first, or contact them to disconnect.`;
        } else if (result.message?.includes("must be a non-negative number")) {
          errorMessage =
            "WebRTC allocation must be a valid number (0 or greater).";
        }

        showNotification(errorMessage, "error");
      }
    } catch (error) {
      console.error("Error updating WebRTC allocation:", error);

      // Handle network errors
      let errorMessage = "Failed to update WebRTC allocation";
      if (error.name === "TypeError" && error.message.includes("fetch")) {
        errorMessage =
          "Network error. Please check your connection and try again.";
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }

      showNotification(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleShowUserWebRTCModal = async (license) => {
    setEditingLicense(license);

    try {
      // Use the licenseAPI service to get users from the master server
      const result = await licenseAPI.getLicenseUsers(license._id);

      if (result.success) {
        setLicenseUsers(result.data);
      } else {
        throw new Error(result.message || "Failed to fetch users");
      }
    } catch (error) {
      console.error("Error fetching license users:", error);
      showNotification(
        `Failed to load license users: ${error.message}`,
        "error"
      );

      // Fallback to empty array
      setLicenseUsers([]);
    }

    setIsUserWebRTCModalVisible(true);
  };

  const handleUpdateUserWebRTCAccess = async (userId, hasAccess) => {
    try {
      // Use the licenseAPI service to update user WebRTC access on the master server
      const result = await licenseAPI.updateUserWebRTCAccess(
        editingLicense._id,
        userId,
        hasAccess
      );

      if (result.success) {
        // Update local state
        setLicenseUsers((prevUsers) =>
          prevUsers.map((user) =>
            user.id === userId ? { ...user, webrtc_access: hasAccess } : user
          )
        );

        showNotification(
          `User WebRTC access ${
            hasAccess ? "enabled" : "disabled"
          } successfully!`,
          "success"
        );
      } else {
        throw new Error(result.message || "Failed to update user access");
      }
    } catch (error) {
      console.error("Error updating user WebRTC access:", error);
      showNotification(
        `Failed to update user access: ${error.message}`,
        "error"
      );
    }
  };

  const handleForceRemoveUserSessions = async (userId) => {
    try {
      // Keep modal open while we process cleanup
      setLoading(true);
      const result = await licenseAPI.forceCleanupUserSessions(
        editingLicense._id,
        userId,
        "webrtc_extension"
      );
      if (result.success) {
        showNotification("All WebRTC sessions removed for user.", "success");
        // Refresh modal users and sessions
        const refreshedUsers = await licenseAPI.getLicenseUsers(
          editingLicense._id
        );
        if (refreshedUsers.success) setLicenseUsers(refreshedUsers.data);
        const refreshedSessions = await licenseAPI.getWebRTCSessions(
          editingLicense._id
        );
        if (refreshedSessions.success) setWebRTCData(refreshedSessions.data);
      } else {
        throw new Error(result.message || "Failed to remove sessions");
      }
    } catch (error) {
      showNotification(
        `Failed to remove sessions: ${error.message || error}`,
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleShowFingerprintModal = (license) => {
    setEditingLicense(license);
    fingerprintForm.setFieldsValue({
      current_fingerprint: license.server_fingerprint,
      new_fingerprint: "",
      organization_name: license.organization_name,
    });
    setIsFingerprintModalVisible(true);
  };

  const handleUpdateFingerprint = async (values) => {
    try {
      setLoading(true);
      const result = await licenseAPI.updateLicenseFingerprint(
        editingLicense._id,
        {
          new_fingerprint: values.new_fingerprint,
          reason: "hardware_change",
        }
      );

      if (result.success) {
        showNotification(
          result.message ||
            "Fingerprint updated successfully! Slave server will sync automatically.",
          "success"
        );
        setIsFingerprintModalVisible(false);
        fingerprintForm.resetFields();
        fetchLicenseData(); // Refresh the list
      } else {
        showNotification(
          result.error || result.message || "Failed to update fingerprint.",
          "error"
        );
      }
    } catch (error) {
      showNotification(
        `Failed to update fingerprint: ${error.message || error}`,
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEditLicenseType = (licenseType) => {
    console.log("Editing license type:", licenseType);
    console.log("License type features:", licenseType.features);
    console.log("All available features:", allFeatures);

    setEditingLicenseType(licenseType);
    licenseTypeForm.setFieldsValue({
      name: licenseType.name,
      description: licenseType.description,
      max_concurrent_users: licenseType.max_concurrent_users,
      price_monthly: licenseType.price_monthly,
      features: licenseType.features,
    });
    setIsLicenseTypeModalVisible(true);
  };

  const handleUpdateLicenseType = async (values) => {
    try {
      setLoading(true);
      const result = await licenseAPI.updateLicenseType(
        editingLicenseType._id,
        values
      );

      if (result.success) {
        showNotification("License type updated successfully!", "success");
        setIsLicenseTypeModalVisible(false);
        fetchLicenseData(); // Refresh license types
      } else {
        showNotification(
          result.error || "Failed to update license type.",
          "error"
        );
      }
    } catch (error) {
      showNotification(
        error.message || "Failed to update license type.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // Get server fingerprints from all slave servers
  const handleGetServerFingerprints = async () => {
    try {
      setLoading(true);
      const result = await licenseAPI.getServerFingerprint();

      if (result.success) {
        const {
          fingerprints,
          total_servers,
          successful_queries,
          failed_queries,
        } = result.data;

        // Create a detailed message
        let message = `Retrieved fingerprints from ${successful_queries}/${total_servers} servers.`;

        if (successful_queries > 0) {
          const availableFingerprints = fingerprints.filter((f) => !f.error);
          message += `\n\nAvailable fingerprints:\n${availableFingerprints
            .map((f) => `• ${f.server_name}: ${f.fingerprint}`)
            .join("\n")}`;

          // Store fingerprints for potential use in license generation
          setAvailableFingerprints(availableFingerprints);
        }

        if (failed_queries > 0) {
          const failedServers = fingerprints.filter((f) => f.error);
          message += `\n\nFailed servers:\n${failedServers
            .map((f) => `• ${f.server_name}: ${f.error}`)
            .join("\n")}`;
        }

        showNotification(message, "info");
      } else {
        throw new Error(result.message || "Failed to get server fingerprints");
      }
    } catch (error) {
      console.error("Error getting server fingerprints:", error);
      const errorMessage = error.message || error.error || error;
      showNotification(
        `Failed to get server fingerprints: ${errorMessage}`,
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // Get available fingerprints for license generation
  const getAvailableFingerprintsForLicense = () => {
    if (availableFingerprints.length === 0) {
      return [];
    }
    return availableFingerprints.map((fp) => ({
      label: `${fp.server_name} (${fp.fingerprint})`,
      value: fp.fingerprint,
    }));
  };

  // Slave Server Management Functions
  const handleRegisterSlaveServer = async (values) => {
    try {
      setLoading(true);
      const apiUrl =
        process.env.REACT_APP_LICENSE_API_URL || "http://localhost:8001";
      const response = await fetch(`${apiUrl}/api/slave-servers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        showNotification("Slave server registered successfully!", "success");
        setIsSlaveServerModalVisible(false);
        slaveServerForm.resetFields();
        fetchSlaveServersData(); // Refresh the list
      } else {
        throw new Error(result.message || "Registration failed");
      }
    } catch (error) {
      showNotification(`Failed to register server: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSlaveServerStatus = async (serverId, action) => {
    try {
      setLoading(true);
      const apiUrl =
        process.env.REACT_APP_LICENSE_API_URL || "http://localhost:8001";
      const response = await fetch(
        `${apiUrl}/api/slave-servers/${serverId}/${action}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        showNotification(`Server ${action}d successfully!`, "success");
        fetchSlaveServersData(); // Refresh the list
      } else {
        throw new Error(result.message || `Failed to ${action} server`);
      }
    } catch (error) {
      showNotification(`Failed to ${action} server: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckSingleServerHealth = async (serverId) => {
    try {
      setLoading(true);
      const apiUrl =
        process.env.REACT_APP_LICENSE_API_URL || "http://localhost:8001";
      const response = await fetch(
        `${apiUrl}/api/slave-servers/${serverId}/health-check`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        const { data } = result;
        const statusMessage =
          data.health_status === "healthy"
            ? `Server is healthy (Response: ${data.response_time || "N/A"})`
            : `Server is unhealthy: ${data.error || "Unknown error"}`;

        showNotification(
          statusMessage,
          data.health_status === "healthy" ? "success" : "warning"
        );
        fetchSlaveServersData(); // Refresh to show updated health status
      } else {
        throw new Error(result.message || "Health check failed");
      }
    } catch (error) {
      showNotification(`Health check failed: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEditSlaveServer = (server) => {
    setEditingSlaveServer(server);
    slaveServerForm.setFieldsValue({
      name: server.name,
      domain: server.domain,
      description: server.description,
      api_url: server.api_url,
      websocket_url: server.websocket_url,
      configuration: server.configuration,
    });
    setIsSlaveServerModalVisible(true);
  };

  const handleDeleteSlaveServer = async (serverId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this slave server? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      const apiUrl =
        process.env.REACT_APP_LICENSE_API_URL || "http://localhost:8001";
      const response = await fetch(`${apiUrl}/slave-servers/${serverId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        showNotification("Slave server deleted successfully!", "success");
        fetchSlaveServersData(); // Refresh the list
      } else {
        throw new Error(result.message || "Delete failed");
      }
    } catch (error) {
      showNotification(`Failed to delete server: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const licenseColumns = [
    {
      title: "Organization",
      dataIndex: "organization_name",
      key: "organization_name",
      width: 200,
    },
    {
      title: "Type",
      dataIndex: "license_type",
      key: "type",
      width: 150,
      render: (license_type) => license_type?.name || "N/A",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status) => (
        <span className={`status-badge status-${status}`}>{status}</span>
      ),
    },
    {
      title: "Max Users",
      dataIndex: "max_users",
      key: "max_users",
      width: 100,
    },
    {
      title: "Concurrent Users",
      dataIndex: "license_type",
      key: "concurrent_users",
      width: 140,
      render: (license_type) => license_type?.max_concurrent_users || "N/A",
    },
    {
      title: "WebRTC Users",
      dataIndex: "webrtc_max_users",
      key: "webrtc_users",
      width: 120,
      render: (webrtc_max_users, record) => {
        const features = record.license_type?.features;
        const hasWebRTC =
          features &&
          (typeof features === "string" ? JSON.parse(features) : features)
            .webrtc_extension;
        return hasWebRTC ? webrtc_max_users || 0 : "N/A";
      },
    },
    {
      title: "Expires",
      dataIndex: "expires_at",
      key: "expires",
      width: 120,
      render: (date) => (date ? new Date(date).toLocaleDateString() : "Never"),
    },
    {
      title: "Created",
      dataIndex: "created_at",
      key: "created",
      width: 120,
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: "Actions",
      key: "actions",
      width: 200,
      fixed: "right",
      render: (_, record) => {
        const features = record.license_type?.features;
        const hasWebRTC =
          features &&
          (typeof features === "string" ? JSON.parse(features) : features)
            .webrtc_extension;

        return (
          <Space.Compact>
            <Button size="small" onClick={() => handleShowDetailsModal(record)}>
              Details
            </Button>
            <Button size="small" onClick={() => handleShowUpdateModal(record)}>
              Edit
            </Button>
            <Button
              size="small"
              type="default"
              onClick={() => handleShowFingerprintModal(record)}
              style={{ backgroundColor: "#52c41a", color: "white" }}
            >
              Fingerprint
            </Button>
            {hasWebRTC && (
              <Button
                size="small"
                type="default"
                onClick={() => handleShowWebRTCModal(record)}
                style={{ backgroundColor: "#1890ff", color: "white" }}
              >
                WebRTC
              </Button>
            )}
            {record.status === "active" ? (
              <Button
                size="small"
                type="primary"
                danger
                onClick={() => handleUpdateStatus(record._id, "suspended")}
              >
                Suspend
              </Button>
            ) : (
              <Button
                size="small"
                onClick={() => handleUpdateStatus(record._id, "active")}
              >
                Activate
              </Button>
            )}
          </Space.Compact>
        );
      },
    },
  ];

  const slaveServerColumns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      width: 150,
    },
    {
      title: "Domain",
      dataIndex: "domain",
      key: "domain",
      width: 200,
      render: (domain) => (
        <a href={`https://${domain}`} target="_blank" rel="noopener noreferrer">
          {domain}
        </a>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status) => (
        <span className={`status-badge status-${status}`}>{status}</span>
      ),
    },
    {
      title: "Health",
      dataIndex: "health_status",
      key: "health_status",
      width: 100,
      render: (health_status) => {
        const colors = {
          healthy: "#52c41a",
          unhealthy: "#f5222d",
          unknown: "#d9d9d9",
        };
        return (
          <span
            style={{
              color: colors[health_status] || colors.unknown,
              fontWeight: "bold",
            }}
          >
            {health_status || "unknown"}
          </span>
        );
      },
    },
    {
      title: "Licenses",
      key: "licenses",
      width: 100,
      render: (_, record) => (
        <span>
          {record.active_license_count || 0} / {record.license_count || 0}
        </span>
      ),
    },
    {
      title: "Last Ping",
      dataIndex: "last_ping",
      key: "last_ping",
      width: 150,
      render: (date) => (date ? new Date(date).toLocaleString() : "Never"),
    },
    {
      title: "Registered",
      dataIndex: "registered_at",
      key: "registered_at",
      width: 150,
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: "Actions",
      key: "actions",
      width: 250,
      fixed: "right",
      render: (_, record) => (
        <Space.Compact>
          <Button
            size="small"
            onClick={() => handleCheckSingleServerHealth(record._id)}
            style={{ backgroundColor: "#1890ff", color: "white" }}
          >
            🩺 Health
          </Button>
          {record.status === "active" ? (
            <Button
              size="small"
              type="primary"
              danger
              onClick={() =>
                handleUpdateSlaveServerStatus(record._id, "deactivate")
              }
            >
              Deactivate
            </Button>
          ) : (
            <Button
              size="small"
              type="primary"
              onClick={() =>
                handleUpdateSlaveServerStatus(record._id, "activate")
              }
            >
              Activate
            </Button>
          )}
          <Button size="small" onClick={() => handleEditSlaveServer(record)}>
            Edit
          </Button>
          <Button
            size="small"
            danger
            onClick={() => handleDeleteSlaveServer(record._id)}
          >
            Delete
          </Button>
        </Space.Compact>
      ),
    },
  ];

  if (loading && !isModalVisible) {
    return (
      <div className="admin-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading {activeTab}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      <div className="admin-container">
        <div className="admin-header">
          <div className="admin-title">
            <h1>🛠️ Admin Panel</h1>
            <p>System administration and user management</p>
          </div>
          <div className="admin-user-info">
            <span className="admin-welcome">Welcome, {user?.name}</span>
            <span className="admin-role">Administrator</span>
            <button onClick={handleLogout} className="logout-button">
              Logout
              <LogoutOutlined />
            </button>
          </div>
        </div>

        <div className="admin-nav">
          <button
            className={`nav-tab ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            📊 Overview
          </button>
          <button
            className={`nav-tab ${activeTab === "users" ? "active" : ""}`}
            onClick={() => setActiveTab("users")}
          >
            👥 Users
          </button>
          <button
            className={`nav-tab ${activeTab === "licenses" ? "active" : ""}`}
            onClick={() => setActiveTab("licenses")}
          >
            🔑 License Management
          </button>
          <button
            className={`nav-tab ${
              activeTab === "slave-servers" ? "active" : ""
            }`}
            onClick={() => setActiveTab("slave-servers")}
          >
            🖥️ Slave Servers
          </button>
          <button
            className={`nav-tab ${
              activeTab === "license-types" ? "active" : ""
            }`}
            onClick={() => setActiveTab("license-types")}
          >
            📜 License Types
          </button>
          <button
            className={`nav-tab ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            ⚙️ Settings
          </button>
        </div>

        {error && (
          <div className="error-card">
            <h2>Error</h2>
            <p>{error}</p>
            <button
              onClick={
                activeTab === "licenses" ? fetchLicenseData : fetchAdminData
              }
              className="retry-button"
            >
              Try Again
            </button>
          </div>
        )}

        {!error && (
          <div className="admin-content">
            {activeTab === "overview" && adminData && (
              <div className="overview-tab">
                <h2>System Overview</h2>
                <div className="overview-grid">
                  <div className="overview-card">
                    <h3>🎯 Admin Status</h3>
                    <p>System is operational.</p>
                    <div className="admin-info">
                      <p>
                        <strong>Access Level:</strong> Full Administrator
                      </p>
                      <p>
                        <strong>Last Login:</strong>{" "}
                        {new Date(user?.lastLogin).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="overview-card">
                    <h3>📈 System Stats</h3>
                    <div className="stats">
                      <div className="stat-item">
                        <span className="stat-label">Total Users:</span>
                        <span className="stat-value">
                          {adminData.adminData.totalUsers}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "users" && usersData && usersData.data && (
              <div className="users-tab">
                <h2>User Management</h2>
                <div className="users-section">
                  <div className="users-header">
                    <p>A list of all users in your account.</p>
                    <button className="add-user-button">➕ Add New User</button>
                  </div>
                  <div className="users-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Status</th>
                          <th>Created At</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usersData.data.users.map((u) => (
                          <tr key={u._id}>
                            <td>{u.name}</td>
                            <td>{u.email}</td>
                            <td>{u.role}</td>
                            <td>
                              <span
                                className={`status-badge status-${
                                  u.isActive ? "active" : "suspended"
                                }`}
                              >
                                {u.isActive ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td>
                              {new Date(u.createdAt).toLocaleDateString()}
                            </td>
                            <td className="actions-cell">
                              {u.isActive ? (
                                <Button
                                  danger
                                  onClick={() => handleUserAction(u, "suspend")}
                                >
                                  Suspend
                                </Button>
                              ) : (
                                <Button
                                  type="primary"
                                  onClick={() =>
                                    handleUserAction(u, "activate")
                                  }
                                >
                                  Verify
                                </Button>
                              )}
                              <button className="action-btn-edit">Edit</button>
                              <button
                                className="action-btn-delete"
                                onClick={() => handleUserAction(u, "delete")}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "licenses" && (
              <div className="license-management-tab">
                <h2>License Management</h2>
                <div className="users-section">
                  <div className="users-header">
                    <p>Manage server licenses and license types!!</p>
                    <button
                      className="add-user-button"
                      onClick={() => setIsModalVisible(true)}
                    >
                      Generate New License
                    </button>
                  </div>
                  <Table
                    columns={licenseColumns}
                    dataSource={licenses}
                    rowKey="_id"
                    loading={loading}
                    scroll={{ x: 1200 }}
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total, range) =>
                        `${range[0]}-${range[1]} of ${total} licenses`,
                    }}
                  />
                </div>
              </div>
            )}

            {activeTab === "slave-servers" && (
              <div className="slave-servers-tab">
                <h2>Slave Server Management</h2>
                <div className="slave-servers-section">
                  <div className="users-header">
                    <p>Manage and monitor distributed slave servers.</p>
                    <Space>
                      <Button
                        type="primary"
                        onClick={() => handleCheckAllServersHealth()}
                        loading={loading}
                      >
                        🩺 Check All Health
                      </Button>
                      <Button
                        onClick={() => handleGetServerFingerprints()}
                        loading={loading}
                      >
                        🔑 Get Server Fingerprints
                      </Button>
                      <Button
                        onClick={() => setIsSlaveServerModalVisible(true)}
                        className="add-user-button"
                      >
                        ➕ Register New Server
                      </Button>
                    </Space>
                  </div>

                  <Table
                    columns={slaveServerColumns}
                    dataSource={slaveServers}
                    rowKey="_id"
                    loading={loading}
                    scroll={{ x: 1400 }}
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total, range) =>
                        `${range[0]}-${range[1]} of ${total} servers`,
                    }}
                  />
                </div>
              </div>
            )}

            {activeTab === "license-types" && (
              <div className="license-types-tab">
                <h2>License Types</h2>
                <p>Manage the features available in each license plan.</p>
                <Table
                  columns={[
                    { title: "Name", dataIndex: "name", key: "name" },
                    {
                      title: "Description",
                      dataIndex: "description",
                      key: "description",
                    },
                    {
                      title: "Max Concurrent Users",
                      dataIndex: "max_concurrent_users",
                      key: "max_concurrent_users",
                    },
                    {
                      title: "Price Monthly",
                      dataIndex: "price_monthly",
                      key: "price_monthly",
                    },
                    {
                      title: "Actions",
                      key: "actions",
                      render: (_, record) => (
                        <Button onClick={() => handleEditLicenseType(record)}>
                          Edit Features
                        </Button>
                      ),
                    },
                  ]}
                  dataSource={licenseTypes}
                  rowKey="_id"
                />
              </div>
            )}

            {activeTab === "settings" && (
              <div className="settings-tab">
                <h2>System Settings</h2>
                <div className="settings-grid">
                  <div className="settings-card">
                    <h3>🔐 Security Settings</h3>
                    <div className="setting-item">
                      <label>Enable Two-Factor Authentication</label>
                      <input type="checkbox" defaultChecked />
                    </div>
                    <div className="setting-item">
                      <label>Session Timeout (minutes)</label>
                      <input type="number" defaultValue="30" />
                    </div>
                    <div className="setting-item">
                      <label>Maximum Login Attempts</label>
                      <input type="number" defaultValue="5" />
                    </div>
                  </div>

                  <div className="settings-card">
                    <h3>📧 Email Settings</h3>
                    <div className="setting-item">
                      <label>SMTP Server</label>
                      <input type="text" placeholder="smtp.example.com" />
                    </div>
                    <div className="setting-item">
                      <label>Email Notifications</label>
                      <input type="checkbox" defaultChecked />
                    </div>
                    <div className="setting-item">
                      <label>Welcome Email Template</label>
                      <select>
                        <option>Default Template</option>
                        <option>Custom Template</option>
                      </select>
                    </div>
                  </div>

                  <div className="settings-card">
                    <h3>🌐 System Settings</h3>
                    <div className="setting-item">
                      <label>Maintenance Mode</label>
                      <input type="checkbox" />
                    </div>
                    <div className="setting-item">
                      <label>Debug Mode</label>
                      <input type="checkbox" />
                    </div>
                    <div className="setting-item">
                      <label>API Rate Limiting</label>
                      <input type="checkbox" defaultChecked />
                    </div>
                  </div>
                </div>
                <button className="save-settings-button">
                  💾 Save Settings
                </button>
              </div>
            )}
          </div>
        )}

        <Modal
          title="LICENSE DETAILS"
          open={isDetailsModalVisible}
          onCancel={() => setIsDetailsModalVisible(false)}
          footer={[
            <Button key="close" onClick={() => setIsDetailsModalVisible(false)}>
              Close
            </Button>,
            <Button
              key="edit"
              type="primary"
              onClick={() => {
                setIsDetailsModalVisible(false);
                handleShowUpdateModal(selectedLicense);
              }}
            >
              Edit License Details
            </Button>,
          ]}
          width={800}
        >
          {selectedLicense && (
            <div className="license-details">
              <div className="license-details-grid">
                <div className="detail-section">
                  <h4>Basic Information</h4>
                  <div className="detail-item">
                    <strong>Organization:</strong>{" "}
                    {selectedLicense.organization_name}
                  </div>
                  <div className="detail-item">
                    <strong>License Type:</strong>{" "}
                    {selectedLicense.license_type?.name}
                  </div>
                  <div className="detail-item">
                    <strong>Status:</strong>{" "}
                    <span
                      className={`status-badge status-${selectedLicense.status}`}
                    >
                      {selectedLicense.status}
                    </span>
                  </div>
                  <div className="detail-item">
                    <strong>Max Users:</strong> {selectedLicense.max_users}
                  </div>
                  <div className="detail-item">
                    <strong>Max Concurrent Users:</strong>{" "}
                    {selectedLicense.license_type?.max_concurrent_users}
                  </div>
                  {selectedLicense.license_type?.features &&
                    (typeof selectedLicense.license_type.features === "string"
                      ? JSON.parse(selectedLicense.license_type.features)
                      : selectedLicense.license_type.features
                    ).webrtc_extension && (
                      <div className="detail-item">
                        <strong>WebRTC Users:</strong>{" "}
                        {selectedLicense.webrtc_max_users || 0} /{" "}
                        {selectedLicense.max_users}
                      </div>
                    )}
                </div>

                <div className="detail-section">
                  <h4>Timeline</h4>
                  <div className="detail-item">
                    <strong>Created:</strong>{" "}
                    {new Date(selectedLicense.created_at).toLocaleString()}
                  </div>
                  <div className="detail-item">
                    <strong>Issued:</strong>{" "}
                    {new Date(selectedLicense.issued_at).toLocaleString()}
                  </div>
                  <div className="detail-item">
                    <strong>Expires:</strong>{" "}
                    {selectedLicense.expires_at
                      ? new Date(selectedLicense.expires_at).toLocaleString()
                      : "Never"}
                  </div>
                  <div className="detail-item">
                    <strong>Last Updated:</strong>{" "}
                    {new Date(selectedLicense.updated_at).toLocaleString()}
                  </div>
                  <div className="detail-item">
                    <strong>Last Validated:</strong>{" "}
                    {selectedLicense.last_validated
                      ? new Date(
                          selectedLicense.last_validated
                        ).toLocaleString()
                      : "Never"}
                  </div>
                </div>

                <div className="detail-section">
                  <h4>License Features</h4>
                  {selectedLicense.license_type?.features && (
                    <div className="features-pills">
                      {Object.entries(
                        typeof selectedLicense.license_type.features ===
                          "string"
                          ? JSON.parse(selectedLicense.license_type.features)
                          : selectedLicense.license_type.features
                      ).map(([feature, enabled]) => (
                        <span
                          key={feature}
                          className={`feature-pill ${
                            enabled ? "enabled" : "disabled"
                          }`}
                          title={`${feature}: ${
                            enabled ? "Enabled" : "Disabled"
                          }`}
                        >
                          {enabled ? "✓" : "✗"} {feature}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="detail-section">
                  <h4>System Information</h4>
                  <div className="detail-item">
                    <strong>Validation Count:</strong>{" "}
                    {selectedLicense.validation_count}
                  </div>
                  <div className="detail-item">
                    <strong>License ID:</strong> {selectedLicense._id}
                  </div>
                  <div className="detail-item">
                    <strong>License Type ID:</strong>{" "}
                    {selectedLicense.license_type_id}
                  </div>
                </div>

                <div className="detail-section full-width">
                  <h4>Server Fingerprint</h4>
                  <div className="fingerprint-display">
                    <code>{selectedLicense.server_fingerprint}</code>
                  </div>
                </div>

                <div className="detail-section full-width">
                  <h4>License Key</h4>
                  <div className="license-key-display">
                    <code>{selectedLicense.license_key}</code>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Modal>

        <Modal
          title="Generate New License"
          open={isModalVisible}
          onCancel={() => {
            setIsModalVisible(false);
            if (form) {
              form.resetFields();
            }
          }}
          footer={null} // We will use the form's button
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleGenerateLicense}
            initialValues={{
              remember: true,
              issued_at: moment(),
              expires_at: moment().add(1, "year"),
            }}
            onFinishFailed={(errorInfo) => {
              console.log("Form validation failed:", errorInfo);
              showNotification("Please check the form and try again.", "error");
            }}
          >
            <Form.Item
              name="organization_name"
              label="Organization Name"
              rules={[
                {
                  required: true,
                  message: "Please input the organization name!",
                },
              ]}
            >
              <Input placeholder="e.g., Acme Corporation" />
            </Form.Item>

            <Form.Item
              name="server_fingerprint"
              label="Server Fingerprint"
              rules={[
                {
                  required: true,
                  message: "Please input the server fingerprint!",
                },
              ]}
            >
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  alignItems: "flex-start",
                }}
              >
                <Input.TextArea
                  rows={4}
                  placeholder="Paste the server fingerprint here"
                  style={{ flex: 1 }}
                />
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <Button
                    size="small"
                    onClick={handleGetServerFingerprints}
                    loading={loading}
                    title="Get fingerprints from slave servers"
                  >
                    🔑
                  </Button>
                  {availableFingerprints.length > 0 && (
                    <Select
                      size="small"
                      placeholder={`${availableFingerprints.length} fingerprints available`}
                      style={{ width: 200 }}
                      onChange={(value) => {
                        form.setFieldsValue({ server_fingerprint: value });
                      }}
                    >
                      {getAvailableFingerprintsForLicense().map((option) => (
                        <Option key={option.value} value={option.value}>
                          {option.label}
                        </Option>
                      ))}
                    </Select>
                  )}
                </div>
              </div>
            </Form.Item>

            <Form.Item
              name="license_type_id"
              label="License Type"
              rules={[
                { required: true, message: "Please select a license type!" },
                {
                  validator: (_, value) => {
                    if (!value || value === null || value === undefined) {
                      return Promise.reject(
                        new Error("Please select a valid license type!")
                      );
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Select placeholder="Select a license type" loading={loading}>
                {licenseTypes
                  .filter((type) => type && type._id && type.name)
                  .map((type) => (
                    <Option key={type._id} value={type._id}>
                      {type.name}
                    </Option>
                  ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="issued_at"
              label="License Start Date"
              rules={[
                {
                  required: true,
                  message: "Please select the license start date!",
                },
              ]}
            >
              <DatePicker
                showTime={{ format: "HH:mm" }}
                format="YYYY-MM-DD HH:mm"
                style={{ width: "100%" }}
                placeholder="Select start date and time"
              />
            </Form.Item>

            <Form.Item
              name="expires_at"
              label="License Expiry Date"
              rules={[
                {
                  required: true,
                  message: "Please select the license expiry date!",
                },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const start = getFieldValue("issued_at");
                    if (!value || !start) {
                      return Promise.resolve();
                    }
                    // Normalize to timestamps to avoid Dayjs vs Moment mismatches
                    const startTs =
                      typeof start.valueOf === "function"
                        ? start.valueOf()
                        : new Date(start).getTime();
                    const endTs =
                      typeof value.valueOf === "function"
                        ? value.valueOf()
                        : new Date(value).getTime();
                    if (
                      Number.isFinite(startTs) &&
                      Number.isFinite(endTs) &&
                      endTs <= startTs
                    ) {
                      return Promise.reject(
                        new Error("Expiry date must be after start date!")
                      );
                    }
                    return Promise.resolve();
                  },
                }),
              ]}
            >
              <DatePicker
                showTime={{ format: "HH:mm" }}
                format="YYYY-MM-DD HH:mm"
                style={{ width: "100%" }}
                placeholder="Select expiry date and time"
              />
            </Form.Item>
            <div className="form-help-text">
              <p>
                <strong>Date Selection:</strong> Choose exact start and expiry
                dates with time. Licenses can be activated at any time and
                expire at precise moments, allowing for flexible deployment
                schedules.
              </p>
            </div>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                disabled={licenseTypes.length === 0}
                block
              >
                {licenseTypes.length === 0
                  ? "Loading License Types..."
                  : "Generate License"}
              </Button>
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title="EDIT LICENSE DETAILS"
          open={isUpdateModalVisible}
          onCancel={() => {
            setIsUpdateModalVisible(false);
            if (updateForm) {
              updateForm.resetFields();
            }
          }}
          footer={null}
        >
          <Form
            form={updateForm}
            layout="vertical"
            onFinish={handleUpdateLicense}
          >
            <Form.Item
              name="organization_name"
              label="Organization Name"
              rules={[
                {
                  required: true,
                  message: "Please input the organization name!",
                },
              ]}
            >
              <Input placeholder="e.g., ABC Inc." />
            </Form.Item>

            <Form.Item
              name="max_users"
              label="Max Users"
              rules={[
                {
                  required: true,
                  message: "Please input the maximum number of users!",
                },
              ]}
            >
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item
              name="license_type_id"
              label="License Type"
              rules={[
                { required: true, message: "Please select a license type!" },
                {
                  validator: (_, value) => {
                    if (!value || value === null || value === undefined) {
                      return Promise.reject(
                        new Error("Please select a valid license type!")
                      );
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Select placeholder="Select a license type" loading={loading}>
                {licenseTypes
                  .filter((type) => type && type._id && type.name)
                  .map((type) => (
                    <Option key={type._id} value={type._id}>
                      {type.name}
                    </Option>
                  ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="issued_at"
              label="License Start Date"
              rules={[
                {
                  required: true,
                  message: "Please select the license start date!",
                },
              ]}
            >
              <DatePicker
                showTime={{ format: "HH:mm" }}
                format="YYYY-MM-DD HH:mm"
                style={{ width: "100%" }}
                placeholder="Select start date and time"
              />
            </Form.Item>

            <Form.Item
              name="expires_at"
              label="License Expiry Date"
              rules={[
                {
                  required: true,
                  message: "Please select the license expiry date!",
                },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const start = getFieldValue("issued_at");
                    if (!value || !start) {
                      return Promise.resolve();
                    }
                    // Normalize to timestamps to avoid Dayjs vs Moment mismatches
                    const startTs =
                      typeof start.valueOf === "function"
                        ? start.valueOf()
                        : new Date(start).getTime();
                    const endTs =
                      typeof value.valueOf === "function"
                        ? value.valueOf()
                        : new Date(value).getTime();
                    if (
                      Number.isFinite(startTs) &&
                      Number.isFinite(endTs) &&
                      endTs <= startTs
                    ) {
                      return Promise.reject(
                        new Error("Expiry date must be after start date!")
                      );
                    }
                    return Promise.resolve();
                  },
                }),
              ]}
            >
              <DatePicker
                showTime={{ format: "HH:mm" }}
                format="YYYY-MM-DD HH:mm"
                style={{ width: "100%" }}
                placeholder="Select expiry date and time"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                disabled={licenseTypes.length === 0}
                block
              >
                {licenseTypes.length === 0
                  ? "Loading License Types..."
                  : "Update License"}
              </Button>
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title={`Confirm License ${
            licenseAction?.status === "suspended" ? "Suspension" : "Activation"
          }`}
          open={isConfirmModalVisible}
          onOk={handleConfirmAction}
          onCancel={handleCancelAction}
          okText={
            licenseAction?.status === "suspended"
              ? "Suspend License"
              : "Activate License"
          }
          cancelText="Cancel"
          okButtonProps={{
            danger: licenseAction?.status === "suspended",
            type: licenseAction?.status === "active" ? "primary" : "default",
          }}
        >
          <p>
            Are you sure you want to {licenseAction?.status} the license for{" "}
            <strong>{licenseAction?.license?.organization_name}</strong>?
          </p>
          <p style={{ color: "#666", fontSize: "14px" }}>
            {licenseAction?.status === "suspended"
              ? "This action will immediately disable access for all users under this license."
              : "This action will restore access for all users under this license."}
          </p>
        </Modal>

        <Modal
          title={`Confirm User ${
            userAction?.action === "activate"
              ? "Activation"
              : userAction?.action === "suspend"
              ? "Suspension"
              : "Deletion"
          }`}
          open={isUserConfirmModalVisible}
          onOk={handleConfirmUserAction}
          onCancel={handleCancelUserAction}
          okText={
            userAction?.action === "activate"
              ? "Activate User"
              : userAction?.action === "suspend"
              ? "Suspend User"
              : "Delete User"
          }
          cancelText="Cancel"
          okButtonProps={{
            danger:
              userAction?.action === "suspend" ||
              userAction?.action === "delete",
            type: userAction?.action === "activate" ? "primary" : "default",
          }}
        >
          <p>
            Are you sure you want to {userAction?.action} the user account for{" "}
            <strong>{userAction?.user?.name}</strong>?
          </p>
          <p style={{ color: "#666", fontSize: "14px" }}>
            {userAction?.action === "activate" &&
              "This action will allow the user to log in and access protected content."}
            {userAction?.action === "suspend" &&
              "This action will prevent the user from logging in."}
            {userAction?.action === "delete" &&
              "This action will permanently delete the user account. This cannot be undone."}
          </p>
        </Modal>

        <Modal
          title="MANAGE WEBRTC EXTENSION USERS"
          open={isWebRTCModalVisible}
          onCancel={() => {
            setIsWebRTCModalVisible(false);
            if (webRTCForm) {
              webRTCForm.resetFields();
            }
          }}
          footer={null}
          width={800}
        >
          {editingLicense && (
            <div className="webrtc-management">
              <div className="webrtc-info-section">
                <h4>License Information</h4>
                <div className="info-grid">
                  <div className="info-item">
                    <strong>Organization:</strong>{" "}
                    {editingLicense.organization_name}
                  </div>
                  <div className="info-item">
                    <strong>Total License Users:</strong>{" "}
                    {editingLicense.max_users}
                  </div>
                  <div className="info-item">
                    <strong>WebRTC Max Users:</strong>{" "}
                    {editingLicense.webrtc_max_users || 0}
                  </div>
                  <div className="info-item">
                    <strong>Active WebRTC Sessions:</strong>{" "}
                    {webRTCData.current_sessions || 0}
                  </div>
                </div>
              </div>

              {/* Active Sessions Table */}
              {webRTCData.active_users &&
                webRTCData.active_users.length > 0 && (
                  <div
                    className="active-sessions-section"
                    style={{ marginTop: "20px" }}
                  >
                    <h4>Active WebRTC Sessions</h4>
                    <table
                      className="sessions-table"
                      style={{ width: "100%", borderCollapse: "collapse" }}
                    >
                      <thead>
                        <tr style={{ backgroundColor: "#f5f5f5" }}>
                          <th
                            style={{ padding: "8px", border: "1px solid #ddd" }}
                          >
                            Username
                          </th>
                          <th
                            style={{ padding: "8px", border: "1px solid #ddd" }}
                          >
                            Session Start
                          </th>
                          <th
                            style={{ padding: "8px", border: "1px solid #ddd" }}
                          >
                            Duration
                          </th>
                          <th
                            style={{ padding: "8px", border: "1px solid #ddd" }}
                          >
                            IP Address
                          </th>
                          <th
                            style={{ padding: "8px", border: "1px solid #ddd" }}
                          >
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {webRTCData.active_users.map((session, index) => (
                          <tr key={session.id || index}>
                            <td
                              style={{
                                padding: "8px",
                                border: "1px solid #ddd",
                              }}
                            >
                              {session.username}
                            </td>
                            <td
                              style={{
                                padding: "8px",
                                border: "1px solid #ddd",
                              }}
                            >
                              {new Date(session.start_time).toLocaleString()}
                            </td>
                            <td
                              style={{
                                padding: "8px",
                                border: "1px solid #ddd",
                              }}
                            >
                              {session.duration}
                            </td>
                            <td
                              style={{
                                padding: "8px",
                                border: "1px solid #ddd",
                              }}
                            >
                              {session.ip_address || "N/A"}
                            </td>
                            <td
                              style={{
                                padding: "8px",
                                border: "1px solid #ddd",
                              }}
                            >
                              <Button
                                size="small"
                                danger
                                onClick={() =>
                                  handleEndWebRTCSession(
                                    session.id || session.session_id,
                                    session.username
                                  )
                                }
                                loading={loading}
                                title={`End session for ${session.username}`}
                              >
                                End Session
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

              {/* Recent Session History */}
              {webRTCData.session_history &&
                webRTCData.session_history.length > 0 && (
                  <div
                    className="session-history-section"
                    style={{ marginTop: "20px" }}
                  >
                    <h4>Recent Session History (Last 24 Hours)</h4>
                    <table
                      className="sessions-table"
                      style={{ width: "100%", borderCollapse: "collapse" }}
                    >
                      <thead>
                        <tr style={{ backgroundColor: "#f5f5f5" }}>
                          <th
                            style={{ padding: "8px", border: "1px solid #ddd" }}
                          >
                            Username
                          </th>
                          <th
                            style={{ padding: "8px", border: "1px solid #ddd" }}
                          >
                            Start Time
                          </th>
                          <th
                            style={{ padding: "8px", border: "1px solid #ddd" }}
                          >
                            End Time
                          </th>
                          <th
                            style={{ padding: "8px", border: "1px solid #ddd" }}
                          >
                            Duration
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {webRTCData.session_history
                          .slice(0, 10)
                          .map((session, index) => (
                            <tr key={session.id || index}>
                              <td
                                style={{
                                  padding: "8px",
                                  border: "1px solid #ddd",
                                }}
                              >
                                {session.username}
                              </td>
                              <td
                                style={{
                                  padding: "8px",
                                  border: "1px solid #ddd",
                                }}
                              >
                                {new Date(session.start_time).toLocaleString()}
                              </td>
                              <td
                                style={{
                                  padding: "8px",
                                  border: "1px solid #ddd",
                                }}
                              >
                                {session.end_time
                                  ? new Date(session.end_time).toLocaleString()
                                  : "Active"}
                              </td>
                              <td
                                style={{
                                  padding: "8px",
                                  border: "1px solid #ddd",
                                }}
                              >
                                {session.duration}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}

              {/* Current Allocation Status */}
              <div className="webrtc-allocation-status">
                <div className="status-header">
                  <div>
                    <strong>Current Allocation:</strong>{" "}
                    {editingLicense?.webrtc_max_users || 0} WebRTC users
                  </div>
                  <div className="status-indicator">
                    {editingLicense?.webrtc_max_users >=
                    (editingLicense?.max_users || 0) ? (
                      <span className="warning">⚠️ At maximum capacity</span>
                    ) : (
                      <span className="success">⬆️</span>
                    )}
                  </div>
                </div>
                <div className="status-details">
                  Total license capacity: {editingLicense?.max_users || 0} users
                </div>
              </div>

              <Form
                form={webRTCForm}
                layout="vertical"
                onFinish={handleUpdateWebRTCAllocation}
                style={{ marginTop: "20px" }}
              >
                <Form.Item
                  name="webrtc_max_users"
                  label={
                    <span>
                      WebRTC Extension Users
                      <span
                        style={{
                          marginLeft: "8px",
                          fontSize: "12px",
                          color: "#666",
                          fontWeight: "normal",
                        }}
                      >
                        (Max: {editingLicense?.max_users || 0})
                      </span>
                    </span>
                  }
                  rules={[
                    {
                      required: true,
                      message: "Please specify the number of WebRTC users!",
                    },
                    {
                      type: "number",
                      min: 0,
                      max: editingLicense?.max_users || 100,
                      message: `Must be between 0 and ${editingLicense?.max_users}`,
                    },
                  ]}
                >
                  <InputNumber
                    min={0}
                    max={editingLicense?.max_users || 100}
                    style={{ width: "100%" }}
                    placeholder="Number of users who can access WebRTC Extension"
                  />
                </Form.Item>

                <div className="webrtc-help-text">
                  <p>
                    <strong>WebRTC Management:</strong> You can adjust the
                    number of users allowed to use the WebRTC Extension feature.
                    Changes will be applied immediately to the local license.
                  </p>
                  <p>
                    <strong>Current Status:</strong>{" "}
                    {editingLicense?.webrtc_max_users || 0} WebRTC users allowed
                    out of {editingLicense?.max_users || 0} total license users.
                  </p>
                  <p>
                    <strong>Limitations:</strong> WebRTC allocation cannot
                    exceed your total license capacity. If you need more WebRTC
                    users, consider upgrading your license plan.
                  </p>
                  <p>
                    <strong>Active Sessions:</strong> You cannot reduce the
                    allocation below the number of currently active WebRTC
                    sessions. Users must log out first.
                  </p>
                  <p>
                    <strong>Real-Time Data:</strong> The session information
                    above is fetched from the actual WebRTC extension users
                    currently registered with this server.
                  </p>
                </div>

                <Form.Item style={{ marginTop: "20px", marginBottom: 0 }}>
                  <Space>
                    <Button onClick={() => setIsWebRTCModalVisible(false)}>
                      Close
                    </Button>
                    <Button
                      onClick={() => handleShowUserWebRTCModal(editingLicense)}
                      style={{ backgroundColor: "#52c41a", color: "white" }}
                    >
                      Manage Individual Users
                    </Button>
                    <Button
                      type="danger"
                      onClick={handleEndAllWebRTCSessions}
                      loading={loading}
                      disabled={
                        !webRTCData.active_users ||
                        webRTCData.active_users.length === 0
                      }
                    >
                      End All Sessions
                    </Button>
                    <Button type="primary" htmlType="submit" loading={loading}>
                      Update WebRTC Allocation
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </div>
          )}
        </Modal>

        <Modal
          title="MANAGE INDIVIDUAL USER WEBRTC ACCESS"
          open={isUserWebRTCModalVisible}
          onCancel={() => setIsUserWebRTCModalVisible(false)}
          footer={[
            <Button
              key="close"
              onClick={() => setIsUserWebRTCModalVisible(false)}
            >
              Close
            </Button>,
          ]}
          width={900}
        >
          {editingLicense && (
            <div className="user-webrtc-management">
              <div className="user-webrtc-info">
                <h4>License: {editingLicense.organization_name}</h4>
                <p>
                  WebRTC Allocation: {editingLicense.webrtc_max_users || 0} /{" "}
                  {editingLicense.max_users} users
                </p>
                <p style={{ color: "#666", fontSize: "14px" }}>
                  Real-time data from slave server showing actual WebRTC
                  extension users and their session activity.
                </p>
              </div>

              <div className="users-table-container">
                <table
                  className="users-webrtc-table"
                  style={{ width: "100%", borderCollapse: "collapse" }}
                >
                  <thead>
                    <tr style={{ backgroundColor: "#f5f5f5" }}>
                      <th style={{ padding: "10px", border: "1px solid #ddd" }}>
                        User ID
                      </th>
                      <th style={{ padding: "10px", border: "1px solid #ddd" }}>
                        Username
                      </th>
                      <th style={{ padding: "10px", border: "1px solid #ddd" }}>
                        Status
                      </th>
                      <th style={{ padding: "10px", border: "1px solid #ddd" }}>
                        WebRTC Access
                      </th>
                      <th style={{ padding: "10px", border: "1px solid #ddd" }}>
                        Sessions
                      </th>
                      <th style={{ padding: "10px", border: "1px solid #ddd" }}>
                        Last Activity
                      </th>
                      <th style={{ padding: "10px", border: "1px solid #ddd" }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {licenseUsers.map((user) => (
                      <tr key={user.id}>
                        <td
                          style={{ padding: "10px", border: "1px solid #ddd" }}
                        >
                          {user.id}
                        </td>
                        <td
                          style={{ padding: "10px", border: "1px solid #ddd" }}
                        >
                          {user.username || user.name || "N/A"}
                        </td>
                        <td
                          style={{ padding: "10px", border: "1px solid #ddd" }}
                        >
                          <span
                            className={`status-badge status-${
                              user.status || "active"
                            }`}
                            style={{
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontSize: "12px",
                              fontWeight: "bold",
                              color: "white",
                              backgroundColor:
                                user.status === "active"
                                  ? "#52c41a"
                                  : "#d9d9d9",
                            }}
                          >
                            {user.status || "Active"}
                          </span>
                        </td>
                        <td
                          style={{ padding: "10px", border: "1px solid #ddd" }}
                        >
                          <span
                            className={`webrtc-access-badge ${
                              user.webrtc_access ? "enabled" : "disabled"
                            }`}
                            style={{
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontSize: "12px",
                              fontWeight: "bold",
                              color: "white",
                              backgroundColor: user.webrtc_access
                                ? "#1890ff"
                                : "#f5222d",
                            }}
                          >
                            {user.webrtc_access ? "Enabled" : "Disabled"}
                          </span>
                        </td>
                        <td
                          style={{ padding: "10px", border: "1px solid #ddd" }}
                        >
                          {user.session_count || 0} sessions
                        </td>
                        <td
                          style={{ padding: "10px", border: "1px solid #ddd" }}
                        >
                          {user.last_activity
                            ? new Date(user.last_activity).toLocaleDateString()
                            : "Never"}
                        </td>
                        <td
                          style={{ padding: "10px", border: "1px solid #ddd" }}
                        >
                          <Space>
                            {user.webrtc_access ? (
                              <Button
                                size="small"
                                danger
                                onClick={() =>
                                  handleUpdateUserWebRTCAccess(user.id, false)
                                }
                              >
                                Disable
                              </Button>
                            ) : (
                              <Button
                                size="small"
                                type="primary"
                                onClick={() =>
                                  handleUpdateUserWebRTCAccess(user.id, true)
                                }
                              >
                                Enable
                              </Button>
                            )}
                            <Button
                              size="small"
                              onClick={() =>
                                handleForceRemoveUserSessions(user.id)
                              }
                              loading={loading}
                            >
                              Remove Sessions
                            </Button>
                            {/* Remove user from WebRTC extension */}
                          </Space>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {licenseUsers.length === 0 && (
                  <div
                    className="no-users-message"
                    style={{
                      textAlign: "center",
                      padding: "40px",
                      color: "#666",
                    }}
                  >
                    <p>
                      No WebRTC users found for this license. Users will appear
                      here once they start using the WebRTC extension
                      (chrome-softphone-extension).
                    </p>
                    <p style={{ fontSize: "14px", marginTop: "10px" }}>
                      Users need to log in through the chrome extension or
                      electron softphone to register their WebRTC sessions with
                      this server.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal>

        <Modal
          title="UPDATE FINGERPRINT"
          open={isFingerprintModalVisible}
          onCancel={() => {
            setIsFingerprintModalVisible(false);
            if (fingerprintForm) {
              fingerprintForm.resetFields();
            }
          }}
          footer={null}
          width={600}
        >
          <Form
            form={fingerprintForm}
            layout="vertical"
            onFinish={handleUpdateFingerprint}
          >
            <Form.Item
              name="current_fingerprint"
              label="Current Server Fingerprint"
              rules={[
                {
                  required: true,
                  message: "Please input the current server fingerprint!",
                },
              ]}
            >
              <Input.TextArea
                rows={4}
                placeholder="Paste the current server fingerprint here"
              />
            </Form.Item>
            <Form.Item
              name="new_fingerprint"
              label="New Server Fingerprint"
              rules={[
                {
                  required: true,
                  message: "Please input the new server fingerprint!",
                },
              ]}
            >
              <Input.TextArea
                rows={4}
                placeholder="Paste the new server fingerprint here"
              />
            </Form.Item>
            <Form.Item
              name="organization_name"
              label="Organization Name"
              rules={[
                {
                  required: true,
                  message: "Please input the organization name!",
                },
              ]}
            >
              <Input placeholder="e.g., ABC Inc." />
            </Form.Item>
            <div className="form-help-text">
              <p>
                <strong>Fingerprint Update:</strong> This action allows you to
                update the server fingerprint for a license. This is typically
                required when the server's hardware or network configuration
                changes significantly.
              </p>
              <p>
                <strong>Reason:</strong> Specify the reason for updating the
                fingerprint, e.g., "hardware_change", "network_change",
                "reinstallation".
              </p>
            </div>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                disabled={licenseTypes.length === 0}
                block
              >
                {licenseTypes.length === 0
                  ? "Loading License Types..."
                  : "Update Fingerprint"}
              </Button>
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title={
            editingSlaveServer
              ? "UPDATE SLAVE SERVER"
              : "REGISTER NEW SLAVE SERVER"
          }
          open={isSlaveServerModalVisible}
          onCancel={() => {
            setIsSlaveServerModalVisible(false);
            setEditingSlaveServer(null);
            if (slaveServerForm) {
              slaveServerForm.resetFields();
            }
          }}
          footer={null}
          width={800}
        >
          <Form
            form={slaveServerForm}
            layout="vertical"
            onFinish={handleRegisterSlaveServer}
          >
            <Form.Item
              name="name"
              label="Server Name"
              rules={[
                { required: true, message: "Please input the server name!" },
              ]}
            >
              <Input placeholder="e.g., Production Server 1" />
            </Form.Item>

            <Form.Item
              name="domain"
              label="Domain"
              rules={[
                { required: true, message: "Please input the domain!" },
                {
                  pattern:
                    /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/,
                  message: "Please enter a valid domain name",
                },
              ]}
            >
              <Input placeholder="e.g., cs.brhgroup.co" />
            </Form.Item>

            <Form.Item name="description" label="Description">
              <Input.TextArea
                rows={3}
                placeholder="Brief description of this slave server"
              />
            </Form.Item>

            <Form.Item
              name="api_url"
              label="API URL"
              rules={[
                { required: true, message: "Please input the API URL!" },
                {
                  pattern: /^https?:\/\/.+/,
                  message: "Please enter a valid HTTP/HTTPS URL",
                },
              ]}
            >
              <Input placeholder="e.g., https://cs.brhgroup.co:8004" />
            </Form.Item>

            <Form.Item
              name="websocket_url"
              label="WebSocket URL"
              rules={[
                {
                  pattern: /^wss?:\/\/.+/,
                  message: "Please enter a valid WS/WSS URL",
                },
              ]}
            >
              <Input placeholder="e.g., wss://cs.brhgroup.co:8089" />
            </Form.Item>

            <div className="form-help-text">
              <p>
                <strong>Server Registration:</strong> This will register a new
                slave server with the master licensing system. The slave server
                will receive API credentials for automatic synchronization.
              </p>
              <p>
                <strong>Note:</strong> After registration, the slave server will
                need to be manually activated from the server list.
              </p>
            </div>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block>
                {editingSlaveServer ? "Update Server" : "Register Server"}
              </Button>
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title="HEALTH CHECK RESULTS"
          open={isSlaveServerHealthModalVisible}
          onCancel={() => setIsSlaveServerHealthModalVisible(false)}
          footer={[
            <Button
              key="close"
              onClick={() => setIsSlaveServerHealthModalVisible(false)}
            >
              Close
            </Button>,
          ]}
          width={900}
        >
          <div className="health-check-results">
            <Table
              columns={[
                {
                  title: "Server",
                  dataIndex: "domain",
                  key: "domain",
                },
                {
                  title: "Health Status",
                  dataIndex: "health_status",
                  key: "health_status",
                  render: (status) => {
                    const colors = {
                      healthy: "#52c41a",
                      unhealthy: "#f5222d",
                    };
                    return (
                      <span
                        style={{
                          color: colors[status],
                          fontWeight: "bold",
                        }}
                      >
                        {status}
                      </span>
                    );
                  },
                },
                {
                  title: "Response Time",
                  dataIndex: "response_time",
                  key: "response_time",
                },
                {
                  title: "Details",
                  dataIndex: "error",
                  key: "error",
                  render: (error, record) =>
                    error ||
                    (record.health_status === "healthy" ? "OK" : "N/A"),
                },
              ]}
              dataSource={slaveServerHealthData}
              rowKey="server_id"
              pagination={false}
              size="small"
            />
          </div>
        </Modal>

        <Modal
          title="Edit License Type Features"
          open={isLicenseTypeModalVisible}
          onCancel={() => setIsLicenseTypeModalVisible(false)}
          footer={null}
        >
          <Form
            form={licenseTypeForm}
            layout="vertical"
            onFinish={handleUpdateLicenseType}
          >
            <Form.Item name="name" label="Name">
              <Input disabled />
            </Form.Item>
            <Form.Item name="description" label="Description">
              <Input.TextArea />
            </Form.Item>
            <Form.Item name="max_concurrent_users" label="Max Concurrent Users">
              <InputNumber style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="price_monthly" label="Price Monthly">
              <InputNumber style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item label="Features">
              <div>
                {Object.keys(allFeatures).map((key) => (
                  <Form.Item
                    key={key}
                    name={["features", key]}
                    label={key}
                    valuePropName="checked"
                    style={{ marginBottom: 8 }}
                  >
                    <Switch />
                  </Form.Item>
                ))}
              </div>
            </Form.Item>
            <Button type="primary" htmlType="submit">
              Update License Type
            </Button>
          </Form>
        </Modal>

        <div className="admin-footer">
          <div className="footer-links">
            <a href="/dashboard" className="footer-link">
              Back to Dashboard
            </a>
            <a href="/" className="footer-link">
              🌐 Main Website
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
