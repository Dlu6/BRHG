import React, { useState, useEffect, useRef } from "react";
import {
  FaMicrophone,
  FaVolumeUp,
  FaPlay,
  FaStop,
  FaExclamationTriangle,
  FaCheckCircle,
} from "react-icons/fa";

const SettingsDialog = ({ onCancel }) => {
  const [audioDevices, setAudioDevices] = useState({ inputs: [], outputs: [] });
  const [selectedInput, setSelectedInput] = useState("");
  const [selectedOutput, setSelectedOutput] = useState("");
  const [microphoneLevel, setMicrophoneLevel] = useState(0);
  const [outputVolume, setOutputVolume] = useState(50);
  const [isMicTesting, setIsMicTesting] = useState(false);
  const [isPlayingTestSound, setIsPlayingTestSound] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState("unknown");
  const [testResults, setTestResults] = useState({});

  const micStreamRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const testAudioRef = useRef(null);

  useEffect(() => {
    checkPermissions();
    loadDevices();
    loadSettings();

    return () => {
      stopMicrophoneTest();
      stopTestSound();
    };
  }, []);

  const checkPermissions = async () => {
    try {
      if (navigator.permissions) {
        const permission = await navigator.permissions.query({
          name: "microphone",
        });
        setPermissionStatus(permission.state);

        permission.onchange = () => {
          setPermissionStatus(permission.state);
        };
      }
    } catch (error) {
      console.warn("Could not check microphone permissions:", error);
    }
  };

  const loadDevices = async () => {
    try {
      // Request permission first
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices.filter((device) => device.kind === "audioinput");
      const outputs = devices.filter((device) => device.kind === "audiooutput");

      setAudioDevices({ inputs, outputs });

      // Set default devices if none selected
      if (!selectedInput && inputs.length > 0) {
        setSelectedInput(inputs[0].deviceId);
      }
      if (!selectedOutput && outputs.length > 0) {
        setSelectedOutput(outputs[0].deviceId);
      }

      setPermissionStatus("granted");
    } catch (error) {
      console.error("Error loading audio devices:", error);
      setPermissionStatus("denied");
    }
  };

  const loadSettings = async () => {
    try {
      const result = await chrome.storage.local.get(["audioSettings"]);
      if (result.audioSettings) {
        const settings = result.audioSettings;
        setSelectedInput(settings.inputDevice || "");
        setSelectedOutput(settings.outputDevice || "");
        setOutputVolume(settings.outputVolume || 50);
      }
    } catch (error) {
      console.warn("Could not load audio settings:", error);
    }
  };

  const saveSettings = async () => {
    try {
      const settings = {
        inputDevice: selectedInput,
        outputDevice: selectedOutput,
        outputVolume: outputVolume,
        timestamp: Date.now(),
      };

      await chrome.storage.local.set({ audioSettings: settings });
      console.log("Audio settings saved:", settings);
    } catch (error) {
      console.error("Could not save audio settings:", error);
    }
  };

  const startMicrophoneTest = async () => {
    try {
      setIsMicTesting(true);
      console.log("[Settings] 🎤 Starting microphone test...");

      const constraints = {
        audio: {
          deviceId: selectedInput ? { exact: selectedInput } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      };

      console.log(
        "[Settings] 🎤 Requesting microphone with constraints:",
        constraints
      );
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      micStreamRef.current = stream;

      console.log("[Settings] 🎤 Microphone stream obtained:", {
        tracks: stream.getAudioTracks().length,
        trackSettings: stream.getAudioTracks()[0]?.getSettings(),
        trackEnabled: stream.getAudioTracks()[0]?.enabled,
        trackLabel: stream.getAudioTracks()[0]?.label,
      });

      // Set up audio analysis
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      console.log(
        "[Settings] 🎤 AudioContext created, state:",
        audioContext.state
      );

      // Resume audio context if suspended
      if (audioContext.state === "suspended") {
        await audioContext.resume();
        console.log("[Settings] 🎤 AudioContext resumed");
      }

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();

      // Configure analyser for time domain analysis (better for volume detection)
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0; // Less smoothing for more responsive levels

      source.connect(analyser);
      analyserRef.current = analyser;

      console.log("[Settings] 🎤 Audio analyser connected:", {
        fftSize: analyser.fftSize,
        frequencyBinCount: analyser.frequencyBinCount,
        sampleRate: audioContext.sampleRate,
        bufferLength: analyser.fftSize,
      });

      // Start monitoring audio levels using time domain data
      const monitorLevel = () => {
        if (!analyserRef.current) {
          console.log("[Settings] 🎤 Stopping level monitoring");
          return;
        }

        // Use time domain data for better amplitude detection
        const bufferLength = analyser.fftSize;
        const dataArray = new Float32Array(bufferLength);
        analyser.getFloatTimeDomainData(dataArray);

        // Calculate amplitude from time domain data
        let sum = 0;
        let max = 0;
        for (let i = 0; i < bufferLength; i++) {
          const amplitude = Math.abs(dataArray[i]);
          sum += amplitude * amplitude;
          max = Math.max(max, amplitude);
        }

        // Use RMS for smooth level, peak for responsiveness
        const rms = Math.sqrt(sum / bufferLength);
        const peak = max;

        // Combine RMS and peak for better visualization, adjust scaling for sensitivity
        const level = Math.min(
          100,
          Math.max(rms * 150, peak * 100) // Increased sensitivity
        );

        setMicrophoneLevel(level);

        // Debug log when there's audio activity
        if (level > 1) {
          console.log("[Settings] 🎤 Audio detected:", {
            level: level.toFixed(1) + "%",
            rms: rms.toFixed(3),
            peak: peak.toFixed(3),
            sampleCount: bufferLength,
          });
        }

        animationFrameRef.current = requestAnimationFrame(monitorLevel);
      };

      monitorLevel();
      setTestResults((prev) => ({ ...prev, microphone: "testing" }));
      console.log("[Settings] 🎤 Microphone test started successfully");
    } catch (error) {
      console.error("[Settings] 🎤 Microphone test failed:", error);
      setTestResults((prev) => ({ ...prev, microphone: "failed" }));
      setIsMicTesting(false);

      // Show user-friendly error message
      if (error.name === "NotAllowedError") {
        alert(
          "Microphone permission denied. Please allow microphone access and try again."
        );
      } else if (error.name === "NotFoundError") {
        alert(
          "No microphone found. Please connect a microphone and try again."
        );
      } else if (error.name === "OverconstrainedError") {
        alert(
          "Selected microphone device is not available. Please select a different device."
        );
      } else {
        alert(`Microphone test failed: ${error.message}`);
      }
    }
  };

  const stopMicrophoneTest = () => {
    setIsMicTesting(false);
    setMicrophoneLevel(0);

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }

    analyserRef.current = null;
    setTestResults((prev) => ({ ...prev, microphone: "passed" }));
  };

  const playTestSound = async () => {
    try {
      setIsPlayingTestSound(true);

      // Create a test tone (440 Hz sine wave for 2 seconds)
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
      oscillator.type = "sine";

      // Set volume based on slider
      gainNode.gain.setValueAtTime(
        (outputVolume / 100) * 0.3,
        audioContext.currentTime
      ); // Max 30% to avoid ear damage

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 2);

      oscillator.onended = () => {
        setIsPlayingTestSound(false);
        setTestResults((prev) => ({ ...prev, speaker: "passed" }));
      };

      setTestResults((prev) => ({ ...prev, speaker: "testing" }));
    } catch (error) {
      console.error("Speaker test failed:", error);
      setTestResults((prev) => ({ ...prev, speaker: "failed" }));
      setIsPlayingTestSound(false);
    }
  };

  const stopTestSound = () => {
    setIsPlayingTestSound(false);
    // Test tone will stop automatically
  };

  const handleSave = () => {
    saveSettings();
    onCancel();
  };

  const getStatusIcon = (test) => {
    const status = testResults[test];
    switch (status) {
      case "testing":
        return <span style={{ color: "#f39c12" }}>⏳</span>;
      case "passed":
        return <FaCheckCircle style={{ color: "#27ae60" }} />;
      case "failed":
        return <FaExclamationTriangle style={{ color: "#e74c3c" }} />;
      default:
        return <span style={{ color: "#7f8c8d" }}>⚪</span>;
    }
  };

  const dialogStyle = {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    backgroundColor: "white",
    padding: "25px",
    borderRadius: "12px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
    zIndex: 10001,
    color: "black",
    minWidth: "500px",
    maxWidth: "600px",
    maxHeight: "80vh",
    overflowY: "auto",
  };

  const backdropStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.6)",
    zIndex: 10000,
  };

  const sectionStyle = {
    marginBottom: "20px",
    padding: "15px",
    backgroundColor: "#f8f9fa",
    borderRadius: "8px",
    border: "1px solid #e9ecef",
  };

  const buttonStyle = {
    padding: "8px 16px",
    margin: "0 5px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    cursor: "pointer",
    backgroundColor: "#fff",
    transition: "all 0.2s ease",
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: "#007bff",
    color: "white",
    border: "1px solid #007bff",
  };

  return (
    <>
      <div style={backdropStyle} onClick={onCancel} />
      <div style={dialogStyle}>
        <h2
          style={{
            margin: "0 0 20px 0",
            textAlign: "center",
            color: "#1a2a3a",
          }}
        >
          🎧 Audio Settings & Testing
        </h2>

        {/* Permission Status */}
        <div style={sectionStyle}>
          <h3 style={{ margin: "0 0 10px 0", fontSize: "16px" }}>
            🔐 Microphone Permission
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {permissionStatus === "granted" && (
              <>
                <FaCheckCircle style={{ color: "#27ae60" }} />
                <span style={{ color: "#27ae60" }}>
                  Microphone access granted
                </span>
              </>
            )}
            {permissionStatus === "denied" && (
              <>
                <FaExclamationTriangle style={{ color: "#e74c3c" }} />
                <span style={{ color: "#e74c3c" }}>
                  Microphone access denied - please enable in browser settings
                </span>
              </>
            )}
            {permissionStatus === "prompt" && (
              <>
                <span style={{ color: "#f39c12" }}>⚠️</span>
                <span style={{ color: "#f39c12" }}>
                  Permission required - click "Test Microphone" to grant access
                </span>
              </>
            )}
          </div>
        </div>

        {/* Device Selection */}
        <div style={sectionStyle}>
          <h3 style={{ margin: "0 0 15px 0", fontSize: "16px" }}>
            🎤 Audio Devices
          </h3>

          <div style={{ marginBottom: "15px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontWeight: "500",
              }}
            >
              Microphone:
            </label>
            <select
              value={selectedInput}
              onChange={(e) => setSelectedInput(e.target.value)}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ddd",
              }}
            >
              <option value="">Default</option>
              {audioDevices.inputs.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label ||
                    `Microphone ${device.deviceId.slice(0, 8)}...`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontWeight: "500",
              }}
            >
              Speaker/Headphones:
            </label>
            <select
              value={selectedOutput}
              onChange={(e) => setSelectedOutput(e.target.value)}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ddd",
              }}
            >
              <option value="">Default</option>
              {audioDevices.outputs.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Speaker ${device.deviceId.slice(0, 8)}...`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Microphone Test */}
        <div style={sectionStyle}>
          <h3
            style={{
              margin: "0 0 15px 0",
              fontSize: "16px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            🎤 Microphone Test {getStatusIcon("microphone")}
          </h3>

          <div style={{ marginBottom: "15px" }}>
            <div
              style={{
                width: "100%",
                height: "20px",
                backgroundColor: "#e9ecef",
                borderRadius: "10px",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div
                style={{
                  width: `${microphoneLevel}%`,
                  height: "100%",
                  backgroundColor:
                    microphoneLevel > 70
                      ? "#e74c3c"
                      : microphoneLevel > 30
                      ? "#f39c12"
                      : "#27ae60",
                  transition: "width 0.1s ease",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  fontSize: "12px",
                  fontWeight: "bold",
                  color: microphoneLevel > 50 ? "white" : "black",
                }}
              >
                {Math.round(microphoneLevel)}%
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            {!isMicTesting ? (
              <button
                onClick={startMicrophoneTest}
                style={{
                  ...primaryButtonStyle,
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <FaMicrophone /> Test Microphone
              </button>
            ) : (
              <button
                onClick={stopMicrophoneTest}
                style={{
                  ...buttonStyle,
                  backgroundColor: "#dc3545",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <FaStop /> Stop Test
              </button>
            )}
          </div>
          <p
            style={{ fontSize: "12px", color: "#6c757d", margin: "10px 0 0 0" }}
          >
            Speak into your microphone. The level should move when you talk.
          </p>
        </div>

        {/* Speaker Test */}
        <div style={sectionStyle}>
          <h3
            style={{
              margin: "0 0 15px 0",
              fontSize: "16px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            🔊 Speaker Test {getStatusIcon("speaker")}
          </h3>

          <div style={{ marginBottom: "15px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontWeight: "500",
              }}
            >
              Volume: {outputVolume}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={outputVolume}
              onChange={(e) => setOutputVolume(parseInt(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            {!isPlayingTestSound ? (
              <button
                onClick={playTestSound}
                style={{
                  ...primaryButtonStyle,
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <FaPlay /> Play Test Sound
              </button>
            ) : (
              <button
                onClick={stopTestSound}
                style={{
                  ...buttonStyle,
                  backgroundColor: "#dc3545",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <FaStop /> Stop Sound
              </button>
            )}
          </div>
          <p
            style={{ fontSize: "12px", color: "#6c757d", margin: "10px 0 0 0" }}
          >
            You should hear a 440 Hz tone for 2 seconds.
          </p>
        </div>

        {/* Troubleshooting */}
        <div style={sectionStyle}>
          <h3 style={{ margin: "0 0 10px 0", fontSize: "16px" }}>
            🔧 Troubleshooting
          </h3>
          <ul
            style={{
              fontSize: "13px",
              color: "#6c757d",
              lineHeight: "1.5",
              margin: "0",
              paddingLeft: "20px",
            }}
          >
            <li>
              If no devices appear, try refreshing the page and granting
              microphone permission
            </li>
            <li>For better call quality, use a headset to avoid echo</li>
            <li>
              Ensure your microphone level is between 30-70% when speaking
              normally
            </li>
            <li>
              If you can't hear anything, check your system volume and speaker
              settings
            </li>
            <li>
              Chrome may block autoplay - click in the page if audio doesn't
              work
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
            marginTop: "20px",
          }}
        >
          <button onClick={onCancel} style={buttonStyle}>
            Cancel
          </button>
          <button onClick={handleSave} style={primaryButtonStyle}>
            Save Settings
          </button>
        </div>
      </div>
    </>
  );
};

export default SettingsDialog;
