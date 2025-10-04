import {
  Phone,
  PhoneDisabled,
  Group,
  MusicNote,
  Storage,
  CheckCircle,
} from "@mui/icons-material";
import SettingsSuggestIcon from "@mui/icons-material/SettingsSuggest";
import IntegrationInstructionsIcon from "@mui/icons-material/IntegrationInstructions";
import AutoAwesomeMotionIcon from "@mui/icons-material/AutoAwesomeMotion";
import StarRateIcon from "@mui/icons-material/StarRate";
import SwitchAccessShortcutIcon from "@mui/icons-material/SwitchAccessShortcut";
import TimerIcon from "@mui/icons-material/Timer";
import UpdateIcon from "@mui/icons-material/Update";
import ForkLeftIcon from "@mui/icons-material/ForkLeft";
import DataObjectIcon from "@mui/icons-material/DataObject";
import SettingsVoiceIcon from "@mui/icons-material/SettingsVoice";
import MediationIcon from "@mui/icons-material/Mediation";
import PhoneCallbackIcon from "@mui/icons-material/PhoneCallback";
import ThreePIcon from "@mui/icons-material/ThreeP";
import PersonPinIcon from "@mui/icons-material/PersonPin";
import PhoneForwardedIcon from "@mui/icons-material/PhoneForwarded";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
import CalculateIcon from "@mui/icons-material/Calculate";

export const BLOCK_TYPES = [
  {
    id: "Start",
    // icon: Phone,
    icon: PhoneForwardedIcon,
    label: "Start",
    // color: "#4caf50",
    color: "#4C87F5",
    app: "NoOp",
    connections: {
      inputs: 0,
      outputs: 1,
    },
    appConfig: {
      fields: [
        {
          name: "context",
          label: "Context",
          type: "text",
          default: "default",
        },
      ],
    },
  },
  {
    id: "Answer",
    icon: Phone,
    label: "Answer",
    color: "#4caf50",
    app: "Answer",
    connections: {
      inputs: 1,
      outputs: 2,
    },
    appConfig: {
      fields: [
        {
          name: "timeout",
          label: "Timeout (seconds)",
          type: "number",
          default: 30,
        },
      ],
    },
  },
  {
    id: "Menu",
    icon: MediationIcon,
    label: "Menu",
    color: "#042940",
    app: "Menu",
    connections: {
      inputs: 1,
      outputs: 1,
    },
    appConfig: {
      fields: [
        {
          name: "menu",
          label: "Menu",
          type: "text",
          required: true,
        },
        // Dropdown for available Audio
        {
          name: "audio",
          label: "Audio",
          type: "select",
          options: [],
          required: true,
        },
        {
          name: "timeout",
          label: "Timeout (seconds)",
          type: "number",
          default: 300,
        },
        {
          name: "maxDigits",
          label: "Max Digits",
          type: "number",
          default: 1,
        },
        {
          name: "retries",
          label: "Retries",
          type: "number",
          default: 1,
        },
        // Dropdown with available variables
        {
          name: "variables",
          label: "Variables",
          type: "select",
          options: [],
          required: true,
        },
      ],
    },
  },
  {
    id: "InternalDial",
    icon: PersonPinIcon,
    label: "Internal Dial",
    color: "#186A2C",
    app: "InternalDial",
    connections: {
      inputs: 1,
      outputs: 2,
    },
    appConfig: {
      fields: [
        // {
        //   name: "technology",
        //   label: "Technology",
        //   type: "select",
        //   options: ["PJSIP", "SIP", "IAX2"],
        //   required: true,
        // },
        // {
        //   name: "resource",
        //   label: "Number/Extension",
        //   type: "text",
        //   required: true,
        // },
        // Dropdown for available sip accounts
        {
          name: "sip",
          label: "SIP",
          type: "select",
          options: [],
          required: true,
        },
        {
          name: "url",
          label: "URL",
          type: "text",
          default: "",
        },
        {
          name: "timeout",
          label: "Timeout (seconds)",
          type: "number",
          default: 30,
        },
        {
          name: "options",
          label: "Dial Options",
          type: "text",
          default: "tT",
        },
      ],
    },
  },
  {
    id: "ExternalDial",
    // icon: PhoneForwardedIcon,
    icon: ThreePIcon,
    label: "External Dial",
    color: "#4C87F5",
    app: "Dial",
    connections: {
      inputs: 1,
      outputs: 2,
    },
    appConfig: {
      fields: [
        {
          name: "number",
          label: "Phone*",
          type: "text",
          required: true,
        },
        // Trunk from dropdown
        {
          name: "trunk",
          label: "Trunk",
          type: "select",
          options: [],
          required: true,
        },
        {
          name: "timeout",
          label: "Timeout (seconds)",
          type: "number",
          default: 60,
        },
        {
          name: "options",
          label: "Dial Options",
          type: "text",
          default: "",
        },
        {
          name: "url",
          label: "URL",
          type: "text",
          default: "",
        },
      ],
    },
  },
  {
    id: "Callback",
    icon: PhoneCallbackIcon,
    label: "Callback",
    color: "#6B2219",
    app: "Callback",
    connections: {
      inputs: 1,
      outputs: 1,
    },
    appConfig: {
      fields: [
        {
          name: "name",
          label: "Name",
          type: "text",
          default: "",
        },
        {
          name: "lastname",
          label: "Last Name",
          type: "text",
          default: "",
        },
        {
          name: "phone",
          label: "Phone",
          type: "text",
          default: "",
        },
        // Dropdown List
        {
          name: "list",
          label: "List",
          type: "select",
          options: [],
          required: true,
        },
        {
          name: "delay",
          label: "Delay (min)",
          type: "number",
          default: 5,
        },
        // Priority dropdown
        {
          name: "priority",
          label: "Priority",
          type: "select",
          options: ["Highest", "High", "Medium", "Low", "Lowest"],
          default: "1",
        },
      ],
    },
  },

  {
    id: "Playback",
    icon: MusicNote,
    label: "Playback",
    color: "#9c27b0",
    app: "Playback",
    connections: {
      inputs: 1,
      outputs: 1,
    },
    appConfig: {
      fields: [
        {
          name: "filename",
          label: "Audio File",
          type: "text",
          required: true,
        },
        {
          name: "skip",
          label: "Skip if Channel Answered",
          type: "checkbox",
          default: false,
        },
        {
          name: "options",
          label: "Options",
          type: "text",
          default: "",
        },
      ],
    },
  },
  {
    id: "Record",
    icon: SettingsVoiceIcon,
    label: "Record",
    color: "#4C5958",
    app: "Record",
    connections: {
      inputs: 1,
      outputs: 2,
    },
    appConfig: {
      fields: [
        {
          name: "filename",
          label: "File Name",
          type: "text",
          required: true,
        },
        {
          name: "format",
          label: "Format",
          type: "select",
          options: ["wav", "gsm", "mp3"],
          default: "wav",
        },
        {
          name: "timeout",
          label: "Timeout (seconds)",
          type: "number",
          default: -1,
        },
        {
          name: "duration",
          label: "Max Duration (seconds)",
          type: "number",
          default: 300,
        },
        {
          name: "escapeDigits",
          label: "Escape Digits",
          type: "text",
          default: "#",
        },
      ],
    },
  },
  {
    id: "queue",
    icon: Group,
    label: "Queue",
    color: "#ff9800",
    app: "Queue",
    connections: {
      inputs: 1,
      outputs: 3, // Success, Timeout, Failed
    },
    appConfig: {
      fields: [
        {
          name: "queuename",
          label: "Queue Name",
          type: "text",
          required: true,
        },
        // Dropdown for available queues
        {
          name: "queues",
          label: "Available Queues",
          type: "select",
          options: [],
          required: true,
        },
        {
          name: "options",
          label: "Queue Options",
          type: "text",
          default: "xX",
        },
        {
          name: "url",
          label: "URL",
          type: "text",
          default: "",
        },
        {
          name: "timeout",
          label: "Timeout",
          type: "number",
          default: 300,
        },
        {
          name: "announceFrequency",
          label: "Announce Frequency",
          type: "number",
          default: 30,
        },
        {
          name: "agi",
          label: "AGI",
          type: "text",
          default: "",
        },
        {
          name: "macro",
          label: "Macro",
          type: "text",
          default: "",
        },
        {
          name: "gosub",
          label: "GoSub",
          type: "text",
          default: "",
        },
        {
          name: "position",
          label: "Position",
          type: "text",
          default: "",
        },
      ],
    },
  },
  {
    id: "Database",
    icon: Storage,
    label: "Database",
    color: "#ffc107",
    app: "Database",
    connections: {
      inputs: 1,
      outputs: 1,
    },
    appConfig: {
      fields: [
        {
          name: "Database",
          label: "Database",
          type: "text",
          required: true,
        },
        {
          name: "odbcConnection",
          label: "ODBC Connection",
          type: "text",
          required: true,
        },
        {
          name: "query",
          label: "Query",
          type: "text",
          required: true,
        },
        {
          name: "variable",
          label: "Variable",
          type: "text",
          required: true,
        },
      ],
    },
  },
  {
    id: "RestApi",
    icon: DataObjectIcon,
    label: "Rest API",
    color: "#0FC2C0",
    app: "RestApi",
    connections: {
      inputs: 1,
      outputs: 1,
    },
    appConfig: {
      fields: [
        {
          name: "url",
          label: "URL",
          type: "text",
          required: true,
        },
        // Dropdown for available methods
        {
          name: "method",
          label: "Method",
          type: "select",
          options: ["GET", "POST", "PUT", "DELETE"],
          default: "GET",
        },
        {
          name: "headers",
          label: "Headers",
          type: "text",
          default: "",
        },
        {
          name: "body",
          label: "Body",
          type: "text",
          default: "",
        },
        {
          name: "timeout",
          label: "Timeout",
          type: "number",
          default: 5,
        },
        // Variables dropdown
        {
          name: "variables",
          label: "Variables",
          type: "select",
          options: [],
          required: true,
        },
        {
          name: "script",
          label: "Computed Variables Script Path",
          type: "text",
          default: "",
        },
      ],
    },
  },
  {
    id: "Goto",
    icon: ForkLeftIcon,
    label: "Goto",
    color: "#015958",
    app: "Goto",
    connections: {
      inputs: 1,
      outputs: 1,
    },
    appConfig: {
      fields: [
        {
          name: "label",
          label: "Label",
          type: "text",
          required: true,
        },
        {
          name: "goto",
          label: "Goto",
          type: "text",
          required: true,
        },

        {
          name: "context",
          label: "Context",
          type: "text",
          default: "",
        },
        {
          name: "extension",
          label: "Extension",
          type: "text",
          default: "",
        },
        {
          name: "priority",
          label: "Priority",
          type: "number",
          default: 1,
        },
      ],
    },
  },
  {
    id: "GotoIf",
    icon: UpdateIcon,
    label: "Goto If",
    color: "#023535",
    app: "GotoIf",
    connections: {
      inputs: 1,
      outputs: 2,
    },
    appConfig: {
      fields: [
        {
          name: "label",
          label: "GotoIf",
          type: "text",
          required: false,
        },
        {
          name: "condition",
          label: "Condition",
          type: "text",
          required: true,
        },
      ],
    },
  },
  {
    id: "GotoIfTime",
    icon: TimerIcon,
    label: "GotoIfTime",
    color: "#D96941",
    app: "GotoIfTime",
    connections: {
      inputs: 1,
      outputs: 2,
    },
    appConfig: {
      fields: [
        {
          name: "GotoIfTime",
          label: "GotoIfTime",
          type: "text",
          required: false,
        },
        // Dropdown for available times
        {
          name: "intervals",
          label: "Intervals",
          type: "select",
          options: [],
          required: true,
        },
      ],
    },
  },
  {
    id: "Switch",
    icon: SwitchAccessShortcutIcon,
    label: "Switch",
    color: "#3f51b5",
    app: "Switch",
    connections: {
      inputs: 1,
      outputs: 2, // True and False paths
    },
    appConfig: {
      fields: [
        //  Dropdown for variables
        {
          name: "variables",
          label: "Variables",
          type: "select",
          options: [],
          required: true,
        },
      ],
    },
  },
  {
    id: "Goal",
    icon: StarRateIcon,
    label: "Goal",
    color: "#F2CB05",
    app: "Goal",
    connections: {
      inputs: 1,
      outputs: 1,
    },
    appConfig: {
      fields: [
        {
          name: "goal",
          label: "Goal",
          type: "text",
          required: true,
        },
      ],
    },
  },
  {
    id: "AGI",
    icon: AutoAwesomeMotionIcon,
    label: "AGI",
    color: "#634A00",
    app: "AGI",
    connections: {
      inputs: 1,
      outputs: 1,
    },
    appConfig: {
      fields: [
        {
          name: "agi",
          label: "AGI",
          type: "text",
          required: true,
        },
        {
          name: "script",
          label: "Command",
          type: "text",
          required: true,
        },
        {
          name: "Arguments",
          label: "Arguments",
          type: "text",
          default: "",
        },
      ],
    },
  },
  {
    id: "System",
    icon: SettingsSuggestIcon,
    label: "System",
    color: "#000000",
    app: "System",
    connections: {
      inputs: 0,
      outputs: 1,
    },
    appConfig: {
      fields: [
        {
          name: "System",
          label: "System",
          type: "text",
          required: true,
        },
        // Dropdown for available variables
        {
          name: "variables",
          label: "Variables",
          type: "select",
          options: [],
          required: true,
        },
        {
          name: "command",
          label: "Command",
          type: "text",
          required: true,
        },
      ],
    },
  },
  {
    id: "NoOp",
    icon: IntegrationInstructionsIcon,
    label: "NoOp",
    color: "#2F3D40",
    app: "NoOp",
    connections: {
      inputs: 0,
      outputs: 1,
    },
    appConfig: {
      fields: [],
      label: "NoOp",
      type: "NoOp",
      required: true,
    },
  },
  {
    id: "Math",
    icon: CalculateIcon,
    label: "Math",
    color: "#390D02",
    app: "Math",
    connections: {
      inputs: 1,
      outputs: 1,
    },
    appConfig: {
      fields: [
        {
          name: "expression",
          label: "Expression",
          type: "text",
          required: true,
        },
        // Dropdown for available variables
        {
          name: "variables",
          label: "Variables",
          type: "select",
          options: [],
          required: true,
        },
      ],
    },
  },
  {
    id: "Hangup",
    icon: PhoneDisabled,
    label: "Hangup",
    color: "#d32f2f",
    app: "Hangup",
    connections: {
      inputs: 1,
      outputs: 0,
    },
    appConfig: {
      fields: [
        {
          name: "cause",
          label: "Hangup Cause",
          type: "select",
          options: [
            "NORMAL_CLEARING",
            "USER_BUSY",
            "NO_ANSWER",
            "CALL_REJECTED",
          ],
          default: "NORMAL_CLEARING",
        },
      ],
    },
  },
  {
    id: "Finally",
    icon: CheckCircle,
    label: "Finally",
    color: "#e91e63",
    app: "NoOp",
    connections: {
      inputs: 0,
      outputs: 1,
    },
  },
  {
    id: "End",
    icon: PowerSettingsNewIcon,
    label: "End",
    color: "#F5864C",
    app: "NoOp",
    connections: {
      inputs: 1,
      outputs: 0,
    },
  },
];
