import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  TextField,
  Button,
  Paper,
  Grid,
  Typography,
  InputAdornment,
  IconButton,
  Box,
  Switch,
  FormControlLabel,
  CircularProgress, // Added for loading state
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  ErrorOutline as ErrorIcon, // Added for error display
  Phone,
  HeadsetMic,
  Call,
  PhoneInTalk,
  Support,
  Chat,
  PhoneCallback,
  Voicemail,
  RecordVoiceOver,
  Mic,
  VolumeUp,
  VolumeDown,
  Speaker,
  CallEnd,
  CallMade,
  CallReceived,
  PhoneEnabled,
  ContactPhone,
  Business,
  People,
  Group,
  Person,
  SupervisorAccount,
  Assignment,
  Task,
  Schedule,
  Timer,
  Notifications,
  NotificationsActive,
  Message,
  Email,
  Sms,
  VideoCall,
  Videocam,
  Wifi,
  SignalCellular4Bar,
  SignalCellular3Bar,
  SignalCellular2Bar,
  WhatsApp,
  Discount,
  Extension,
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import useAuth from "../hooks/useAuth";
// import reachmilogo from "../assets/images/reachmi-logo.svg"; // Placeholder path
import brLogo from "../assets/images/br-logo.svg"; // Placeholder path

// Animated background icons component
const AnimatedBackgroundIcons = () => {
  const icons = [
    // Phone & Call Icons
    { Icon: Phone, delay: 0, position: { top: "10%", left: "10%" } },
    { Icon: HeadsetMic, delay: 1, position: { top: "20%", right: "15%" } },
    { Icon: Call, delay: 2, position: { top: "60%", left: "8%" } },
    { Icon: PhoneInTalk, delay: 3, position: { top: "70%", right: "12%" } },
    { Icon: PhoneCallback, delay: 4, position: { top: "40%", left: "5%" } },
    { Icon: CallMade, delay: 5, position: { top: "50%", right: "8%" } },
    { Icon: CallReceived, delay: 6, position: { top: "15%", left: "85%" } },
    { Icon: CallEnd, delay: 7, position: { top: "80%", left: "20%" } },
    { Icon: PhoneEnabled, delay: 8, position: { top: "30%", right: "5%" } },
    { Icon: ContactPhone, delay: 9, position: { top: "85%", right: "20%" } },

    // Communication Icons
    { Icon: Chat, delay: 10, position: { top: "25%", left: "25%" } },
    { Icon: Message, delay: 11, position: { top: "35%", right: "25%" } },
    { Icon: Email, delay: 12, position: { top: "45%", left: "15%" } },
    { Icon: Sms, delay: 13, position: { top: "55%", right: "15%" } },
    { Icon: Voicemail, delay: 14, position: { top: "75%", left: "35%" } },

    // Video & Media Icons
    { Icon: VideoCall, delay: 15, position: { top: "5%", left: "50%" } },
    { Icon: Videocam, delay: 16, position: { top: "95%", right: "30%" } },
    {
      Icon: RecordVoiceOver,
      delay: 17,
      position: { top: "12%", right: "40%" },
    },
    { Icon: Mic, delay: 18, position: { top: "88%", left: "60%" } },

    // Audio & Volume Icons
    { Icon: VolumeUp, delay: 19, position: { top: "18%", left: "70%" } },
    { Icon: VolumeDown, delay: 20, position: { top: "82%", right: "60%" } },
    { Icon: Speaker, delay: 21, position: { top: "38%", left: "45%" } },

    // Support & People Icons
    { Icon: Support, delay: 22, position: { top: "28%", right: "35%" } },
    { Icon: People, delay: 23, position: { top: "48%", left: "25%" } },
    { Icon: Group, delay: 24, position: { top: "68%", right: "45%" } },
    { Icon: Person, delay: 25, position: { top: "8%", right: "50%" } },
    {
      Icon: SupervisorAccount,
      delay: 26,
      position: { top: "92%", left: "40%" },
    },
    { Icon: Business, delay: 27, position: { top: "58%", left: "70%" } },

    // Task & Schedule Icons
    { Icon: Assignment, delay: 28, position: { top: "22%", left: "80%" } },
    { Icon: Task, delay: 29, position: { top: "42%", right: "70%" } },
    { Icon: Schedule, delay: 30, position: { top: "62%", left: "90%" } },
    { Icon: Timer, delay: 31, position: { top: "78%", right: "80%" } },

    // Notification Icons
    { Icon: Notifications, delay: 32, position: { top: "32%", left: "60%" } },
    {
      Icon: NotificationsActive,
      delay: 33,
      position: { top: "52%", right: "25%" },
    },

    // Network & Signal Icons
    { Icon: Wifi, delay: 34, position: { top: "72%", left: "30%" } },
    {
      Icon: SignalCellular4Bar,
      delay: 35,
      position: { top: "14%", left: "40%" },
    },
    {
      Icon: SignalCellular3Bar,
      delay: 36,
      position: { top: "64%", right: "55%" },
    },
    {
      Icon: SignalCellular2Bar,
      delay: 37,
      position: { top: "84%", left: "50%" },
    },
    { Icon: WhatsApp, delay: 38, position: { top: "10%", right: "10%" } },
    { Icon: Discount, delay: 39, position: { top: "90%", left: "10%" } },
    { Icon: Extension, delay: 40, position: { top: "10%", right: "10%" } },
  ];

  return (
    <Box
      sx={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      {/* Animated call rings */}
      <Box
        sx={{
          position: "absolute",
          top: "20%",
          left: "15%",
          width: "60px",
          height: "60px",
          border: "3px solid rgba(4, 101, 119, 0.3)",
          borderRadius: "50%",
          animation: "pulse 3s ease-in-out infinite",
          "@keyframes pulse": {
            "0%": {
              transform: "scale(1)",
              opacity: 0.8,
            },
            "50%": {
              transform: "scale(1.3)",
              opacity: 0.6,
            },
            "100%": {
              transform: "scale(1)",
              opacity: 0.9,
            },
          },
        }}
      />
      <Box
        sx={{
          position: "absolute",
          top: "65%",
          right: "20%",
          width: "80px",
          height: "80px",
          border: "3px solid rgba(4, 101, 119, 0.25)",
          borderRadius: "50%",
          animation: "pulse 4s ease-in-out infinite 1s",
          "@keyframes pulse": {
            "0%": {
              transform: "scale(1)",
              opacity: 0.7,
            },
            "50%": {
              transform: "scale(1.4)",
              opacity: 0.5,
            },
            "100%": {
              transform: "scale(1)",
              opacity: 0.8,
            },
          },
        }}
      />
      <Box
        sx={{
          position: "absolute",
          top: "40%",
          left: "75%",
          width: "50px",
          height: "50px",
          border: "3px solid rgba(4, 101, 119, 0.28)",
          borderRadius: "50%",
          animation: "pulse 2.5s ease-in-out infinite 0.5s",
          "@keyframes pulse": {
            "0%": {
              transform: "scale(1)",
              opacity: 0.6,
            },
            "50%": {
              transform: "scale(1.5)",
              opacity: 0.4,
            },
            "100%": {
              transform: "scale(1)",
              opacity: 0.7,
            },
          },
        }}
      />
      <Box
        sx={{
          position: "absolute",
          top: "80%",
          left: "45%",
          width: "70px",
          height: "70px",
          border: "3px solid rgba(4, 101, 119, 0.22)",
          borderRadius: "50%",
          animation: "pulse 3.5s ease-in-out infinite 2s",
          "@keyframes pulse": {
            "0%": {
              transform: "scale(1)",
              opacity: 0.5,
            },
            "50%": {
              transform: "scale(1.6)",
              opacity: 0.3,
            },
            "100%": {
              transform: "scale(1)",
              opacity: 0.6,
            },
          },
        }}
      />
      <Box
        sx={{
          position: "absolute",
          top: "10%",
          right: "40%",
          width: "45px",
          height: "45px",
          border: "3px solid rgba(4, 101, 119, 0.26)",
          borderRadius: "50%",
          animation: "pulse 2s ease-in-out infinite 1.5s",
          "@keyframes pulse": {
            "0%": {
              transform: "scale(1)",
              opacity: 0.7,
            },
            "50%": {
              transform: "scale(1.4)",
              opacity: 0.4,
            },
            "100%": {
              transform: "scale(1)",
              opacity: 0.8,
            },
          },
        }}
      />

      {/* Floating call center icons */}
      {icons.map(({ Icon, delay, position }, index) => (
        <Box
          key={index}
          sx={{
            position: "absolute",
            ...position,
            color: "rgba(4, 101, 119, 0.25)",
            animation: `float ${6 + Math.random() * 4}s ease-in-out infinite`,
            animationDelay: `${delay}s`,
            transform: "translateY(0px)",
            "@keyframes float": {
              "0%, 100%": {
                transform: "translateY(0px) rotate(0deg)",
                opacity: 0.25,
              },
              "25%": {
                transform: "translateY(-25px) rotate(8deg)",
                opacity: 0.5,
              },
              "50%": {
                transform: "translateY(-15px) rotate(-5deg)",
                opacity: 0.4,
              },
              "75%": {
                transform: "translateY(-20px) rotate(3deg)",
                opacity: 0.45,
              },
            },
          }}
        >
          <Icon sx={{ fontSize: { xs: "28px", sm: "36px", md: "48px" } }} />
        </Box>
      ))}
    </Box>
  );
};

const LoginMayday = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login, loading, isAuthenticated } = useAuth(); // include auth state
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const [useLocalApp, setUseLocalApp] = useState(false); // Keep electron logic for now
  const [isElectronApp, setIsElectronApp] = useState(false);
  const [loginError, setLoginError] = useState(null); // Local state for error message

  // Electron-specific check (can be removed if not using Electron for dashboard)
  useEffect(() => {
    const checkElectron = () => {
      try {
        return window.electron !== undefined;
      } catch (e) {
        return false;
      }
    };
    setIsElectronApp(checkElectron());
  }, []);

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };

  const handleAppToggle = async (event) => {
    const useLocal = event.target.checked;
    setUseLocalApp(useLocal);
    // Keep electron logic for now
    if (isElectronApp && window.electron) {
      localStorage.setItem("useRemoteUrl", (!useLocal).toString());
      window.electron.send("set-url-preference", !useLocal);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginError(null); // Clear previous errors
    try {
      const result = await login(username, password);
      if (result.user) {
        enqueueSnackbar("Login successful!", { variant: "success" });
        navigate("/dashboard", { replace: true }); // Navigate to dashboard on success
      }
    } catch (err) {
      // Error is thrown by useAuth login function on failure
      console.error("Login failed:", err);
      const errorMessage =
        err.message || "Login failed. Please check credentials.";
      setLoginError(errorMessage); // Set local error state
      enqueueSnackbar(errorMessage, {
        variant: "error",
      });
      // Clear password field on error
      setPassword("");
    }
  };

  // If already authenticated, skip login screen
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <Box
      sx={{
        position: "relative",
        minHeight: "100vh",
        backgroundColor: "#f0f4f8",
        overflow: "hidden",
      }}
    >
      {/* Animated Background Icons */}
      <AnimatedBackgroundIcons />

      <Grid
        container
        alignItems="center"
        justifyContent="center"
        sx={{
          minHeight: "100vh",
          padding: { xs: 1, sm: 2 },
          position: "relative",
          zIndex: 1,
        }}
      >
        <Grid item xs={12} sm={10} md={8} lg={6} xl={4}>
          <Paper
            elevation={6}
            sx={{
              padding: { xs: "1.5rem", sm: "2rem" },
              margin: { xs: "1rem", sm: "0" },
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
            }}
          >
            {/* <Box textAlign="center" mb={2}>
            <Typography
              variant="h4"
              component="h1"
              // color="#E87D07"
              color="#000000"
              style={{
                fontWeight: "bolder",
                marginTop: "0.5rem",
                fontSize: "3rem",
              }}
            >
              Morven Consults
            </Typography>
          </Box> */}

            {/* Add Logo */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: { xs: "-2rem", sm: "-3rem", md: "-4rem" },
              }}
            >
              <Box
                component="img"
                src={brLogo}
                alt="Mayday Logo"
                sx={{
                  width: "100%",
                  maxWidth: { xs: "200px", sm: "250px", md: "300px" },
                  height: "auto",
                  objectFit: "contain",
                }}
              />
            </Box>
            {/* Stylish divider */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                margin: "1.5rem 0",
                "&::before, &::after": {
                  content: '""',
                  flex: 1,
                  height: "1px",
                  background:
                    "linear-gradient(90deg, transparent, #5f605f, transparent)",
                },
              }}
            >
              <Box
                sx={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: "#ccc",
                  margin: "0 12px",
                }}
              />
            </Box>
            <Typography
              variant="h6"
              component="h2"
              sx={{
                textAlign: "center",
                marginBottom: "1.5rem",
                color: "#555",
                fontWeight: "lighter",
                fontSize: { xs: "12px", sm: "14px" },
                fontFamily: "Arial, sans-serif",
                fontStyle: "italic",
                padding: { xs: "0 1rem", sm: "0" },
              }}
            >
              Logon to manage Mayday Contact Center!
            </Typography>
            <form onSubmit={handleSubmit}>
              <TextField
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                margin="normal"
                fullWidth
                required
                disabled={loading}
              />
              <TextField
                label="Password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                margin="normal"
                fullWidth
                required
                disabled={loading}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleClickShowPassword}
                        onMouseDown={handleMouseDownPassword}
                        edge="end"
                        disabled={loading}
                      >
                        {showPassword ? <Visibility /> : <VisibilityOff />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              {/* Display Login Error Message */}
              {loginError && (
                <Box
                  display="flex"
                  alignItems="center"
                  mt={1}
                  mb={1}
                  color="error.main"
                >
                  <ErrorIcon fontSize="small" sx={{ mr: 0.5 }} />
                  <Typography variant="caption">{loginError}</Typography>
                </Box>
              )}

              {/* Electron specific toggle - keep for now */}
              {isElectronApp && (
                <FormControlLabel
                  control={
                    <Switch
                      checked={useLocalApp}
                      onChange={handleAppToggle}
                      color="primary"
                      disabled={loading}
                    />
                  }
                  label="Use Local App"
                  style={{ marginBottom: "1rem", display: "block" }}
                />
              )}
              <Button
                type="submit"
                sx={{
                  backgroundColor: "#046577",
                  "&:hover": {
                    backgroundColor: "#046577",
                  },
                  marginTop: "1rem",
                  height: { xs: "48px", sm: "40px" },
                  fontSize: { xs: "16px", sm: "14px" },
                }}
                // color="warning"
                variant="contained"
                fullWidth
                disabled={loading} // Disable button while loading
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  "Log In"
                )}
              </Button>
            </form>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default LoginMayday;
