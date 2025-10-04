import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  DialogTitle,
  FormControlLabel,
  TextField,
  Button,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormHelperText,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import appConfigFields from "./appConfigFields.js";
import { useSelector, useDispatch } from "react-redux";
import { fetchSoundFiles } from "../../features/audio/audioSlice";

// Base path for audio files
const AUDIO_FILES_PATH = "/var/opt/mayday/sounds/";

const AppEditDialog = ({
  app,
  open,
  onSave,
  onClose,
  ivrFlows,
  ivrLoading,
}) => {
  const dispatch = useDispatch();
  const [appData, setAppData] = useState({});
  const [errors, setErrors] = useState({});
  // Add a specific state for audioFile selection
  const [selectedAudioFile, setSelectedAudioFile] = useState("");

  // Get both agents and queues from Redux store
  const { agents = [], loading: agentsLoading } = useSelector(
    (state) => state.agents || { agents: [], loading: false }
  );
  const { voiceQueues = [], loading: queuesLoading } = useSelector(
    (state) => state.voiceQueue || { voiceQueues: [], loading: false }
  );
  const { files: audioFiles = [], loading: audioLoading } = useSelector(
    (state) => state.audio || { files: [], loading: false }
  );

  // Helper function to remove file extension
  const removeFileExtension = (filename) => {
    if (!filename) return "";
    return filename.replace(/\.[^/.]+$/, "");
  };

  // Fetch audio files when dialog opens for Playback type
  useEffect(() => {
    if (open && app && app.type === "Playback") {
      dispatch(fetchSoundFiles());
    }
  }, [open, app, dispatch]);

  // Prepare queue options for the dropdown with null check
  const queueOptions = useMemo(() => {
    if (!Array.isArray(voiceQueues) || queuesLoading) return [];
    return voiceQueues.map((queue) => ({
      value: queue.id.toString(),
      label: `${queue.name} (${queue.id})`,
      name: queue.name,
    }));
  }, [voiceQueues, queuesLoading]);

  // Add audio file options
  const audioFileOptions = useMemo(() => {
    if (!Array.isArray(audioFiles) || audioLoading) return [];
    return audioFiles.map((file) => {
      const duration = file.duration
        ? `${Math.floor(file.duration / 60)}:${(file.duration % 60)
            .toString()
            .padStart(2, "0")}`
        : "Unknown";
      const format = file.format ? file.format.toUpperCase() : "";

      // Extract just the filename without any path
      const filename =
        file.filename ||
        (file.asteriskPath && file.asteriskPath.includes("/")
          ? file.asteriskPath.split("/").pop()
          : file.asteriskPath.replace(/^custom\//, ""));

      // Remove the file extension for the value (used for saving)
      const filenameWithoutExtension = removeFileExtension(filename);

      return {
        value: filenameWithoutExtension,
        fullPath: `${AUDIO_FILES_PATH}${filenameWithoutExtension}`,
        label: `${file.description} (${format} - ${duration})`,
        name: file.description,
        originalFilename: filename, // Keep original for display purposes
      };
    });
  }, [audioFiles, audioLoading]);

  // Add to the existing useMemo for options
  const ivrOptions = useMemo(() => {
    if (!Array.isArray(ivrFlows) || ivrLoading) return [];
    return ivrFlows.map((flow) => ({
      value: flow.id,
      label: flow.name,
      name: flow.name,
    }));
  }, [ivrFlows, ivrLoading]);

  // Initialize form data when app changes or when options load
  useEffect(() => {
    if (open && app) {
      const fields = appConfigFields[app.type] || [];
      // Split appdata by comma if it exists, otherwise use empty array
      let values = [];
      if (app.appdata) {
        // Special handling for Queue application
        if (app.type === "Queue") {
          // Parse Queue appdata: queue_name,options,url,announceOverrides,timeout,agi,macro,goSub,rule,position
          values = app.appdata.split(",");

          // Find the queue ID that corresponds to the queue name
          const queueName = values[0] || "";
          const selectedQueue = queueOptions.find((q) => q.name === queueName);
          const queueId = selectedQueue ? selectedQueue.value : queueName;

          const initialData = {
            queue: queueId, // Store the ID for the dropdown
            billingMode: values[1] || "tT",
            url: values[2] || "",
            announceOverrides: values[3] || "",
            timeout: values[4] || 30,
            agi: values[5] || "",
            macro: values[6] || "",
            goSub: values[7] || "",
            rule: values[8] || "",
            position: values[9] === "true",
            preserveCallerId: true, // Default to true for new configurations
          };
          setAppData(initialData);
          return;
        }

        // Special handling for Set application
        if (app.type === "Set") {
          // console.log("Parsing Set application data:", app.appdata);
          // Parse Set appdata: variable=value (handle multiple = signs)
          const firstEqualsIndex = app.appdata.indexOf("=");
          if (firstEqualsIndex !== -1) {
            const variable = app.appdata.substring(0, firstEqualsIndex);
            const value = app.appdata.substring(firstEqualsIndex + 1);

            // console.log(
            //   "Parsed Set data - Variable:",
            //   variable,
            //   "Value:",
            //   value
            // );

            const initialData = {
              variable: variable || "CALLERID(num)",
              value: value || "\\${CALLERID(num)}",
              preserveOriginal: true,
            };
            // console.log("Set initial data:", initialData);
            setAppData(initialData);
          } else {
            // Fallback if no = sign found
            const initialData = {
              variable: "CALLERID(num)",
              value: "\\${CALLERID(num)}",
              preserveOriginal: true,
            };
            console.log("Set fallback data:", initialData);
            setAppData(initialData);
          }
          return;
        }

        // Special handling for NoOp application
        if (app.type === "NoOp") {
          console.log("Parsing NoOp application data:", app.appdata);
          // Parse NoOp appdata: label
          const initialData = {
            label:
              app.appdata || "Inbound Call from \\${CALLERID(num)} to \\${EXTEN}",
            logCallerInfo: true,
            logVariables: false,
          };
          console.log("NoOp initial data:", initialData);
          setAppData(initialData);
          return;
        }

        // For Playback app, check if the appdata is just a file path
        if (
          app.type === "Playback" &&
          (app.appdata.startsWith("/") ||
            app.appdata.startsWith(AUDIO_FILES_PATH))
        ) {
          // If it's an absolute path, extract just the audio file path and set other fields to defaults
          values = fields.map((field) => field.defaultValue || "");

          // Extract the audio file name from the full path
          let audioFilePath = app.appdata;
          if (audioFilePath.includes("/")) {
            audioFilePath = audioFilePath.split("/").pop();
          }

          // Remove the file extension
          audioFilePath = removeFileExtension(audioFilePath);

          // Set the audio file
          setSelectedAudioFile(audioFilePath);
        } else {
          // Normal comma-separated values for other apps or older Playback entries
          values = app.appdata.split(",");

          // For Playback, if values exist, extract the audio file
          if (app.type === "Playback") {
            const audioIndex = fields.findIndex((f) => f.name === "audioFiles");
            if (audioIndex >= 0 && values.length > audioIndex) {
              let audioFilePath = values[audioIndex];

              // If it's a full path, extract just the filename
              if (audioFilePath.includes("/")) {
                audioFilePath = audioFilePath.split("/").pop();
              } else if (audioFilePath.includes("\\")) {
                audioFilePath = audioFilePath.split("\\").pop();
              }

              // Remove any 'custom/' prefix if present
              audioFilePath = audioFilePath.replace(/^custom\//, "");

              // Remove file extension for Asterisk
              audioFilePath = removeFileExtension(audioFilePath);

              setSelectedAudioFile(audioFilePath);
            }
          }
        }
      }

      // console.log("App type:", app.type, "Fields:", fields);
      // console.log("App data values:", values);
      // console.log("App data original:", app.appdata);
      // console.log("App interval:", app.interval);

      const initialData = fields.reduce((acc, field, index) => {
        const fieldValue =
          values.length > index ? values[index] : field.defaultValue;

        if (field.type === "checkbox") {
          acc[field.name] = fieldValue === "true" ? true : !!field.defaultValue;
        } else if (field.type === "select") {
          // Skip audioFiles as it's handled separately
          if (field.name !== "audioFiles") {
            let options = field.options;
            if (field.name === "internalExtension") {
              options = Array.isArray(agents)
                ? agents.map((agent) => ({
                    value: agent.extension,
                    label: `${agent.username} (${agent.extension})`,
                    name: agent.username,
                  }))
                : [];
            } else if (field.name === "queue") {
              options = queueOptions;
            } else if (field.name === "flowId") {
              options = ivrOptions;
            } else if (field.name === "hangupCause") {
              // options = field.options;
            }

            acc[field.name] = fieldValue || "";
          }
        } else {
          acc[field.name] = fieldValue;
        }
        return acc;
      }, {});

      // For Playback, ensure context and extension are correctly set
      if (app.type === "Playback") {
        initialData.context =
          initialData.context || app.context || "from-voip-provider";
        initialData.extension = initialData.extension || app.extension || "";
      }

      // console.log("Initial data:", initialData);
      setAppData(initialData);
    }
  }, [app, open, agents, queueOptions, ivrOptions, audioFiles]);

  //Error for form field validation
  const validateFields = () => {
    const newErrors = {};
    let isValid = true;

    appConfigFields[app.type].forEach((field) => {
      // Special handling for audioFiles
      if (field.name === "audioFiles") {
        if (field.required && !selectedAudioFile) {
          newErrors[field.name] = "This field is required";
          isValid = false;
        }
      } else if (
        field.required &&
        (appData[field.name] === "" || appData[field.name] == null)
      ) {
        newErrors[field.name] = "This field is required";
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  // Onblur error validation
  const validateField = (name, value) => {
    if (
      appConfigFields[app.type].some(
        (field) => field.name === name && field.required
      )
    ) {
      return value !== "" && value != null; // returns true if the field is not empty
    }
    return true;
  };

  const handleBlur = (event) => {
    const { name, value } = event.target;
    const isValid = validateField(name, value);

    // If the field is not valid, set an error message, otherwise ensure no error message exists
    setErrors((prevErrors) => ({
      ...prevErrors,
      [name]: isValid ? undefined : "This field is required",
    }));
  };

  // Special handler for audio file selection
  const handleAudioFileChange = (event) => {
    const value = event.target.value;
    setSelectedAudioFile(value);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    // Check if this field is defined as a select type in appConfigFields
    const field = appConfigFields[app.type]?.find((f) => f.name === name);

    if (field?.type === "checkbox") {
      setAppData((prevData) => ({
        ...prevData,
        [name]: event.target.checked,
      }));
    } else {
      setAppData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    }
  };

  const handleSave = () => {
    if (!validateFields()) {
      return;
    }

    // For Playback application, we need special handling
    if (app.type === "Playback") {
      // For Playback app, use the full absolute path to the audio file WITHOUT extension
      const fullAudioPath = `${AUDIO_FILES_PATH}${selectedAudioFile}`;
      console.log("Saving audio file path (without extension):", fullAudioPath);

      // Save the app data with interval information if available
      const savedApp = {
        ...app,
        appdata: fullAudioPath,
        context: appData.context || app.context || "from-voip-provider",
        extension: appData.extension || app.extension || "",
      };

      onSave(app.id, fullAudioPath, savedApp);
      onClose();
      return;
    }

    // For other application types, continue with normal processing
    const fieldsOrder = appConfigFields[app.type];

    // Special handling for Queue application
    if (app.type === "Queue") {
      // Convert queue ID to queue name
      const selectedQueue = queueOptions.find((q) => q.value === appData.queue);
      const queueName = selectedQueue ? selectedQueue.name : appData.queue;
      const billingMode = appData.billingMode || "tT";
      const timeout = appData.timeout || 30;

      // Build Queue appdata string: queue_name,options,url,announceOverrides,timeout,agi,macro,goSub,rule,position
      const queueAppData = [
        queueName,
        billingMode,
        appData.url || "",
        appData.announceOverrides || "",
        timeout,
        appData.agi || "",
        appData.macro || "",
        appData.goSub || "",
        appData.rule || "",
        appData.position ? "true" : "false",
      ].join(",");

      onSave(app.id, queueAppData);
      onClose();
      return;
    }

    // Special handling for Set application
    if (app.type === "Set") {
      const variable = appData.variable;
      const value = appData.value;
      // const preserveOriginal = appData.preserveOriginal !== false;

      // Build Set appdata string: variable=value
      const setAppData = `${variable}=${value}`;

      onSave(app.id, setAppData);
      onClose();
      return;
    }

    // Special handling for NoOp application
    if (app.type === "NoOp") {
      const label = appData.label;
      // const logCallerInfo = appData.logCallerInfo !== false;
      // const logVariables = appData.logVariables;

      // Build NoOp appdata string: label
      const noOpAppData = label;

      onSave(app.id, noOpAppData);
      onClose();
      return;
    }

    const appDataValues = fieldsOrder.map((field) => {
      // Special handling for audioFiles
      if (field.name === "audioFiles") {
        return selectedAudioFile;
      }

      const fieldValue = appData[field.name];

      if (field.type === "select") {
        // Ensure queue selection saves both ID and Name
        if (field.name === "queue") {
          const selectedQueue = queueOptions.find(
            (q) => q.value === fieldValue
          );
          return selectedQueue ? `${selectedQueue.name}` : "";
        }
        return fieldValue;
      } else if (field.type === "checkbox") {
        return fieldValue ? "true" : "false";
      } else {
        return fieldValue || "";
      }
    });

    const appDataString = appDataValues.join(",");
    onSave(app.id, appDataString);
    onClose();
  };

  const renderFormFields = () => {
    return (appConfigFields[app.type] || []).map((field) => {
      const fieldError = errors[field.name];

      // Special handling for audioFiles select
      if (field.name === "audioFiles") {
        // Find the matching option for the currently selected file
        const selectedOption = audioFileOptions.find(
          (option) => option.value === selectedAudioFile
        );

        return (
          <FormControl
            fullWidth
            key={field.name}
            margin="dense"
            variant="standard"
            error={Boolean(fieldError)}
          >
            <InputLabel id={`${field.name}-label`}>{field.label}</InputLabel>
            <Select
              labelId={`${field.name}-label`}
              id={field.name}
              name={field.name}
              value={selectedAudioFile}
              onChange={handleAudioFileChange}
              label={field.label}
            >
              {audioLoading ? (
                <MenuItem value="">Loading audio files...</MenuItem>
              ) : audioFileOptions.length === 0 ? (
                <MenuItem value="">No audio files available</MenuItem>
              ) : (
                audioFileOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))
              )}
            </Select>
            {fieldError && <FormHelperText error>{fieldError}</FormHelperText>}
            <FormHelperText>
              Audio file will be accessed from: {AUDIO_FILES_PATH} (without file
              extension)
              {selectedOption && (
                <div style={{ marginTop: "4px" }}>
                  <strong>Actual path:</strong> {AUDIO_FILES_PATH}
                  {selectedAudioFile}
                </div>
              )}
            </FormHelperText>
          </FormControl>
        );
      }

      if (field.type === "select") {
        let options = field.options;
        if (field.name === "internalExtension") {
          options =
            agents?.map((agent) => ({
              value: agent.extension,
              label: `${agent.username} (${agent.extension})`,
              name: agent.username,
            })) || [];
        } else if (field.name === "queue") {
          options = queueOptions;
        } else if (field.name === "flowId") {
          options = ivrOptions;
        } else if (field.name === "hangupCause") {
          options = field.options;
        }

        return (
          <FormControl
            fullWidth
            key={field.name}
            margin="dense"
            variant="standard"
            error={Boolean(fieldError)}
          >
            <InputLabel id={`${field.name}-label`}>{field.label}</InputLabel>
            <Select
              labelId={`${field.name}-label`}
              id={field.name}
              name={field.name}
              value={appData[field.name] || ""}
              onChange={handleChange}
              label={field.label}
            >
              {field.name === "internalExtension" ? (
                agentsLoading ? (
                  <MenuItem value="">Loading agents...</MenuItem>
                ) : options.length === 0 ? (
                  <MenuItem value="">No agents available</MenuItem>
                ) : (
                  options.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))
                )
              ) : field.name === "queue" ? (
                queuesLoading ? (
                  <MenuItem value="">Loading queues...</MenuItem>
                ) : options.length === 0 ? (
                  <MenuItem value="">No queues available</MenuItem>
                ) : (
                  options.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))
                )
              ) : field.name === "flowId" ? (
                ivrLoading ? (
                  <MenuItem value="">Loading IVR flows...</MenuItem>
                ) : options.length === 0 ? (
                  <MenuItem value="">No IVR flows available</MenuItem>
                ) : (
                  options.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))
                )
              ) : (
                options.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))
              )}
            </Select>
            {fieldError && <FormHelperText error>{fieldError}</FormHelperText>}
          </FormControl>
        );
      } else if (field.type === "checkbox") {
        return (
          <FormControl
            key={field.name}
            fullWidth
            margin="dense"
            variant="standard"
          >
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(appData[field.name])}
                  onChange={handleChange}
                  name={field.name}
                />
              }
              label={field.label}
              style={{ marginLeft: 0 }}
            />
            {field.helperText && (
              <FormHelperText style={{ marginLeft: "14px" }}>
                {field.helperText}
              </FormHelperText>
            )}
          </FormControl>
        );
      } else {
        // TextFields and other inputs
        return (
          <TextField
            key={field.name}
            name={field.name}
            label={field.label}
            type={field.type}
            fullWidth
            margin="dense"
            variant="standard"
            value={appData[field.name] || ""}
            onChange={handleChange}
            onBlur={handleBlur}
            error={Boolean(fieldError)}
            helperText={fieldError || field.helperText}
            FormHelperTextProps={{
              style: { fontSize: "9px" },
            }}
            required={field.required}
          />
        );
      }
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle style={{ backgroundColor: "#2C5FC4", color: "white" }}>
        Edit {app.name}
        <IconButton
          aria-label="close"
          onClick={onClose}
          style={{
            position: "absolute",
            right: 8,
            top: 8,
            color: "white",
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent
        style={{ display: "flex", flexDirection: "column", gap: "8px" }}
      >
        {renderFormFields()}
      </DialogContent>
      <DialogActions>
        {/* <Button onClick={onClose}>Cancel</Button> */}
        <Button onClick={handleSave}>Save</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AppEditDialog;
