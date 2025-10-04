import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  Button,
  Form,
  Input,
  message,
  Typography,
  Space,
  Alert,
  Skeleton,
  Descriptions,
  Tag,
  List,
  Tooltip,
} from "antd";
import { CopyOutlined } from "@ant-design/icons";
import VoicemailIcon from "@mui/icons-material/Voicemail";
import {
  PhoneOutlined,
  MicOutlined,
  SwapHorizOutlined,
  GroupOutlined,
  VideocamOutlined,
  WhatsApp,
  EmailOutlined,
  FacebookOutlined,
  IntegrationInstructionsOutlined,
  SmsOutlined,
  BusinessOutlined,
  PhoneIphoneOutlined,
} from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";
import { fetchCurrentLicense } from "../features/licenses/licenseSlice";
import useAuth from "../hooks/useAuth";
import licenseService from "../services/licenseService";
import { getSocket } from "../services/websocketService";
import DebugLicense from "./DebugLicense.jsx";

const { Text } = Typography;

const getFeatureDisplayName = (featureKey) => {
  const featureNames = {
    calls: "Calls",
    recording: "Recording",
    transfers: "Transfers",
    conferences: "Conferences",
    reports: "Reports",
    crm: "CRM",
    whatsapp: "WhatsApp",
    salesforce: "Salesforce",
    facebook: "Facebook",
    email: "Email",
    twilio: "Twilio",
    third_party_integrations: "Third Party Integrations",
    sms: "SMS",
    video: "Video",
    voicemail: "Voicemail",
    webrtc_extension: "WebRTC Extension",
  };
  return featureNames[featureKey] || featureKey;
};

const getFeatureIcon = (featureKey) => {
  const icons = {
    calls: <PhoneOutlined />,
    recording: <MicOutlined />,
    transfers: <SwapHorizOutlined />,
    conferences: <GroupOutlined />,
    reports: <VideocamOutlined />,
    crm: <BusinessOutlined />,
    whatsapp: <WhatsApp />,
    salesforce: <BusinessOutlined />,
    facebook: <FacebookOutlined />,
    email: <EmailOutlined />,
    twilio: <PhoneIphoneOutlined />,
    third_party_integrations: <IntegrationInstructionsOutlined />,
    sms: <SmsOutlined />,
    video: <VideocamOutlined />,
    voicemail: <VoicemailIcon />,
    default: <IntegrationInstructionsOutlined />,
  };
  return icons[featureKey] || icons.default;
};

const RequestLicenseForm = ({
  form,
  onFinish,
  onValuesChange,
  onGenerateFingerprint,
  fingerprint,
  isGenerated,
  orgName,
  copyToClipboard,
}) => (
  <Form
    form={form}
    layout="vertical"
    onFinish={onFinish}
    onValuesChange={onValuesChange}
  >
    <Form.Item
      name="organizationName"
      label="Organization Name"
      rules={[{ required: true, message: "Please enter organization name" }]}
    >
      <Input placeholder="Enter your organization name" />
    </Form.Item>

    <Form.Item
      name="serverFingerprint"
      label="Server Fingerprint"
      rules={[
        { required: true, message: "Please generate server fingerprint" },
      ]}
    >
      <Input.TextArea
        rows={3}
        placeholder="Server fingerprint will be generated automatically"
        readOnly
      />
    </Form.Item>

    <Form.Item>
      <Space>
        <Button
          type="primary"
          onClick={onGenerateFingerprint}
          icon={<CopyOutlined />}
        >
          Generate Fingerprint
        </Button>
        {fingerprint && (
          <Button
            onClick={() => copyToClipboard(fingerprint)}
            icon={<CopyOutlined />}
          >
            Copy Fingerprint
          </Button>
        )}
      </Space>
    </Form.Item>

    {isGenerated && (
      <Alert
        message="License Request Generated"
        description={
          <div>
            <p>
              <strong>Organization:</strong> {orgName}
            </p>
            <p>
              <strong>Fingerprint:</strong> {fingerprint}
            </p>
            <p>
              Please send this information to your administrator to get a
              license.
            </p>
          </div>
        }
        type="success"
        showIcon
      />
    )}
  </Form>
);

const LicenseManagement = () => {
  const { isAuthenticated } = useAuth();
  const dispatch = useDispatch();
  const { currentLicense, loadingCurrentLicense } = useSelector(
    (state) => state.licenses
  );

  const [fingerprint, setFingerprint] = useState("");
  const [orgName, setOrgName] = useState("");
  const [isGenerated, setIsGenerated] = useState(false);
  const [form] = Form.useForm();

  const memoizedFetchCurrentLicense = useCallback(() => {
    if (isAuthenticated) {
      dispatch(fetchCurrentLicense());
    }
  }, [dispatch, isAuthenticated]);

  useEffect(() => {
    memoizedFetchCurrentLicense();
  }, [memoizedFetchCurrentLicense]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = getSocket();

    socket.on("connect", () => {
      console.log("Socket connected for license updates.");
    });

    const handleLicenseUpdate = (data) => {
      console.log("Received license update from server:", data);
      message.info("License information has updated. Refreshing...");

      // Force a fresh fetch of the license data
      dispatch(fetchCurrentLicense());

      // Also trigger a manual refresh after a short delay
      setTimeout(() => {
        memoizedFetchCurrentLicense();
      }, 1000);
    };

    // Listen for license updates
    socket.on("license:updated", handleLicenseUpdate);

    // Also listen for general updates
    socket.on("license:update", handleLicenseUpdate);

    // Debug: Log when socket is ready
    if (socket.connected) {
      console.log("Socket already connected, listening for license updates");
    }

    return () => {
      socket.off("license:updated", handleLicenseUpdate);
      socket.off("license:update", handleLicenseUpdate);
    };
  }, [memoizedFetchCurrentLicense, isAuthenticated, dispatch]);

  console.log("License data in component:", currentLicense);

  const handleGenerateFingerprint = async () => {
    try {
      const response = await licenseService.getServerFingerprint();
      const fp = response.data.fingerprint;
      setFingerprint(fp);
      form.setFieldsValue({ serverFingerprint: fp });
    } catch (error) {
      message.error("Failed to generate server fingerprint.");
    }
  };

  const onFormValuesChange = (changedValues) => {
    if (changedValues.organizationName) {
      setOrgName(changedValues.organizationName);
    }
  };

  const handleFinish = () => {
    if (fingerprint && orgName) {
      setIsGenerated(true);
      message.success(
        "Information generated! Please copy it and send it to your administrator."
      );
    } else {
      message.warn(
        "Please provide an organization name and generate a fingerprint."
      );
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    message.success("Copied to clipboard!");
  };

  const requestFormProps = {
    form,
    onFinish: handleFinish,
    onValuesChange: onFormValuesChange,
    onGenerateFingerprint: handleGenerateFingerprint,
    fingerprint,
    isGenerated,
    orgName,
    copyToClipboard,
  };

  if (loadingCurrentLicense === "pending" || loadingCurrentLicense === "idle") {
    return (
      <Card>
        <Skeleton active />
      </Card>
    );
  }

  if (currentLicense?.error) {
    return (
      <Alert
        message="Error"
        description="Failed to fetch license status. Please try again later."
        type="error"
        showIcon
      />
    );
  }

  if (currentLicense && currentLicense.licensed) {
    const { license } = currentLicense;

    let licensedFeatures = license.license_type.features || {};
    if (typeof licensedFeatures === "string") {
      try {
        licensedFeatures = JSON.parse(licensedFeatures);
      } catch (e) {
        console.error("Failed to parse features JSON in LicenseManagement:", e);
        licensedFeatures = {};
      }
    }

    let statusColor;
    let statusMessage;
    let alertType;
    let displayStatus = license.status;

    // Check if it's a development license (trial)
    const isDevelopmentLicense =
      license.organization_name === "Development License" ||
      license.license_type?.name === "Development" ||
      license.master_license_id === "0";

    if (isDevelopmentLicense && license.status === "active") {
      displayStatus = "trial";
      statusColor = "blue";
      alertType = "info";
      statusMessage =
        "You are currently using a trial license with basic features. Contact your administrator to upgrade to a full license.";
    } else {
      switch (license.status) {
        case "active":
          statusColor = "green";
          alertType = "success";
          statusMessage =
            "Your license is active and the system is fully operational.";

          // Check if it's a trial (short expiration)
          const expires = new Date(license.expires_at);
          const now = new Date();
          const fourteenDaysFromNow = new Date();
          fourteenDaysFromNow.setDate(now.getDate() + 15); // A bit of leeway

          if (expires < fourteenDaysFromNow) {
            const daysRemaining = Math.ceil(
              (expires - now) / (1000 * 60 * 60 * 24)
            );
            if (daysRemaining >= 0 && daysRemaining <= 14) {
              alertType = "info";
              statusMessage = `You are currently on a trial license with ${daysRemaining} days remaining.`;
            }
          }
          break;
        case "suspended":
          statusColor = "orange";
          alertType = "warning";
          statusMessage =
            "This license has been suspended. Please contact your administrator for assistance.";
          break;
        case "expired":
          statusColor = "red";
          alertType = "error";
          statusMessage =
            "This license has expired. Please renew your license to continue using the service.";
          break;
        default:
          statusColor = "grey";
          alertType = "info";
          statusMessage = "The license is in an unknown state.";
      }
    }

    return (
      <>
        <Card title="License Details">
          <Alert
            message={`License Status: ${displayStatus.toUpperCase()}`}
            description={statusMessage}
            type={alertType}
            showIcon
            style={{ marginBottom: 24 }}
          />
          <Descriptions bordered column={1} layout="horizontal">
            <Descriptions.Item label="Organization">
              {license.organization_name}
            </Descriptions.Item>
            <Descriptions.Item label="License Type">
              {license.license_type.name}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={statusColor}>{displayStatus.toUpperCase()}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Max Users">
              {license.max_users}
            </Descriptions.Item>
            <Descriptions.Item label="Issued At">
              {new Date(license.issued_at).toLocaleDateString()}
            </Descriptions.Item>
            <Descriptions.Item label="Expires At">
              {new Date(license.expires_at).toLocaleDateString()}
            </Descriptions.Item>
            <Descriptions.Item label="Server Fingerprint">
              <Space>
                <Text code>{license.server_fingerprint}</Text>
                <Button
                  icon={<CopyOutlined />}
                  onClick={() => copyToClipboard(license.server_fingerprint)}
                />
              </Space>
            </Descriptions.Item>
          </Descriptions>
        </Card>
        <Card title="Plan Features" style={{ marginTop: 24 }}>
          <List
            grid={{
              gutter: 16,
              xs: 1,
              sm: 2,
              md: 3,
              lg: 3,
              xl: 4,
              xxl: 4,
            }}
            dataSource={Object.entries(licensedFeatures)}
            renderItem={([featureKey, isEnabled]) => {
              const featureName = getFeatureDisplayName(featureKey);
              const icon = getFeatureIcon(featureKey);
              return (
                <List.Item>
                  <Tooltip title={featureName} placement="bottom">
                    <Card
                      hoverable
                      style={{
                        textAlign: "center",
                        borderRadius: "12px",
                        borderTop: `4px solid ${
                          isEnabled ? "#4caf50" : "rgba(0, 0, 0, 0.72)"
                        }`,
                        background: "#fff",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        transition: "all 0.3s ease",
                        opacity: isEnabled ? 1 : 0.5,
                      }}
                    >
                      <div
                        style={{
                          fontSize: "25px",
                          color: isEnabled ? "#4caf50" : "rgba(0,0,0,0.4)",
                          margin: "20px 0 16px",
                        }}
                      >
                        {icon}
                      </div>
                      <Card.Meta
                        title={
                          <Typography.Text
                            strong
                            style={{
                              color: isEnabled
                                ? "rgba(0,0,0,0.88)"
                                : "rgba(0,0,0,0.55)",
                            }}
                          >
                            {featureName}
                          </Typography.Text>
                        }
                      />
                    </Card>
                  </Tooltip>
                </List.Item>
              );
            }}
          />
        </Card>
        {(license.status === "suspended" ||
          license.status === "expired" ||
          alertType === "info") && (
          <div style={{ marginTop: 24 }}>
            <RequestLicenseForm {...requestFormProps} />
          </div>
        )}

        {/* Debug Component - Remove after debugging */}
        <DebugLicense />
      </>
    );
  }

  return <RequestLicenseForm {...requestFormProps} />;
};

export default LicenseManagement;
