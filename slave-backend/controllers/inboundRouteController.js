import VoiceExtension from "../models/voiceExtensionModel.js";
import sequelize from "../config/sequelize.js";
// import amiService from "../services/amiService.js";
import InboundRoute from "../models/inboundRouteModel.js";
// import { fastAGIService } from "../services/fastAGIService.js";

const RECORDING_BASE_DIR =
  process.env.RECORDING_BASE_DIR || "/var/spool/asterisk/monitor";

export const createInboundRoute = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      phone_number,
      context,
      alias,
      description,
      applications = [],
    } = req.body;

    // Create the inbound route record (we'll keep this for now during migration)
    const inboundRoute = await InboundRoute.create(
      {
        phone_number,
        type: "inbound",
        pattern: phone_number,
        context,
        destination: "default-extension",
        alias,
        description,
      },
      { transaction }
    );

    // Create voice extensions for each application
    if (applications.length > 0) {
      await Promise.all(
        applications.map(async (app, index) => {
          // Process interval data from the app (similar to updateInboundRoute)
          let intervalId = null;
          let intervalObj = null;

          // First check if interval is directly in the app object
          if (app.interval && app.interval.id) {
            intervalId = app.interval.id;
            intervalObj = app.interval;
            console.log(
              `App ${app.type} has interval ${intervalId} directly in object (create)`
            );
          }
          // Then check if it's in the settings object
          else if (app.settings?.interval) {
            intervalId = app.settings.interval;
            console.log(
              `App ${app.type} has interval ${intervalId} in settings.interval (create)`
            );
          }
          // Check if options contains an interval ID
          else if (
            app.settings?.options &&
            app.settings.options !== "*,*,*,*" &&
            !app.settings.options.includes(",")
          ) {
            intervalId = app.settings.options;
            console.log(
              `App ${app.type} has interval ${intervalId} in settings.options (create)`
            );
          }

          // If we have an interval ID but not the full object, fetch it from the database
          if (intervalId && !intervalObj) {
            try {
              intervalObj = await sequelize.models.interval.findByPk(
                intervalId
              );
              if (intervalObj) {
                console.log(
                  `Found interval "${intervalObj.name}" (${intervalId}) in database (create)`
                );
              } else {
                console.log(
                  `Interval ${intervalId} not found in database (create)`
                );
              }
            } catch (error) {
              console.error(
                `Error fetching interval with ID ${intervalId} (create):`,
                error
              );
            }
          }

          const basePriority = index * 10 + 1;
          let currentPriority = basePriority;

          if (intervalObj) {
            try {
              // Parse interval data (copied and adapted from updateInboundRoute)
              let timeRange = intervalObj.timeRange;
              if (typeof timeRange === "string") {
                try {
                  timeRange = JSON.parse(timeRange);
                } catch (e) {
                  console.error(
                    `Error parsing timeRange from interval "${intervalObj.name}" (create):`,
                    e
                  );
                  timeRange = { from: "00:00", to: "23:59" };
                }
              }

              let weekDays = intervalObj.weekDays;
              if (typeof weekDays === "string") {
                try {
                  weekDays = JSON.parse(weekDays);
                } catch (e) {
                  console.error(`Error parsing weekDays (create):`, e);
                  weekDays = [];
                }
              }

              let months = intervalObj.months;
              if (typeof months === "string") {
                try {
                  months = JSON.parse(months);
                } catch (e) {
                  console.error(`Error parsing months (create):`, e);
                  months = [];
                }
              }

              let monthDays = intervalObj.monthDays;
              if (typeof monthDays === "string") {
                try {
                  monthDays = JSON.parse(monthDays);
                } catch (e) {
                  console.error(`Error parsing monthDays (create):`, e);
                  monthDays = [];
                }
              }

              const timeStr = `${timeRange.from}-${timeRange.to}`;
              const dayNames = [
                "sun",
                "mon",
                "tue",
                "wed",
                "thu",
                "fri",
                "sat",
              ];
              let daysStr = "*";
              if (Array.isArray(weekDays) && weekDays.length > 0) {
                const sortedDayIndices = weekDays
                  .map((d) => parseInt(d, 10))
                  .filter((d) => !isNaN(d) && d >= 0 && d <= 6)
                  .sort((a, b) => a - b);
                const isContinuousRange = sortedDayIndices.every(
                  (day, idx, arr) => idx === 0 || day === arr[idx - 1] + 1
                );
                if (isContinuousRange && sortedDayIndices.length > 1) {
                  daysStr = `${dayNames[sortedDayIndices[0]]}-${
                    dayNames[sortedDayIndices[sortedDayIndices.length - 1]]
                  }`;
                } else {
                  daysStr = sortedDayIndices
                    .map((day) => dayNames[day])
                    .join("&");
                }
              }

              const monthNames = [
                "jan",
                "feb",
                "mar",
                "apr",
                "may",
                "jun",
                "jul",
                "aug",
                "sep",
                "oct",
                "nov",
                "dec",
              ];
              let monthsStr = "*";
              if (Array.isArray(months) && months.length > 0) {
                const sortedMonthIndices = months
                  .map((m) => parseInt(m, 10))
                  .filter((m) => !isNaN(m) && m >= 0 && m <= 11)
                  .sort((a, b) => a - b);
                const isContinuousRange = sortedMonthIndices.every(
                  (month, idx, arr) => idx === 0 || month === arr[idx - 1] + 1
                );
                if (isContinuousRange && sortedMonthIndices.length > 1) {
                  monthsStr = `${monthNames[sortedMonthIndices[0]]}-${
                    monthNames[
                      sortedMonthIndices[sortedMonthIndices.length - 1]
                    ]
                  }`;
                } else {
                  monthsStr = sortedMonthIndices
                    .map((month) => monthNames[month])
                    .join(",");
                }
              }

              let datesStr = "*";
              if (Array.isArray(monthDays) && monthDays.length > 0) {
                const sortedDateIndices = monthDays
                  .map((d) => parseInt(d, 10))
                  .filter((d) => !isNaN(d) && d >= 1 && d <= 31)
                  .sort((a, b) => a - b);
                const isContinuousRange = sortedDateIndices.every(
                  (date, idx, arr) => idx === 0 || date === arr[idx - 1] + 1
                );
                if (isContinuousRange && sortedDateIndices.length > 1) {
                  datesStr = `${sortedDateIndices[0]}-${
                    sortedDateIndices[sortedDateIndices.length - 1]
                  }`;
                } else {
                  datesStr = sortedDateIndices.join(",");
                }
              }

              console.log(
                `Time condition for ${app.type} with interval "${intervalObj.name}" (create):`,
                { timeStr, daysStr, monthsStr, datesStr }
              );

              const nextAppBasePriority = (index + 1) * 10 + 1;
              const appExecutionEntryPointPriority = currentPriority + 1; // Where execution jumps if time condition is true

              // Create GotoIfTime
              await VoiceExtension.create(
                {
                  context: context, // from req.body
                  extension: phone_number, // from req.body
                  priority: currentPriority++,
                  app: "GotoIfTime",
                  appdata: `${timeStr},${daysStr},${monthsStr},${datesStr}?${context},${phone_number},${appExecutionEntryPointPriority}:${context},${phone_number},${nextAppBasePriority}`,
                  type: "inbound",
                  description: `Time condition for ${app.type}`,
                  isApp: false,
                  intervalId: intervalId,
                  interval: intervalId, // Keep both for now, consistent with update
                },
                { transaction }
              );

              currentPriority = appExecutionEntryPointPriority; // Align currentPriority for app steps

              // Special case for Queue (MixMonitor, etc.)
              if (app.type === "Queue") {
                let queueName = "unknown";
                if (app.appdata && app.appdata.length > 0) {
                  const appDataParts = app.appdata.split(",");
                  if (appDataParts.length > 0) queueName = appDataParts[0];
                }
                const recordingDir = `${RECORDING_BASE_DIR}/\${STRFTIME(\${EPOCH},,%Y)}/\${STRFTIME(\${EPOCH},,%m)}/\${STRFTIME(\${EPOCH},,%d)}`;
                const recordingFilename = `queue-${queueName}-\${UNIQUEID}.wav`;
                const recordingPath = `${recordingDir}/${recordingFilename}`;

                await VoiceExtension.create(
                  {
                    context,
                    extension: phone_number,
                    priority: currentPriority++,
                    app: "System",
                    appdata: `mkdir -p "${recordingDir}"`,
                    type: "inbound",
                    description: `Create recording directory for Queue ${queueName}`,
                    isApp: false,
                    intervalId,
                    interval: intervalId,
                  },
                  { transaction }
                );
                // Only answer the call if using 'rn' mode (ring and answer)
                // For 'tT' mode (transfer), don't answer to prevent premature billing
                const queueOptions = app.appdata.split(",")[1] || "tT";
                if (queueOptions.includes("r")) {
                  await VoiceExtension.create(
                    {
                      context,
                      extension: phone_number,
                      priority: currentPriority++,
                      app: "Answer",
                      type: "inbound",
                      description: `Answer call for Queue ${queueName} (rn mode)`,
                      isApp: false,
                      intervalId,
                      interval: intervalId,
                      answer: true,
                    },
                    { transaction }
                  );
                }
                await VoiceExtension.create(
                  {
                    context,
                    extension: phone_number,
                    priority: currentPriority++,
                    app: "MixMonitor",
                    appdata: `${recordingPath},bW(0)v(2),r(CALL_RECORDING_AUDIO_FORMAT=wav,CALL_RECORDING_QUALITY=wav49)`,
                    type: "inbound",
                    description: `Recording for Queue ${queueName}`,
                    isApp: false,
                    intervalId,
                    interval: intervalId,
                  },
                  { transaction }
                );
                await VoiceExtension.create(
                  {
                    context,
                    extension: phone_number,
                    priority: currentPriority++,
                    app: "Set",
                    appdata: `CDR(recordingfile)=${recordingPath}`,
                    type: "inbound",
                    description: `Set recording filename for Queue ${queueName}`,
                    isApp: false,
                    intervalId,
                    interval: intervalId,
                  },
                  { transaction }
                );
              }

              // Create the actual application
              await VoiceExtension.create(
                {
                  context: context,
                  extension: phone_number,
                  priority: currentPriority++,
                  app: app.type,
                  appdata: formatAppData(app),
                  type: "inbound",
                  description: `${alias || phone_number} - ${app.type}`,
                  isApp: true,
                  appType: app.type,
                  answer: shouldAnswerCall(app.type),
                  intervalId: intervalId,
                  interval: intervalId,
                },
                { transaction }
              );

              // After application runs, jump to the next application's base priority
              await VoiceExtension.create(
                {
                  context: context,
                  extension: phone_number,
                  priority: currentPriority++,
                  app: "Goto",
                  appdata: `${context},${phone_number},${nextAppBasePriority}`,
                  type: "inbound",
                  description: `Jump to next app after ${app.type}`,
                  isApp: false,
                  intervalId: intervalId, // Keep intervalId for consistency, though not strictly needed for Goto
                  interval: intervalId,
                },
                { transaction }
              );
            } catch (error) {
              console.error(
                `Error creating conditional dialplan for app ${app.type} (create):`,
                error
              );
              // Fallback logic
              currentPriority = basePriority; // Reset priority for fallback

              if (app.type === "Queue") {
                // Fallback Queue recording logic
                let queueName = "unknown";
                if (app.appdata && app.appdata.length > 0) {
                  const appDataParts = app.appdata.split(",");
                  if (appDataParts.length > 0) queueName = appDataParts[0];
                }
                const recordingDir = `${RECORDING_BASE_DIR}/\${STRFTIME(\${EPOCH},,%Y)}/\${STRFTIME(\${EPOCH},,%m)}/\${STRFTIME(\${EPOCH},,%d)}`;
                const recordingFilename = `queue-${queueName}-\${UNIQUEID}.wav`;
                const recordingPath = `${recordingDir}/${recordingFilename}`;
                await VoiceExtension.create(
                  {
                    context,
                    extension: phone_number,
                    priority: currentPriority++,
                    app: "System",
                    appdata: `mkdir -p "${recordingDir}"`,
                    type: "inbound",
                    description: `Create recording directory for Queue ${queueName} (fallback)`,
                    isApp: false,
                    intervalId,
                    interval: intervalId,
                  },
                  { transaction }
                );
                // Only answer the call if using 'rn' mode (ring and answer)
                // For 'tT' mode (transfer), don't answer to prevent premature billing
                const queueOptions = app.appdata.split(",")[1] || "tT";
                if (queueOptions.includes("r")) {
                  await VoiceExtension.create(
                    {
                      context,
                      extension: phone_number,
                      priority: currentPriority++,
                      app: "Answer",
                      type: "inbound",
                      description: `Answer call for Queue ${queueName} (fallback, rn mode)`,
                      isApp: false,
                      intervalId,
                      interval: intervalId,
                      answer: true,
                    },
                    { transaction }
                  );
                }
                await VoiceExtension.create(
                  {
                    context,
                    extension: phone_number,
                    priority: currentPriority++,
                    app: "MixMonitor",
                    appdata: `${recordingPath},bW(0)v(2),r(CALL_RECORDING_AUDIO_FORMAT=wav,CALL_RECORDING_QUALITY=wav49)`,
                    type: "inbound",
                    description: `Recording for Queue ${queueName} (fallback)`,
                    isApp: false,
                    intervalId,
                    interval: intervalId,
                  },
                  { transaction }
                );
                await VoiceExtension.create(
                  {
                    context,
                    extension: phone_number,
                    priority: currentPriority++,
                    app: "Set",
                    appdata: `CDR(recordingfile)=${recordingPath}`,
                    type: "inbound",
                    description: `Set recording filename for Queue ${queueName} (fallback)`,
                    isApp: false,
                    intervalId,
                    interval: intervalId,
                  },
                  { transaction }
                );
              }

              await VoiceExtension.create(
                // Fallback application
                {
                  context: context,
                  extension: phone_number,
                  priority: currentPriority++,
                  app: app.type,
                  appdata: formatAppData(app),
                  type: "inbound",
                  description: `${alias || phone_number} - ${
                    app.type
                  } (fallback)`,
                  isApp: true,
                  appType: app.type,
                  answer: shouldAnswerCall(app.type),
                  intervalId: intervalId,
                  interval: intervalId,
                },
                { transaction }
              );
            }
          } else {
            // No interval - Original logic from createInboundRoute
            // Special case for Queue - add MixMonitor for recording
            if (app.type === "Queue") {
              let queueName = "unknown";
              if (app.appdata && app.appdata.length > 0) {
                const appDataParts = app.appdata.split(",");
                if (appDataParts.length > 0) {
                  queueName = appDataParts[0];
                }
              }
              const recordingDir = `${RECORDING_BASE_DIR}/\${STRFTIME(\${EPOCH},,%Y)}/\${STRFTIME(\${EPOCH},,%m)}/\${STRFTIME(\${EPOCH},,%d)}`;
              const recordingFilename = `queue-${queueName}-\${UNIQUEID}.wav`;
              const recordingPath = `${recordingDir}/${recordingFilename}`;

              await VoiceExtension.create(
                {
                  context: context,
                  extension: phone_number,
                  priority: currentPriority++,
                  app: "System",
                  appdata: `mkdir -p "${recordingDir}"`,
                  type: "inbound",
                  description: `Create recording directory for Queue ${queueName}`,
                  isApp: false,
                  intervalId: intervalId, // Was null here, now passing for consistency
                  interval: intervalId,
                },
                { transaction }
              );
              // Only answer the call if using 'rn' mode (ring and answer)
              // For 'tT' mode (transfer), don't answer to prevent premature billing
              const queueOptions = app.appdata.split(",")[1] || "tT";
              if (queueOptions.includes("r")) {
                await VoiceExtension.create(
                  {
                    context: context,
                    extension: phone_number,
                    priority: currentPriority++,
                    app: "Answer",
                    type: "inbound",
                    description: `Answer call for Queue ${queueName} (rn mode)`,
                    isApp: false,
                    intervalId: intervalId,
                    interval: intervalId,
                    answer: true,
                  },
                  { transaction }
                );
              } else {
                // For 'tT' mode, add a ringing tone to the caller
                await VoiceExtension.create(
                  {
                    context: context,
                    extension: phone_number,
                    priority: currentPriority++,
                    app: "Playback",
                    appdata: "ringback",
                    type: "inbound",
                    description: `Play ringing tone for Queue ${queueName} (tT mode)`,
                    isApp: false,
                    intervalId: intervalId,
                    interval: intervalId,
                  },
                  { transaction }
                );
              }
              await VoiceExtension.create(
                {
                  context: context,
                  extension: phone_number,
                  priority: currentPriority++,
                  app: "MixMonitor",
                  appdata: `${recordingPath},bW(0)v(2),r(CALL_RECORDING_AUDIO_FORMAT=wav,CALL_RECORDING_QUALITY=wav49)`,
                  type: "inbound",
                  description: `Recording for Queue ${queueName}`,
                  isApp: false,
                  intervalId: intervalId,
                  interval: intervalId,
                },
                { transaction }
              );
              await VoiceExtension.create(
                {
                  context: context,
                  extension: phone_number,
                  priority: currentPriority++,
                  app: "Set",
                  appdata: `CDR(recordingfile)=${recordingPath}`,
                  type: "inbound",
                  description: `Set recording filename for Queue ${queueName}`,
                  isApp: false,
                  intervalId: intervalId,
                  interval: intervalId,
                },
                { transaction }
              );
              console.log(
                `Added MixMonitor recording for Queue ${queueName} with priority ${
                  currentPriority - 2 // Should be currentPriority - 4 if we consider all 4 created? Let's keep original logging.
                } (create)`
              );
            }

            // Create the actual application
            await VoiceExtension.create(
              {
                context: context,
                extension: phone_number,
                priority: currentPriority++,
                app: app.type,
                appdata: formatAppData(app), // Using formatAppData
                type: "inbound",
                description: `${alias || phone_number} - ${app.type}`,
                isApp: true,
                appType: app.type,
                answer: shouldAnswerCall(app.type),
                intervalId: intervalId,
                interval: intervalId,
              },
              { transaction }
            );
          }
        })
      );
    }

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: "Inbound route created successfully",
      route: inboundRoute,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error creating inbound route:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create inbound route",
    });
  }
};

// Helper function to format application data
const formatAppData = (app) => {
  switch (app.type) {
    case "InternalDial": {
      const { internalExtension, timeout, options } = app.settings || {};
      let dialString = `PJSIP/${internalExtension}`;
      if (timeout) dialString += `,${timeout}`;
      if (options) dialString += `,${options}`;
      return dialString;
    }
    case "IVR": {
      const { flowId } = app.settings || {};
      return flowId;
    }
    case "Playback": {
      const { audioFiles, options, priority, tag, answer, description } =
        app.settings || {};

      console.log("Playback settings received:", app.settings);

      // Create a structured appdata string
      const appdata = `custom/${audioFiles || ""},${
        options ? "skip" : "noskip"
      },${app.priority || priority || 1},${tag || ""},${answer || true},${
        description || "Playback Application"
      }`;

      return appdata;
    }

    case "Dial": {
      const [destination, timeout, options] = app.appdata.split(",");
      return {
        destination,
        timeout,
        options,
      };
    }
    case "Queue": {
      // Parse Queue appdata: queue_name,options,url,announceOverrides,timeout,agi,macro,goSub,rule,position
      const [
        queue,
        options,
        url,
        announceOverrides,
        timeout,
        agi,
        macro,
        goSub,
        rule,
        position,
      ] = app.appdata.split(",");
      return {
        queue,
        billingMode: options || "tT",
        url: url || "",
        announceOverrides: announceOverrides || "",
        timeout: timeout || 30,
        agi: agi || "",
        macro: macro || "",
        goSub: goSub || "",
        rule: rule || "",
        position: position === "true",
      };
    }
    case "Set": {
      // Parse Set appdata: variable=value
      const [variable, value] = app.appdata.split("=");
      return {
        variable: variable || "CALLERID(num)",
        value: value || "${CALLERID(num)}",
        preserveOriginal: true,
      };
    }
    case "SendDTMF": {
      const [digits, timeout, duration] = app.appdata.split(",");
      return {
        dtmfDigits: digits,
        timeoutBetweenTones: parseInt(timeout),
        toneDuration: parseInt(duration),
      };
    }
    case "Custom": {
      const [appName, ...args] = app.appdata.split(",");
      return {
        applicationName: appName,
        arguments: args?.join(","),
      };
    }
    default:
      return app.appdata || "";
  }
};

// Helper function to determine if call should be answered before application
const shouldAnswerCall = (appType) => {
  const autoAnswerApps = ["IVR", "Playback"];
  return autoAnswerApps.includes(appType);
};

//Add this function after formatAppData
const parseAppSettings = (extension) => {
  switch (extension.app) {
    case "InternalDial": {
      const [extension, timeout, options] = extension.appdata.split(",");
      return {
        internalExtension: extension?.replace("PJSIP/", ""),
        timeout,
        options,
        enableRecording: extension.record || false,
      };
    }
    case "IVR": {
      return {
        flowId: extension.appdata,
      };
    }
    case "Playback": {
      const [audioFile, options] = extension.appdata.split(",");
      return {
        audioFiles: audioFile?.replace("custom/", ""),
        options: options === "skip",
      };
    }
    case "Queue": {
      // Parse Queue appdata: queue_name,options,url,announceOverrides,timeout,agi,macro,goSub,rule,position
      const [
        queue,
        options,
        url,
        announceOverrides,
        timeout,
        agi,
        macro,
        goSub,
        rule,
        position,
      ] = extension.appdata.split(",");
      return {
        queue,
        billingMode: options || "tT",
        url: url || "",
        announceOverrides: announceOverrides || "",
        timeout: timeout || 30,
        agi: agi || "",
        macro: macro || "",
        goSub: goSub || "",
        rule: rule || "",
        position: position === "true",
        preserveCallerId: true, // Default to true for proper CDR tracking
      };
    }
    case "Set": {
      // Parse Set appdata: variable=value
      const [variable, value] = extension.appdata.split("=");
      return {
        variable: variable || "CALLERID(num)",
        value: value || "${CALLERID(num)}",
        preserveOriginal: true,
      };
    }
    case "Dial": {
      const [destination, timeout, options] = extension.appdata.split(",");
      return {
        destination,
        timeout,
        options,
      };
    }
    case "SendDTMF": {
      const [digits, timeout, duration] = extension.appdata.split(",");
      return {
        dtmfDigits: digits,
        timeoutBetweenTones: parseInt(timeout),
        toneDuration: parseInt(duration),
      };
    }
    case "Custom": {
      const [appName, ...args] = extension.appdata.split(",");
      return {
        applicationName: appName,
        arguments: args?.join(","),
      };
    }
    default:
      return extension.appdata ? { appdata: extension.appdata } : {};
  }
};

// Update the getApplications function to include interval data
export const getApplications = async (req, res) => {
  try {
    const { routeId } = req.params;
    const route = await InboundRoute.findByPk(routeId);

    if (!route) {
      return res.status(404).json({ message: "Route not found" });
    }

    // Include the Interval model in the findAll query
    const voiceExtensions = await VoiceExtension.findAll({
      where: {
        context: route.context,
        extension: route.phone_number,
        type: "inbound",
      },
      include: [
        {
          model: sequelize.models.interval,
          as: "intervalObj",
          required: false,
        },
      ],
      order: [["priority", "ASC"]],
    });

    const applications = voiceExtensions.map((ext) => {
      const settings = parseAppSettings(ext);

      // Add interval information if it exists
      if (ext.intervalObj) {
        settings.interval = ext.intervalId;
        settings.options = ext.intervalId || "*,*,*,*";
      }

      return {
        id: ext.id,
        type: ext.app,
        appdata: ext.appdata,
        settings: settings,
        interval: ext.intervalObj, // Include the full interval object
        intervalId: ext.intervalId,
      };
    });

    res.json(applications);
  } catch (error) {
    console.error("Failed to get applications:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.toString(),
    });
  }
};

// Get a single inbound route by ID with its applications
export const getOneInboundRoute = async (req, res) => {
  try {
    const { routeId } = req.params;
    const route = await InboundRoute.findByPk(routeId);

    if (!route) {
      return res.status(404).json({
        success: false,
        message: "Inbound route not found!",
      });
    }

    // Fetch applications from VoiceExtension with proper conditions
    const voiceExtensions = await VoiceExtension.findAll({
      where: {
        context: route.context,
        extension: route.phone_number,
        type: "inbound",
        isApp: true,
      },
      order: [["priority", "ASC"]],
    });

    // Map the extensions to application format
    const applications = voiceExtensions.map((ext) => ({
      id: ext.id,
      name: ext.description?.split(" - ")[1] || ext.app,
      type: ext.app,
      appdata: ext.appdata,
      priority: ext.priority,
      extension: ext.extension,
      settings: {
        ...parseAppSettings(ext),
        options: ext.interval || "*,*,*,*",
        enabled: true,
      },
    }));

    const responseData = {
      success: true,
      route: {
        ...route.toJSON(),
        phone_number: route.phone_number,
        context: route.context,
        alias: route.alias,
        description: route.description,
        applications: JSON.stringify(applications),
      },
    };

    res.status(200).json(responseData);
  } catch (error) {
    console.error("Error fetching inbound route:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch inbound route details",
    });
  }
};

// Get a list of all inbound routes with detailed application data
export const getInboundRoutes = async (req, res) => {
  try {
    const routes = await InboundRoute.findAll({
      order: [["createdAt", "DESC"]],
    });

    // Fetch applications for each route
    const routesWithApps = await Promise.all(
      routes.map(async (route) => {
        const voiceExtensions = await VoiceExtension.findAll({
          where: {
            context: route.context,
            extension: route.phone_number,
            type: "inbound",
          },
          order: [["priority", "ASC"]],
        });

        const applications = voiceExtensions.map((ext) => ({
          id: ext.id,
          type: ext.app,
          appdata: ext.appdata,
          priority: ext.priority,
          settings: parseAppSettings(ext),
        }));

        return {
          ...route.toJSON(),
          applications,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: routesWithApps,
    });
  } catch (error) {
    console.error("Error fetching inbound routes:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch inbound routes",
    });
  }
};

// Update an inbound route
// controllers/inboundRouteController.js
export const updateInboundRoute = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { routeId } = req.params;
    const {
      phone_number,
      context,
      alias,
      description,
      applications = [],
    } = req.body;

    const inboundRoute = await InboundRoute.findByPk(routeId);
    if (!inboundRoute) {
      return res.status(404).json({
        success: false,
        message: "Inbound route not found",
      });
    }

    await inboundRoute.update(
      { phone_number, context, alias, description },
      { transaction }
    );

    // Delete existing voice extensions
    await VoiceExtension.destroy({
      where: {
        context: inboundRoute.context,
        extension: inboundRoute.phone_number,
      },
      transaction,
    });

    // Create new voice extensions using the pre-formatted appdata and interval associations
    if (applications.length > 0) {
      await Promise.all(
        applications.map(async (app, index) => {
          // Process interval data from the app
          let intervalId = null;
          let intervalObj = null;

          // First check if interval is directly in the app object
          if (app.interval && app.interval.id) {
            intervalId = app.interval.id;
            intervalObj = app.interval;

            // Log for debugging
            console.log(
              `App ${app.type} has interval ${intervalId} directly in object`
            );
          }
          // Then check if it's in the settings object
          else if (app.settings?.interval) {
            intervalId = app.settings.interval;
            console.log(
              `App ${app.type} has interval ${intervalId} in settings.interval`
            );
          }
          // Check if options contains an interval ID
          else if (
            app.settings?.options &&
            app.settings.options !== "*,*,*,*" &&
            !app.settings.options.includes(",")
          ) {
            intervalId = app.settings.options;
            console.log(
              `App ${app.type} has interval ${intervalId} in settings.options`
            );
          }

          // If we have an interval ID but not the full object, fetch it from the database
          if (intervalId && !intervalObj) {
            try {
              intervalObj = await sequelize.models.interval.findByPk(
                intervalId
              );
              if (intervalObj) {
                console.log(
                  `Found interval "${intervalObj.name}" (${intervalId}) in database`
                );
              } else {
                console.log(`Interval ${intervalId} not found in database`);
              }
            } catch (error) {
              console.error(
                `Error fetching interval with ID ${intervalId}:`,
                error
              );
            }
          }

          // Determine the base priority for this application (leave space for conditional logic)
          const basePriority = index * 10 + 1;
          let currentPriority = basePriority;

          // If we have interval data, create conditional routing logic using GotoIfTime()
          if (intervalObj) {
            try {
              // Parse interval data
              let timeRange = intervalObj.timeRange;
              if (typeof timeRange === "string") {
                try {
                  timeRange = JSON.parse(timeRange);
                  console.log(
                    `Successfully parsed timeRange: ${JSON.stringify(
                      timeRange
                    )}`
                  );
                } catch (e) {
                  console.error(
                    `Error parsing timeRange from interval "${intervalObj.name}":`,
                    e
                  );
                  timeRange = { from: "00:00", to: "23:59" };
                }
              }

              // Log the raw values for debugging
              console.log(`Raw interval data for "${intervalObj.name}":`, {
                timeRange,
                weekDays: intervalObj.weekDays,
                months: intervalObj.months,
                monthDays: intervalObj.monthDays,
              });

              let weekDays = intervalObj.weekDays;
              if (typeof weekDays === "string") {
                try {
                  weekDays = JSON.parse(weekDays);
                } catch (e) {
                  console.error(`Error parsing weekDays:`, e);
                  weekDays = [];
                }
              }

              let months = intervalObj.months;
              if (typeof months === "string") {
                try {
                  months = JSON.parse(months);
                } catch (e) {
                  console.error(`Error parsing months:`, e);
                  months = [];
                }
              }

              let monthDays = intervalObj.monthDays;
              if (typeof monthDays === "string") {
                try {
                  monthDays = JSON.parse(monthDays);
                } catch (e) {
                  console.error(`Error parsing monthDays:`, e);
                  monthDays = [];
                }
              }

              // Format time range as HH:MM-HH:MM
              const timeStr = `${timeRange.from}-${timeRange.to}`;

              // Format days of week as mon-fri for continuous ranges, or mon,tue,wed for discontiguous days
              let daysStr = "*";
              if (Array.isArray(weekDays) && weekDays.length > 0) {
                const dayNames = [
                  "sun",
                  "mon",
                  "tue",
                  "wed",
                  "thu",
                  "fri",
                  "sat",
                ];

                // First convert all day numbers to proper day names and sort them
                const sortedDayIndices = weekDays
                  .map((d) => parseInt(d, 10))
                  .filter((d) => !isNaN(d) && d >= 0 && d <= 6)
                  .sort((a, b) => a - b);

                // Check if we have a continuous range of weekdays
                const isContinuousRange = sortedDayIndices.every(
                  (day, idx, arr) => idx === 0 || day === arr[idx - 1] + 1
                );

                if (isContinuousRange && sortedDayIndices.length > 1) {
                  // Format as a range: first-last (e.g., mon-fri)
                  daysStr = `${dayNames[sortedDayIndices[0]]}-${
                    dayNames[sortedDayIndices[sortedDayIndices.length - 1]]
                  }`;
                } else {
                  // Format as ampersand-separated values: day1&day2&day3
                  daysStr = sortedDayIndices
                    .map((day) => dayNames[day])
                    .join("&");
                }
              }

              // Format months using the same approach as days
              let monthsStr = "*";
              if (Array.isArray(months) && months.length > 0) {
                const monthNames = [
                  "jan",
                  "feb",
                  "mar",
                  "apr",
                  "may",
                  "jun",
                  "jul",
                  "aug",
                  "sep",
                  "oct",
                  "nov",
                  "dec",
                ];

                // Convert all month numbers to integers and sort them
                const sortedMonthIndices = months
                  .map((m) => parseInt(m, 10))
                  .filter((m) => !isNaN(m) && m >= 0 && m <= 11)
                  .sort((a, b) => a - b);

                // Check if we have a continuous range of months
                const isContinuousRange = sortedMonthIndices.every(
                  (month, idx, arr) => idx === 0 || month === arr[idx - 1] + 1
                );

                if (isContinuousRange && sortedMonthIndices.length > 1) {
                  // Format as a range: first-last (e.g., jan-mar)
                  monthsStr = `${monthNames[sortedMonthIndices[0]]}-${
                    monthNames[
                      sortedMonthIndices[sortedMonthIndices.length - 1]
                    ]
                  }`;
                } else {
                  monthsStr = sortedMonthIndices
                    .map((month) => monthNames[month])
                    .join(",");
                }
              }

              // Parse and format month days (dates of the month)
              let datesStr = "*";
              if (Array.isArray(monthDays) && monthDays.length > 0) {
                // Convert all dates to integers and sort them
                const sortedDateIndices = monthDays
                  .map((d) => parseInt(d, 10))
                  .filter((d) => !isNaN(d) && d >= 1 && d <= 31)
                  .sort((a, b) => a - b);

                // Check if we have a continuous range of dates
                const isContinuousRange = sortedDateIndices.every(
                  (date, idx, arr) => idx === 0 || date === arr[idx - 1] + 1
                );

                if (isContinuousRange && sortedDateIndices.length > 1) {
                  // Format as a range: first-last (e.g., 1-5)
                  datesStr = `${sortedDateIndices[0]}-${
                    sortedDateIndices[sortedDateIndices.length - 1]
                  }`;
                } else {
                  // Format as comma-separated values: 1,5,10,15
                  datesStr = sortedDateIndices.join(",");
                }
              }

              // Log the final formatted time conditions
              console.log(
                `Time condition for ${app.type} with interval "${intervalObj.name}":`,
                {
                  timeStr,
                  daysStr,
                  monthsStr,
                  datesStr,
                }
              );

              // The correct syntax is: GotoIfTime(time,days,months,day_of_month?label_if_true:label_if_false)
              const nextAppBasePriority = (index + 1) * 10 + 1;

              // Standard time condition: execute app when within time range
              await VoiceExtension.create(
                {
                  context: inboundRoute.context,
                  extension: phone_number,
                  priority: currentPriority++,
                  app: "GotoIfTime",
                  // If within time range, continue to next priority (to execute the app)
                  // If outside time range, jump to the next app's base priority (to skip this app)
                  appdata: `${timeStr},${daysStr},${monthsStr},${datesStr}?${inboundRoute.context},${phone_number},${currentPriority}:${inboundRoute.context},${phone_number},${nextAppBasePriority}`,
                  type: "inbound",
                  description: `Time condition for ${app.type}`,
                  isApp: false,
                  intervalId: intervalId,
                  interval: intervalId,
                },
                { transaction }
              );

              // The actual application runs at the next priority number
              // Special case for Queue - add MixMonitor right before Queue application
              if (app.type === "Queue") {
                // Extract queue name from appdata
                let queueName = "unknown";
                if (app.appdata && app.appdata.length > 0) {
                  const appDataParts = app.appdata.split(",");
                  if (appDataParts.length > 0) {
                    queueName = appDataParts[0];
                  }
                }

                // Create a recording path with date/time and queue info
                // Format: [base_dir]/[year]/[month]/[day]/queue-[queuename]-[uniqueid].wav
                const recordingDir = `${RECORDING_BASE_DIR}/\${STRFTIME(\${EPOCH},,%Y)}/\${STRFTIME(\${EPOCH},,%m)}/\${STRFTIME(\${EPOCH},,%d)}`;
                const recordingFilename = `queue-${queueName}-\${UNIQUEID}.wav`;
                const recordingPath = `${recordingDir}/${recordingFilename}`;

                // Add command to ensure the directory exists
                await VoiceExtension.create(
                  {
                    context: inboundRoute.context,
                    extension: phone_number,
                    priority: currentPriority++,
                    app: "System",
                    appdata: `mkdir -p "${recordingDir}"`,
                    type: "inbound",
                    description: `Create recording directory for Queue ${queueName}`,
                    isApp: false,
                    intervalId: intervalId,
                    interval: intervalId,
                  },
                  { transaction }
                );

                // Only answer the call if using 'rn' mode (ring and answer)
                // For 'tT' mode (transfer), don't answer to prevent premature billing
                const queueOptions = app.appdata.split(",")[1] || "tT";
                if (queueOptions.includes("r")) {
                  await VoiceExtension.create(
                    {
                      context: inboundRoute.context,
                      extension: phone_number,
                      priority: currentPriority++,
                      app: "Answer",
                      type: "inbound",
                      description: `Answer call for Queue ${queueName} (rn mode)`,
                      isApp: false,
                      intervalId: intervalId,
                      interval: intervalId,
                      answer: true,
                    },
                    { transaction }
                  );
                } else {
                  // For 'tT' mode, add a ringing tone to the caller
                  await VoiceExtension.create(
                    {
                      context: inboundRoute.context,
                      extension: phone_number,
                      priority: currentPriority++,
                      app: "Playback",
                      appdata: "ringback",
                      type: "inbound",
                      description: `Play ringing tone for Queue ${queueName} (tT mode)`,
                      isApp: false,
                      intervalId: intervalId,
                      interval: intervalId,
                    },
                    { transaction }
                  );
                }

                // Add MixMonitor before Queue application
                await VoiceExtension.create(
                  {
                    context: inboundRoute.context,
                    extension: phone_number,
                    priority: currentPriority++,
                    app: "MixMonitor",
                    // MixMonitor params:
                    // - Recording filename
                    // - b: Record both sides of the conversation
                    // - W: Enable automatic file close on hangup
                    // - v: Enable volume adjustment (easier to hear quieter parties)
                    // - CALL_RECORDING_AUDIO_FORMAT=wav: Specify the file format
                    // - CALL_RECORDING_QUALITY=wav49: Set compression type for wav files
                    appdata: `${recordingPath},bW(0)v(2),r(CALL_RECORDING_AUDIO_FORMAT=wav,CALL_RECORDING_QUALITY=wav49)`,
                    type: "inbound",
                    description: `Recording for Queue ${queueName}`,
                    isApp: false,
                    intervalId: intervalId,
                    interval: intervalId,
                  },
                  { transaction }
                );

                // Add Set command to store recording filename in a variable for CDR
                await VoiceExtension.create(
                  {
                    context: inboundRoute.context,
                    extension: phone_number,
                    priority: currentPriority++,
                    app: "Set",
                    appdata: `CDR(recordingfile)=${recordingPath}`,
                    type: "inbound",
                    description: `Set recording filename for Queue ${queueName}`,
                    isApp: false,
                    intervalId: intervalId,
                    interval: intervalId,
                  },
                  { transaction }
                );

                // Log the recording setup
                console.log(
                  `Added MixMonitor recording for Queue ${queueName} with priority ${
                    currentPriority - 2
                  }`
                );
              }

              // Create the actual application
              await VoiceExtension.create(
                {
                  context: inboundRoute.context,
                  extension: phone_number,
                  priority: currentPriority++,
                  app: app.type,
                  appdata: app.appdata,
                  type: "inbound",
                  description: `${alias || phone_number} - ${app.type}`,
                  isApp: true,
                  appType: app.type,
                  answer: shouldAnswerCall(app.type),
                  intervalId: intervalId,
                  interval: intervalId,
                },
                { transaction }
              );

              // After application runs, jump to the next application's base priority
              // This prevents execution falling through to the next app if this one was in time range
              await VoiceExtension.create(
                {
                  context: inboundRoute.context,
                  extension: phone_number,
                  priority: currentPriority++,
                  app: "Goto",
                  appdata: `${inboundRoute.context},${phone_number},${nextAppBasePriority}`,
                  type: "inbound",
                  description: `Jump to next app after ${app.type}`,
                  isApp: false,
                },
                { transaction }
              );
            } catch (error) {
              console.error(
                `Error creating conditional dialplan for app ${app.type}:`,
                error
              );

              // If there's an error in the conditional logic, fall back to creating a simple extension
              await VoiceExtension.create(
                {
                  context: inboundRoute.context,
                  extension: phone_number,
                  priority: basePriority,
                  app: app.type,
                  appdata: app.appdata,
                  type: "inbound",
                  description: `${alias || phone_number} - ${
                    app.type
                  } (fallback)`,
                  isApp: true,
                  appType: app.type,
                  answer: shouldAnswerCall(app.type),
                  intervalId: intervalId,
                  interval: intervalId,
                },
                { transaction }
              );
            }
          } else {
            // No interval - just create the application normally
            await VoiceExtension.create(
              {
                context: inboundRoute.context,
                extension: phone_number,
                priority: basePriority,
                app: app.type,
                appdata: app.appdata,
                type: "inbound",
                description: `${alias || phone_number} - ${app.type}`,
                isApp: true,
                appType: app.type,
                answer: shouldAnswerCall(app.type),
                intervalId: intervalId,
                interval: intervalId,
              },
              { transaction }
            );
          }
        })
      );
    }

    await transaction.commit();

    // Fetch updated route with its applications
    const updatedRoute = await InboundRoute.findByPk(routeId);
    const voiceExtensions = await VoiceExtension.findAll({
      where: {
        context: inboundRoute.context,
        extension: phone_number,
        type: "inbound",
      },
      include: [
        {
          model: sequelize.models.interval,
          as: "intervalObj",
          required: false,
        },
      ],
      order: [["priority", "ASC"]],
    });

    res.status(200).json({
      success: true,
      message: "Inbound route updated successfully",
      route: updatedRoute,
      applications: voiceExtensions,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Update error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update inbound route",
    });
  }
};

// Delete an inbound route
export const deleteInboundRoute = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { routeId } = req.params;
    const inboundRoute = await InboundRoute.findByPk(routeId);

    if (!inboundRoute) {
      return res.status(404).json({
        success: false,
        message: "Inbound route not found!",
      });
    }

    await inboundRoute.destroy({ transaction });

    await transaction.commit();

    res.status(200).json({
      success: true,
      message: "Inbound route deleted successfully",
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Delete error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete inbound route",
    });
  }
};
