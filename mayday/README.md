# Mayday Call Center System

A comprehensive Asterisk-based call center solution integrated into the Hugamara hospitality management system.

## 🏗️ Architecture Overview

The Mayday Call Center system consists of two main components:

```
┌─────────────────────────────────────────────────────────────┐
│                    Hugamara Main Project                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │   Main Backend  │  │  Main Frontend  │  │   Mayday    │  │
│  │   (Port 8000)   │  │   (Port 3000)   │  │  Call Center│  │
│  └─────────────────┘  └─────────────────┘  └─────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Mayday Call Center System                 │ │
│  │  ┌─────────────────┐  ┌─────────────────────────────┐  │ │
│  │  │  Slave Backend  │  │    Client Dashboard         │  │ │
│  │  │  (Port 8004)    │  │    (Port 3002)              │  │ │
│  │  └─────────────────┘  └─────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Asterisk PBX   │
                    │  (EC2 Server)   │
                    │  Port 5038 AMI  │
                    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm 8+
- Redis server running locally
- Access to EC2 Asterisk server
- MariaDB database access

### Installation & Setup

1. **Install dependencies:**

   ```bash
   npm run callcenter:install
   ```

2. **Configure environment:**

   ```bash
   # Copy environment files
   cp mayday/slave-backend/env.example mayday/slave-backend/.env
   cp mayday/mayday-client-dashboard/env.example mayday/mayday-client-dashboard/.env
   ```

   Configure the call center database connection in `mayday/slave-backend/.env`. Use a privileged user like `root` to ensure permissions for database migrations and schema synchronization.

   ```ini
   # Example for mayday/slave-backend/.env
   DB_HOST=cs.hugamara.com
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=YOUR_ROOT_PASSWORD
   DB_NAME=asterisk
   ```

3. **Configure trunk provider settings:**

   ```bash
   # Add to mayday/slave-backend/.env
   echo "TRUNK_PROVIDER_AUTH_HEADER=MDMyMDAwMDAwODoxMy4yMzQuMTguMg==" >> mayday/slave-backend/.env
   echo "TRUNK_PROVIDER_VALIDATE_URL=https://ug.cyber-innovative.com:444/cyber-api/cyber_validate.php" >> mayday/slave-backend/.env
   ```

4. **Start the call center system:**

   ```bash
   npm run callcenter
   ```

5. **Access the application:**
   - **Development**: http://localhost:3002
   - **Production**: https://cs.backspace.ug/callcenter/
   - **Login Credentials**:
     - Username: `admin`
     - Password: `Pasword@256`

### Individual Services

- **Provisioning Backend only:** `npm run callcenter:provisioning` (Port 8001)
- **Slave Backend only:** `npm run callcenter:backend` (Port 8004)
- **Frontend only:** `npm run callcenter:frontend` (Port 3002)

## 📁 Project Structure

```
mayday/
├── slave-backend/                 # Node.js backend service
│   ├── config/                   # Configuration files
│   │   ├── sequelize.js         # Database configuration
│   │   ├── redis.js             # Redis configuration
│   │   └── amiClient.js         # Asterisk AMI client
│   ├── controllers/              # API controllers
│   ├── models/                   # Database models
│   ├── routes/                   # Express routes
│   ├── services/                 # Business logic services
│   │   ├── amiService.js        # Asterisk AMI service
│   │   ├── callMonitoringService.js
│   │   └── agentStatusService.js
│   ├── scripts/                  # Utility scripts
│   │   └── setup-asterisk-config.sh
│   └── server.js                 # Main server file
│
├── mayday-client-dashboard/       # React frontend
│   ├── src/
│   │   ├── components/           # React components
│   │   ├── features/             # Feature modules
│   │   ├── hooks/                # Custom React hooks
│   │   ├── services/             # API services
│   │   └── store/                # Redux store
│   └── public/
│
└── README.md                     # This file
```

## 🌐 Services & Ports

| Service                  | Port | Description                |
| ------------------------ | ---- | -------------------------- |
| **Provisioning Backend** | 8001 | License management server  |
| **Slave Backend**        | 8004 | Node.js API server         |
| **Client Dashboard**     | 3002 | React frontend             |
| **Asterisk AMI**         | 5038 | Asterisk Manager Interface |
| **Redis**                | 6379 | Session storage            |
| **MariaDB**              | 3306 | Database                   |

## 🔌 Integration with Main Hugamara System

### How It Fits In

The Mayday Call Center system is designed as a **standalone module** within the Hugamara ecosystem:

1. **Independent Operation**: Runs on separate ports (8001, 8004, 3002)
2. **Shared Database**: Uses the same MariaDB instance with dedicated `asterisk` database
3. **Shared Infrastructure**: Leverages existing Redis and EC2 infrastructure
4. **Modular Design**: Can be enabled/disabled without affecting main hospitality system

### Data Flow

```
Main Hugamara System          Mayday Call Center
┌─────────────────┐          ┌─────────────────┐
│   Hospitality   │          │   Call Center   │
│   Management    │          │   Operations    │
│                 │          │                 │
│  - Reservations │          │  - Call Queue   │
│  - Orders       │          │  - Agent Status │
│  - Inventory    │          │  - Call Records │
│  - Staff        │          │  - IVR System   │
└─────────────────┘          └─────────────────┘
         │                           │
         └───────────┬───────────────┘
                     ▼
            ┌─────────────────┐
            │   Shared DB     │
            │   (MariaDB)     │
            └─────────────────┘
```

## 🎯 Features

### Core Call Center Features

- **Real-time Call Monitoring**: Live call status and queue management
- **Agent Management**: Agent status, availability, and performance tracking
- **IVR System**: Interactive Voice Response configuration
- **Call Routing**: Inbound and outbound call routing rules
- **Queue Management**: Call queue configuration and monitoring
- **Call Recording**: CDR (Call Detail Records) and call history
- **WebRTC Support**: Browser-based softphone capabilities
- **Asterisk AMI Integration**: Full Asterisk Manager Interface connectivity
- **WebSocket Real-time Updates**: Live status updates to dashboard

### Recent Improvements (October 2025)

#### Production Deployment Fixes (Oct 4, 2025)

- **✅ React Routing Issue (CRITICAL)**: Fixed blank white screen in production by properly configuring React app with `homepage: "/callcenter/"` and updating nginx to serve static assets from correct paths
- **✅ Static Assets Routing**: Fixed 404 errors for JavaScript, CSS, and other static files by adding proper nginx location blocks for `/static/` and individual assets
- **✅ Nginx Configuration**: Updated nginx to properly handle SPA routing with correct `try_files` directives and asset serving
- **✅ Production URL Structure**: Application now correctly serves at `https://cs.backspace.ug/callcenter/` with proper asset loading

#### Dashboard Analytics Fixes (Oct 1, 2025)

- **✅ Weekly > Monthly Stats Bug (CRITICAL)**: Fixed illogical data where weekly stats (123 calls) exceeded monthly stats (8 calls) by capping week start at current month start when Sunday falls in previous month
- **✅ Timezone Bug (UTC+3)**: Fixed agent call statistics showing wrong day's data from midnight-3AM due to UTC conversion issues
- **✅ Monthly Range Fix**: Changed from "last 30 days" to actual current month (Oct 1 - today)
- **✅ Loading Indicator Fix**: Added 5-second timeout to prevent infinite loading spinner
- **✅ Answered Calls Calculation**: Fixed week/month answered calls calculation (total - abandoned)

#### Session Recovery & Reliability

- **Session Recovery System**: Automatic recovery of SIP, WebSocket, and dashboard connections after network issues or page refresh
- **Connection Health Monitoring**: Real-time connection status indicators with automatic reconnection
- **Grace Period Handling**: Prevents premature disconnections during authentication and logout flows

#### Call Center Features

- **CDR Standardization**: Fixed disposition values to align with Asterisk standard (`ANSWERED` instead of `NORMAL`)
- **Accurate Metrics**: Fixed abandon rate calculation to exclude internal Asterisk queue records
- **Chrome Extension**: Auto re-registration after page refresh for seamless user experience
- **Timezone Consistency**: System-wide timezone configuration (Africa/Nairobi - UTC+3)

📚 **[View CDR Fix Documentation](slave-backend/docs/CDR_AND_METRICS_FIX.md)**

### Integration Features

- **Asterisk AMI**: Full Asterisk Manager Interface integration
- **Database Sync**: Real-time database synchronization
- **WebSocket Communication**: Real-time updates to frontend
- **License Management**: Integrated licensing system with development fallback
- **Multi-tenant Support**: Support for multiple organizations
- **Redis Session Management**: Persistent session storage and cleanup
- **Development Mode**: Automatic fallback license creation for development
- **Chrome Extension**: Multi-tenant softphone extension with dynamic configuration
- **Trunk Provider Integration**: External API integration for call validation

## 📊 Agent Availability & Status Logic

### Overview

The Mayday Call Center system determines agent availability through a **hybrid approach** combining multiple data sources with a priority-based system. This ensures accurate agent status even when individual data sources are unavailable or unreliable.

### Data Sources & Priority System

Agent online/offline status is determined using a **three-tier priority system**:

#### Priority 1: Active Client Sessions (Most Reliable)

**Source**: `client_session` database table  
**Checked via**: `agentStatusService.getActiveSessions()`

This is the **primary source of truth** for agent availability. When an agent logs into any client (Chrome Extension, Electron Softphone, WebRTC), an active session record is created with:

- Session token and expiration
- SIP username (extension)
- Client fingerprint and IP address
- User agent and feature (e.g., "chrome_softphone", "electron_softphone")
- Last heartbeat timestamp

**Why Priority 1**: Client sessions are application-managed and include heartbeat monitoring, making them the most reliable indicator that an agent is actively logged in and ready to receive calls.

**Status Determination**:

- If an active, non-expired session exists → Agent is `online`
- Session typology (chrome_softphone, electron_softphone, webRTC) is detected from user agent
- Session IP address and last heartbeat are used for connection tracking

#### Priority 2: PJSIP Contact Registration

**Source**: Multiple sources with fallback chain  
**Checked via**:

1. Database realtime table (`ps_contacts`) - if Asterisk realtime is enabled
2. Per-endpoint AMI query (`pjsip show endpoint <ext>`)
3. Bulk AMI query (`pjsip show contacts`)

**Why Priority 2**: PJSIP contacts indicate active SIP registration. If no client session exists but the agent's SIP endpoint is registered, the agent is still considered online.

**Status Determination**:

- Contact status "Avail" or "Reachable" → Agent is `online`
- Extracts IP address, port, and transport (UDP/TCP/WebSocket)
- Provides RTT (Round Trip Time) for connection quality

**Fallback Chain Logic**:

```javascript
// 1. Try database realtime contacts (fastest, most reliable if enabled)
let contactsData = await getPJSIPContactsFromDB();

// 2. If DB has no contacts, try precise per-endpoint AMI query
if (Object.keys(contactsData).length === 0) {
  contactsData = await getContactsByEndpoints();
}

// 3. Fallback to bulk AMI contacts
if (Object.keys(contactsData).length === 0) {
  contactsData = await getPJSIPContacts();
}
```

#### Priority 3: PJSIP Endpoint Configuration

**Source**: AMI command `pjsip show endpoints`  
**Checked via**: `agentStatusService.getPJSIPEndpoints()`

**Why Priority 3**: Endpoints that are configured in Asterisk but have no active contact or session are marked as `registered` rather than `online`. This indicates the agent is set up but not currently connected.

**Status Determination**:

- Endpoint exists in Asterisk configuration → Agent is `registered`
- Provides Asterisk status text (e.g., "Not in use", "In use")

### Queue-Specific Availability

Separate from online/offline status, the system tracks **queue-specific availability** through AMI events:

**Source**: AMI events (`QueueMemberStatus`, `QueueMemberPause`, `QueueMemberUnpause`)  
**Tracked via**: Real-time event listeners in `agentStatusService`

**Queue Status Codes** (from Asterisk device state):

- `1` = **Available** (AST_DEVICE_NOT_INUSE) - Agent is free and can receive calls
- `2` = **In Use** (AST_DEVICE_INUSE) - Agent is on a call
- `3` = **Busy** (AST_DEVICE_BUSY) - Agent is busy (manual status or multiple calls)
- `4` = **Invalid** (AST_DEVICE_INVALID) - Invalid device state
- `5` = **Unavailable** (AST_DEVICE_UNAVAILABLE) - Agent is unavailable
- `6` = **Ringing** (AST_DEVICE_RINGING) - Agent's phone is ringing
- `7` = **On Hold** (AST_DEVICE_ONHOLD) - Agent has call on hold

**Additional Queue Metrics**:

- `paused`: Boolean indicating if agent is paused from receiving queue calls
- `pauseReason`: Reason for pause (e.g., "Break", "Lunch", "Training")
- `callsTaken`: Total calls taken by this queue member
- `lastCall`: Timestamp of last call handled

### Real-Time Updates

The system provides real-time status updates through two mechanisms:

#### 1. AMI Event Listeners (Immediate)

Event-driven updates for instant status changes:

```javascript
// Contact status events (registration changes)
amiClient.on("ContactStatus", updateFromContactEvent);
amiClient.on("ContactStatusDetail", updateFromContactEvent);

// Queue member events (availability changes)
amiClient.on("QueueMemberStatus", handleQueueMemberStatus);
amiClient.on("QueueMemberPause", handleQueueMemberPause);
amiClient.on("QueueMemberUnpause", handleQueueMemberUnpause);
```

#### 2. Periodic Polling (Every 15 seconds)

Fallback mechanism to catch missed events and ensure consistency:

```javascript
const pollFrequency = 15000; // 15 seconds
```

Polling aggregates all data sources and broadcasts updates via WebSocket to all connected dashboard clients.

### Combined Status Example

An agent's complete status includes data from all sources:

```json
{
  "extension": "1005",
  "username": "john.doe",
  "fullName": "John Doe",
  "status": "online", // Priority 1-3: Overall connectivity
  "sessionActive": true, // Priority 1: Client session exists
  "clientType": "electron_softphone", // From session
  "ip": "102.214.151.191", // From session or contact
  "port": 57467, // From contact
  "transport": "websocket", // From contact
  "lastSeen": "2025-10-01T10:30:45Z",
  "queueStatus": "available", // From queue events
  "paused": false, // From queue events
  "pauseReason": null,
  "callsTaken": 15, // From queue events
  "queues": ["support", "sales"] // From queue events
}
```

### Summary: Source of Truth

| Status Type            | Source of Truth    | Fallback                        | Update Method                |
| ---------------------- | ------------------ | ------------------------------- | ---------------------------- |
| **Online/Offline**     | Client Session DB  | PJSIP Contact → Endpoint Config | Session heartbeats + Polling |
| **Queue Availability** | AMI Queue Events   | Polling queue status            | Real-time AMI events         |
| **Call State**         | AMI Channel Events | CDR records                     | Real-time AMI events         |
| **Registration**       | PJSIP Contacts     | Endpoint configuration          | AMI events + Polling         |

**Key Principle**: The system uses a **defense in depth** approach with multiple redundant data sources, ensuring agent status remains accurate even if individual components (database, AMI, sessions) experience issues.

## 📞 Outbound Dialing: Default DID, DID Inventory, and Helper Context

- Default DID per agent: Stored in `users.callerid` and editable in the dashboard (Agents → Voice → “Default DID (no‑prefix CLI)”). No‑prefix calls will use this DID unless an explicit route overrides it.
- DID Inventory (DB): Table `did_inventory` contains your outlet DIDs and metadata (outlet name, allow_inbound/outbound, etc.). The dashboard uses it to populate DID dropdowns (endpoint: `/api/users/inbound_route/dids`).
- File-based helper: Asterisk dialplan defines `outbound-dial` in your file include. It receives `${ARG1}` = destination, `${ARG2}` = DID and:
  - Sets `CALLERID(num)` and `CALLERID(name)` from `${ARG2}`
  - Dials `PJSIP/${ARG1}@Hugamara_Trunk`
- Usage patterns:
  - Prefix dialing (recommended for ad‑hoc DID choice): agents dial 2‑digit prefix (43–49) + number; the file dialplan forces the corresponding DID and jumps into `outbound-dial`.
  - No‑prefix dialing (fixed/default): the helper uses the agent’s `DEFAULT_DID` (from endpoint) or a UI route can set a specific DID via a “Set CALLERID(all)=...” prior to the Dial.

## 🧭 Contexts

- Per‑agent context selection is no longer used in the UI. Agents are provisioned into standard contexts server‑side; the Agent Edit form does not expose context.
- The file include `extensions_mayday_context.conf` is the single source of truth for outbound logic (prefixes and `outbound-dial`). The server does not auto‑generate this context to avoid conflicts.

## 🖥️ Dashboard Workflows

### Set Default DID per Agent

1. Agents → select agent → Voice tab
2. “Default DID (no‑prefix CLI)” → choose from dropdown (pulled from `did_inventory`)
3. Save (writes `users.callerid`)

### Configure a Fixed Outbound Route (optional)

Use when you want a route that always presents one DID without agent prefixes.

1. Voice → Outbound Routes → Edit (or Create)
2. Actions tab → drag “Outbound Dial” into the flow
3. In the dialog:
   - Trunk: `Hugamara_Trunk`
   - Caller ID (DID): select from dropdown (labels like `LaCueva (0323300245)`)
   - Prefix: leave blank unless provider needs a prepend
4. Save. The UI auto‑inserts a “Custom → Set CALLERID(all)="<DID> <DID>"” immediately above Dial, mirroring the helper’s behavior

Notes:

- You don’t need a UI Outbound Route for prefix use cases; the file dialplan already handles 43–49.
- For per‑agent defaults (no prefix), setting `users.callerid` is enough; no UI route is required.

## 🔌 API Endpoints (DID Dropdown)

- List DIDs (inventory first, fallback to inbound routes):
  - `GET /api/users/inbound_route/dids` → `[{ did: "0323300245", label: "LaCueva (0323300245)" }, ...]`

## ✅ Verification

On the PBX:

- Reload dialplan after editing your file include:
  - `asterisk -rx 'dialplan reload'`
- Show helper context:
  - `asterisk -rx 'dialplan show outbound-dial'`
- Quick call test flow (agent 1009):
  - No prefix: expect `Gosub(outbound-dial,s,1(0700...,<DEFAULT_DID>))`
  - Prefix 45: expect `Gosub(outbound-dial,s,1(0700...,0323300245))`

## 🧪 Troubleshooting Outbound Calls

Symptoms: `Everyone is busy/congested` immediately after Dial.

Checklist:

1. Endpoint name matches dial string:
   - Dial uses `PJSIP/${ARG1}@Hugamara_Trunk` → endpoint id must be `Hugamara_Trunk`.
2. Registration/peer status:
   - Registration: `asterisk -rx 'pjsip show registrations'` → Status: Registered
   - Peer/IP: `pjsip show endpoint Hugamara_Trunk` → AOR Contacts > 0, `pjsip show identify` matches provider IP
3. Number format:
   - Some providers require E.164 (e.g., `256700…`). Add a Prefix in the Outbound Dial dialog to prepend country code
4. See actual SIP error:
   - `asterisk -rx 'pjsip set logger on'` → place call → check 403/404/480 codes from provider

Provider requirements:

- Ensure trunk has `send_pai=yes` and `send_rpid=yes` so the asserted CLI is honored.
- Provider must allow the DID you present as CLI.

## 🔊 Troubleshooting WebRTC Audio (Electron/Chrome Softphone)

### Issue: One-Way Audio in Electron Softphone

**Symptoms:**

- **Electron app**: You can hear the remote party, but they can't hear you
- **Chrome extension**: Audio works perfectly both ways
- Calls connect successfully but audio is unidirectional
- Console shows track events but audio doesn't play

**Root Cause:**

The Electron app's `sipService.js` was missing critical audio handling mechanisms that the Chrome extension had. Key differences:

1. **Track Event Handling**: Incomplete track event processing
2. **MediaStream Creation**: Not creating streams from track events properly
3. **Audio Element Management**: Missing proper audio element setup and configuration
4. **ICE Connection Recovery**: No audio stream recovery when ICE connection completes
5. **Autoplay Error Handling**: Missing user interaction fallback for autoplay restrictions

**Solution: Enhanced Audio Handling in Electron App**

The following fixes were implemented in `mayday/electron-softphone/src/services/sipService.js`:

#### 1. Enhanced Track Event Handling

```javascript
// In setupCallSession(session) - existing sessionDescriptionHandler check
pc.addEventListener("track", async (event) => {
  console.log("🎵 Received track event (existing handler):", {
    kind: event.track.kind,
    id: event.track.id,
    readyState: event.track.readyState,
    enabled: event.track.enabled,
    muted: event.track.muted,
    streamCount: event.streams?.length || 0,
  });

  if (event.track.kind === "audio") {
    state.eventEmitter.emit("track:added", event);
    try {
      console.log("🔊 Setting up incoming audio track (existing handler)");
      await handleAudioTrack(event);
    } catch (error) {
      console.error("❌ Error handling audio track (existing handler):", error);
    }
  }
});
```

#### 2. Improved MediaStream Creation

```javascript
async function handleAudioTrack(event) {
  // Create stream from track event - similar to chrome extension
  let stream;
  if (event.streams && event.streams.length > 0) {
    stream = event.streams[0];
    console.log("🎵 Using stream from track event");
  } else {
    console.log("🎵 Creating new stream from track");
    stream = new MediaStream([event.track]);
  }

  // Ensure audio element exists and is properly configured
  if (!state.audioElement) {
    state.audioElement = document.createElement("audio");
    state.audioElement.id = "sipjs-remote-audio";
    state.audioElement.autoplay = true;
    state.audioElement.controls = false;
    state.audioElement.style.display = "none";
    state.audioElement.volume = 0.8; // Set reasonable volume like chrome extension
    state.audioElement.preload = "auto";
    document.body.appendChild(state.audioElement);
  }

  // Force proper audio settings
  state.audioElement.muted = false;
  state.audioElement.volume = 0.8;

  // Set the stream
  if (state.audioElement.srcObject !== stream) {
    state.audioElement.srcObject = stream;
  } else {
    // Make sure all tracks are enabled
    stream.getTracks().forEach((track) => {
      track.enabled = true;
    });
  }

  // Play with autoplay error handling
  const playPromise = state.audioElement.play();
  if (playPromise !== undefined) {
    playPromise
      .then(() => {
        console.log("✅ Remote audio playback started successfully");
        setupAudioMonitoring(stream);
      })
      .catch((error) => {
        console.error("❌ Remote audio autoplay blocked:", error.message);

        // Handle autoplay restrictions like chrome extension
        if (error.name === "NotAllowedError") {
          // Create visible notification for user to enable audio
          const notification = document.createElement("div");
          notification.id = "audio-enable-notification";
          notification.innerHTML = `
            <div style="
              position: fixed; top: 50px; right: 20px;
              background: #007bff; color: white; padding: 15px 20px;
              border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              z-index: 10000; font-family: -apple-system, BlinkMacSystemFont, sans-serif;
              font-size: 14px; cursor: pointer; max-width: 300px;
            ">
              🔊 Click here to enable call audio
              <div style="font-size: 11px; opacity: 0.9; margin-top: 5px;">
                Browser blocked audio - click to activate
              </div>
            </div>
          `;

          const enableAudio = () => {
            state.audioElement
              .play()
              .then(() => {
                console.log("✅ Audio enabled after user interaction");
                notification.remove();
              })
              .catch((err) => {
                console.error("❌ Still failed to enable audio:", err);
              });
          };

          notification.addEventListener("click", enableAudio);
          document.body.appendChild(notification);

          // Auto-remove notification after 10 seconds
          setTimeout(() => {
            if (notification.parentNode) {
              notification.remove();
            }
          }, 10000);
        }
      });
  }
}
```

#### 3. ICE Connection State Audio Recovery

```javascript
// In setupCallSession(session) - ICE connection state change handler
pc.addEventListener("iceconnectionstatechange", () => {
  console.log("🧊 ICE connection state changed:", pc.iceConnectionState);

  if (
    pc.iceConnectionState === "connected" ||
    pc.iceConnectionState === "completed"
  ) {
    console.log("🧊 ICE connected - checking for audio streams");

    // Check for remote streams
    const remoteStreams = pc.getRemoteStreams();
    console.log("🧊 Remote streams found:", remoteStreams.length);

    if (remoteStreams.length > 0) {
      const audioStream = remoteStreams.find(
        (stream) => stream.getAudioTracks().length > 0
      );

      if (audioStream) {
        console.log("🧊 Found audio stream, setting up playback");
        playRemoteAudio(audioStream);
      }
    } else {
      // Fallback: create stream from receivers
      console.log("🧊 No remote streams, checking receivers");
      const receivers = pc.getReceivers();
      const audioReceivers = receivers.filter(
        (r) =>
          r.track && r.track.kind === "audio" && r.track.readyState === "live"
      );

      if (audioReceivers.length > 0) {
        console.log("🧊 Found audio receivers, creating stream");
        const stream = new MediaStream(audioReceivers.map((r) => r.track));
        playRemoteAudio(stream);
      }
    }
  }
});
```

#### 4. Dedicated Audio Playback Function

```javascript
function playRemoteAudio(stream) {
  console.log("🎵 Setting up remote audio playback");

  try {
    // Find or create audio element
    let audioElement = document.getElementById("sipjs-remote-audio");

    if (!audioElement) {
      audioElement = document.createElement("audio");
      audioElement.id = "sipjs-remote-audio";
      audioElement.autoplay = true;
      audioElement.controls = false;
      audioElement.style.display = "none";
      audioElement.volume = 0.8;
      audioElement.preload = "auto";
      document.body.appendChild(audioElement);
    }

    if (audioElement.srcObject !== stream) {
      audioElement.srcObject = stream;

      // Force audio element to load and play
      const playPromise = audioElement.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log("✅ Remote audio playback started successfully");
          })
          .catch((error) => {
            console.error("❌ Remote audio autoplay blocked:", error.message);
          });
      }
    }

    // Monitor audio tracks
    const audioTracks = stream.getAudioTracks();
    audioTracks.forEach((track, index) => {
      track.onended = () => console.log(`🎵 Audio track ${index} ended`);
      track.onmute = () => console.log(`🔇 Audio track ${index} muted`);
      track.onunmute = () => console.log(`🔊 Audio track ${index} unmuted`);
    });
  } catch (error) {
    console.error("❌ Error setting up remote audio:", error);
  }
}
```

### Issue: No Ringback Tone on Outbound Calls

**Symptoms:**

- Outbound calls connect successfully
- Call audio works once answered
- **No ringback tone** (silence) while call is ringing
- Asterisk RTP debug shows packets being sent to client
- Browser/Electron logs show "Provider stream is SILENT"

**Root Cause:**

Asterisk was sending its **private IP address** (`172.31.x.x`) in ICE candidates instead of the **public IP**, preventing WebRTC clients from receiving RTP packets (early media/ringback) through NAT.

**Solution: Configure RTP External Address**

Edit `/etc/asterisk/rtp.conf` to include proper NAT traversal settings:

```ini
[general]
rtpstart=10000
rtpend=20000

strictrtp=no
dtmfmode=auto
rtcpinterval=5000

; ✅ CRITICAL: ICE Support and External Address Configuration
icesupport=yes
stunaddr=stun.l.google.com:19302
externaddr=13.234.18.2           ; ← Your public IP
directmedia=no
bindaddr=0.0.0.0

; ✅ CRITICAL: ICE Host Candidates
ice_host_candidates=yes
ice_nomination=aggressive

; DTLS/SRTP Configuration
dtlsenable=yes
dtlsverify=no
dtlssetup=actpass
srtp_tag_32=yes
dtlscertfile=/etc/letsencrypt/live/cs.hugamara.com/fullchain.pem
dtlsprivatekey=/etc/letsencrypt/live/cs.hugamara.com/privkey.pem
```

**Apply Changes:**

```bash
# Restart Asterisk to apply RTP configuration
systemctl restart asterisk

# Or reload RTP module (may not work for all settings)
asterisk -rx "module reload res_rtp_asterisk"

# Verify external address is set
asterisk -rx "rtp show settings"
```

**Verify Fix:**

1. **Make a test outbound call from Electron/Chrome softphone**
2. **Check browser console for ICE logs:**

   ```
   [ICE] Connection State: checking
   [ICE] Performing connectivity checks...
   [ICE] Connection State: connected        ← Should show "connected"!
   ✅ ICE connection established successfully!
   [SIP] 🔊 Audio Level Check 1/6: avg=45.2, max=128  ← Audio data flowing!
   ```

3. **Enable RTP debug on Asterisk (optional):**
   ```bash
   asterisk -rvvv
   rtp set debug on
   # Make a call, you should see:
   # Got RTP packet from 41.77.78.155:XXXXX
   # Sent RTP packet to 102.214.151.191:XXXXX  ← Your client's public IP
   rtp set debug off
   ```

**Why This Works:**

- `externaddr`: Tells Asterisk to use public IP in SDP and ICE candidates
- `ice_host_candidates=yes`: Enables ICE candidate gathering
- `ice_nomination=aggressive`: Speeds up ICE connectivity checks
- `stunaddr`: Allows clients to discover their public IP via STUN
- Without these settings, Asterisk sends private IPs that clients cannot reach through NAT

**Related Configuration:**

Also ensure your `pjsip.conf` transport has correct NAT settings:

```ini
[transport-ws]
type=transport
protocol=ws
bind=0.0.0.0:8088
external_media_address=13.234.18.2
external_signaling_address=13.234.18.2
local_net=172.31.0.0/16           ; ← NOT 0.0.0.0/0 (see note below)

[transport-wss]
type=transport
protocol=wss
bind=0.0.0.0:8089
external_media_address=13.234.18.2
external_signaling_address=13.234.18.2
local_net=172.31.0.0/16           ; ✅ CRITICAL: Define only your VPC as local
```

**⚠️ Important:** Setting `local_net=0.0.0.0/0` tells Asterisk ALL networks are "local", so it never uses external addresses. Change it to your actual private subnet (e.g., `172.31.0.0/16` for AWS VPC).

### Audio Troubleshooting Checklist

**For One-Way Audio Issues:**

1. **Check Console Logs**: Look for `🎵`, `🔊`, `🧊` emoji logs in browser console
2. **Verify Track Events**: Ensure `track` events are being received
3. **Check Audio Element**: Verify `#sipjs-remote-audio` element exists and has `srcObject`
4. **Test Autoplay**: Look for "NotAllowedError" and click the notification if it appears
5. **ICE Connection**: Ensure ICE connection reaches "connected" state

**For No Ringback Tone:**

1. **Check Asterisk RTP Config**: Verify `externaddr` is set to public IP
2. **Verify ICE Settings**: Ensure `ice_host_candidates=yes` and `ice_nomination=aggressive`
3. **Check Transport Config**: Verify `external_media_address` in `pjsip.conf`
4. **Test with RTP Debug**: Enable RTP debugging to see packet flow

**Common Audio Issues & Solutions:**

| Issue                | Symptoms                           | Solution                                            |
| -------------------- | ---------------------------------- | --------------------------------------------------- |
| **One-way audio**    | Can hear them, they can't hear you | Check track event handling and MediaStream creation |
| **No ringback**      | Silence during call ringing        | Configure Asterisk `externaddr` and ICE settings    |
| **Autoplay blocked** | Audio doesn't start automatically  | Click the notification or enable audio manually     |
| **No audio at all**  | Complete silence                   | Check ICE connection state and audio element setup  |
| **Audio cuts out**   | Audio starts then stops            | Check track state monitoring and error handling     |

## 🛠️ Development

### Available Scripts

```bash
# Start both services
npm run callcenter

# Install dependencies
npm run callcenter:install

# Start individual services
npm run callcenter:backend
npm run callcenter:frontend
```

### Database Management

```bash
# Sync database schema
cd mayday/slave-backend
node scripts/sync-db.js

# Check database connection
cd mayday/slave-backend
node -e "import('./config/sequelize.js').then(db => db.sequelize.authenticate().then(() => console.log('✅ Database connected')).catch(err => console.error('❌ Database error:', err)))"
```

#### Running Database Migrations Manually

Due to a custom programmatic setup in `config/sequelize.js`, the standard `npx sequelize-cli db:migrate` command will fail because it cannot find a `config/config.json` file.

To run a migration, you must use a custom script.

**1. Create a Runner Script**

Create a temporary file in the `mayday/slave-backend/` directory (e.g., `run-migration.mjs`):

```javascript
// run-migration.mjs
import { sequelize } from "./config/sequelize.js";

// Use a dynamic import for the migration file, as it is a CommonJS module
const migration = await import(
  "./migrations/20250924180000-add-qualify-fields-to-ps-contacts.js"
);

import pkg from "sequelize";
const { Sequelize } = pkg;

const { up } = migration;

async function runMigration() {
  const queryInterface = sequelize.getQueryInterface();
  console.log("Starting migration...");
  try {
    await up(queryInterface, Sequelize);
    console.log("Migration completed successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

runMigration();
```

**2. Run the Script**

Execute the script from within the `mayday/slave-backend` directory on the server:

```bash
node --experimental-specifier-resolution=node run-migration.mjs
```

**3. Reliable Fallback: Direct SQL**

If Node.js scripting fails due to environment issues, the most reliable method is to apply the change with a direct SQL command.

```bash
# Example for adding a column
ssh -i <your-key.pem> admin@<your-server-ip> "sudo mysql -uroot asterisk -e \"ALTER TABLE ps_contacts ADD COLUMN qualify_2xx_only ENUM('yes', 'no') NOT NULL DEFAULT 'no';\""
```

#### Troubleshooting: ER_TOO_MANY_KEYS (Duplicate Indexes)

If you encounter the error `ER_TOO_MANY_KEYS (1069): Too many keys specified; max 64 keys allowed` during database sync, it means a table has accumulated duplicate unique indexes from repeated syncs with older model definitions. This has been observed on `dialplan_contexts` (`name` column) and `client_session` (`session_token` column).

**Fix (run on the VM as root):**

```bash
# This script drops all extra indexes on the specified column and ensures a single, named unique index exists.
# --- Fix for dialplan_contexts ---
DB=asterisk
TBL=dialplan_contexts
COL=name
mysql -uroot -N -e "SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA='${DB}' AND TABLE_NAME='${TBL}' AND COLUMN_NAME='${COL}' AND INDEX_NAME NOT IN ('PRIMARY', 'ux_${TBL}_${COL}');" | while read idx; do
  if [ -n "$idx" ]; then
    echo "Dropping index: $idx from ${TBL}"
    mysql -uroot "$DB" -e "ALTER TABLE ${TBL} DROP INDEX \`$idx\`"
  fi
done
mysql -uroot "${DB}" -e "CREATE UNIQUE INDEX ux_${TBL}_${COL} ON ${TBL} (${COL});" || echo "Index on ${TBL} already exists or failed."

# --- Fix for client_session ---
TBL=client_session
COL=session_token
mysql -uroot -N -e "SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA='${DB}' AND TABLE_NAME='${TBL}' AND COLUMN_NAME='${COL}' AND INDEX_NAME <> 'PRIMARY';" | while read idx; do
  if [ -n "$idx" ]; then
    echo "Dropping index: $idx from ${TBL}"
    mysql -uroot "$DB" -e "ALTER TABLE ${TBL} DROP INDEX \`$idx\`"
  fi
done
mysql -uroot "${DB}" -e "CREATE UNIQUE INDEX ux_${TBL}_${COL} ON ${TBL} (${COL}(255));" || echo "Index on ${TBL} already exists or failed."

# Verify final indexes
echo "--- Final indexes for dialplan_contexts ---"
mysql -uroot "${DB}" -e "SHOW INDEX FROM dialplan_contexts;"
echo "--- Final indexes for client_session ---"
mysql -uroot "${DB}" -e "SHOW INDEX FROM client_session;"
```

### Asterisk Configuration

The system includes scripts to configure Asterisk on your EC2 server:

```bash
# On EC2 server
sudo ./mayday/slave-backend/scripts/setup-asterisk-config.sh
```

## 🔐 Security

### Authentication

- JWT-based authentication for API access
- Session management via Redis
- Role-based access control (Admin, Agent, Manager)

### Network Security

- AMI access restricted to specific IP ranges
- HTTPS support for production deployments
- CORS configuration for cross-origin requests

### External Integrations

#### Trunk Provider Integration

The call center system integrates with external trunk providers for call validation and account management:

**Configuration:**

- **Auth Header**: Base64 encoded credentials for API authentication
- **Validate URL**: Endpoint for account balance and validation checks
- **Environment Variables**: Configured in both development (.env) and production (ecosystem.config.js)

**Usage Example:**

```bash
curl --location 'https://ug.cyber-innovative.com:444/cyber-api/cyber_validate.php' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--header 'Authorization: Basic MDMyMDAwMDAwODoxMy4yMzQuMTguMg==' \
--data-urlencode 'account=0320000008' \
--data-urlencode 'BALANCE=BALANCE'
```

**Environment Configuration:**

- **Development**: Set in `mayday/slave-backend/.env`
- **Production**: Set in `ecosystem.config.js` for PM2 management

**API Integration:**

```javascript
// In your backend code
const authHeader = process.env.TRUNK_PROVIDER_AUTH_HEADER;
const validateUrl = process.env.TRUNK_PROVIDER_VALIDATE_URL;

const response = await fetch(validateUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    Authorization: `Basic ${authHeader}`,
  },
  body: new URLSearchParams({
    account: "0320000008",
    BALANCE: "BALANCE",
  }),
});
```

#### Chrome Extension Multi-Tenant Configuration

The Chrome extension supports dynamic multi-tenant configuration:

**Features:**

- **Dynamic URL Detection**: Automatically detects current domain and generates appropriate API endpoints
- **Tenant-Specific API Paths**: Uses `/mayday-api` for Hugamara domains, `/api` for others
- **CORS-Friendly**: Each tenant uses their own domain, eliminating cross-origin issues
- **No Hardcoded URLs**: All endpoints are generated dynamically based on current origin

**Configuration Priority:**

1. Stored host URL (from Chrome storage)
2. Current origin (detected from window.location)
3. Environment variables
4. Dynamic fallback based on current origin

**Usage:**

```javascript
// The extension automatically detects the current domain
// For https://cs.hugamara.com → uses /mayday-api endpoints
// For https://client1.example.com → uses /api endpoints

// Health check example:
const endpoints = await config.getDynamicEndpoints();
const response = await fetch(endpoints.users.systemHealth, {
  method: "GET",
  signal: AbortSignal.timeout(5000),
});
```

## 📩 SMS Integration

The Call Center now supports outbound SMS via an external provider and a built-in UI in the Electron softphone.

### Provider

- Default provider: Cyber Innovative SMS
- Base URL: `https://sms.cyber-innovative.com/secure`
- Optional Override IP (when DNS fails): `41.77.78.156`

### Backend Configuration (Production)

Add these variables to the `mayday-callcenter-backend` app in `ecosystem.config.js`:

```js
// SMS Provider Configuration
SMS_PROVIDER_BASE_URL: "https://sms.cyber-innovative.com/secure",
SMS_PROVIDER_OVERRIDE_IP: "41.77.78.156",     // optional; for DNS issues
SMS_PROVIDER_STRICT_TLS: "false",             // "true" if NOT using override IP
// Use either USER/PASS or AUTH header (prefer user/pass)
SMS_PROVIDER_USERNAME: "medhi",
SMS_PROVIDER_PASSWORD: "Lusuku@#2025!",
// Alternatively:
// SMS_PROVIDER_AUTH: "Basic bWVkaGk6THVzdWt1QCMyMDI1IQ==",
SMS_DEFAULT_SENDER: "Hugamara",
SMS_DLR_URL: "https://cs.hugamara.com/api/sms/dlr",
```

Notes:

- Use one authentication method only: Username/Password, or `SMS_PROVIDER_AUTH`.
- If DNS works on the server, omit `SMS_PROVIDER_OVERRIDE_IP` and set `SMS_PROVIDER_STRICT_TLS` to `"true"`.

### Backend Configuration (Development)

- Dashboard API client points to `http://localhost:8004/api` automatically when accessed on `localhost`.
- Delivery Report (DLR) URL in dev: `http://localhost:8004/api/sms/dlr`.

### Runtime Configuration (Dashboard)

You can configure the provider at runtime in the Call Center Dashboard:

- Navigate: `Integrations → SMS`
- Fields:
  - Base URL
  - Override IP (optional)
  - Strict TLS (enable if no Override IP)
  - Auth Header (Basic ...) or Username/Password
  - Default Sender
  - DLR URL (dev/prod values above)
- Actions:
  - Save Configuration
  - Check Balance

Internally, the runtime config is stored in Redis (`key: sms_provider_config`). If this key exists, it overrides environment variables. To revert to env values in production:

```bash
redis-cli DEL sms_provider_config
pm2 restart mayday-callcenter-backend
```

### API Endpoints (Backend)

- `POST /api/sms/send` — Send an SMS
- `GET  /api/sms/balance` — Provider balance (admin)
- `GET  /api/sms/providers` — Provider metadata (admin)
- `GET  /api/sms/config` — Get current configuration (admin)
- `PUT|POST /api/sms/config` — Update runtime configuration (admin)
- `POST /api/sms/dlr` — Delivery Report webhook (public)
- `GET  /api/sms/conversations` — List SMS conversations (latest per partner)
- `GET  /api/sms/conversations/:phoneNumber` — Messages for a phone number

### cURL Examples

Send SMS:

```bash
curl --location 'https://sms.cyber-innovative.com/secure/send' \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Basic bWVkaGk6THVzdWt1QCMyMDI1IQ==' \
  --data '{
    "to":"+256700771301",
    "from":"Hugamara",
    "content":"This is a test message from Hugamara Mayday",
    "dlr":"yes",
    "dlr-url":"https://cs.hugamara.com/api/sms/dlr",
    "dlr-level":3
  }'
```

Check Balance:

```bash
curl --location 'https://sms.cyber-innovative.com/secure/balance' \
  --header 'Authorization: Basic bWVkaGk6THVzdWt1QCMyMDI1IQ=='
```

If DNS fails, temporarily resolve via IP and Host override (example):

```bash
curl --location 'https://sms.cyber-innovative.com/secure/send' \
  --resolve 'sms.cyber-innovative.com:443:41.77.78.156' \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Basic bWVkaGk6THVzdWt1QCMyMDI1IQ==' \
  --data '{"to":"+256700771301","from":"Hugamara","content":"Test","dlr":"yes"}'
```

### Electron Softphone – SMS UI

- New sidebar item: **SMS**
- Features:
  - List conversations (latest message per partner)
  - View thread and send messages
  - Messages persist to the database (`SmsMessages` table)
  - Delivery status updates via DLR handler

### Data Model

`SmsMessage` (MySQL):

- `id` (UUID, PK)
- `providerMessageId` (string, nullable)
- `fromNumber` (string)
- `toNumber` (string)
- `content` (text)
- `direction` (`inbound` | `outbound`)
- `status` (`queued` | `sent` | `delivered` | `failed` | `received` | `undelivered`)
- `createdAt` / `updatedAt`

### Troubleshooting

- 404 on saving config: ensure backend accepts `PUT`/`POST /api/sms/config` and the dashboard points to the correct base URL.
- HTML returned instead of JSON on balance: verify the dashboard API base resolves to the backend (`http://localhost:8004/api` in dev) and not the React app.
- TLS/Host issues: when using Override IP, set `Strict TLS` to `false` or configure proper certificates for the IP/Host combination.

## 🚀 Deployment

### Production Setup

1. **Configure Environment Variables**

   - Update `.env` files with production values
   - Set secure JWT secrets and session keys
   - Configure production database credentials

2. **Set up Asterisk on EC2 server**

   - Install Asterisk and required modules
   - Configure AMI access and permissions
   - Set up ODBC connections for database integration

3. **Configure ODBC connections**

   - Install MariaDB ODBC drivers
   - Configure `odbc.ini` and `odbcinst.ini`
   - Test database connectivity

4. **Set up reverse proxy (nginx)**

   - Configure SSL termination
   - Set up load balancing if needed
   - Configure CORS and security headers
   - **Important**: Ensure nginx is configured to serve React app at `/callcenter/` path with proper static asset routing

5. **Configure SSL certificates**

   - Obtain valid SSL certificates
   - Configure HTTPS for all services
   - Set up certificate auto-renewal

6. **Set up monitoring and logging**
   - Configure log rotation
   - Set up health checks
   - Monitor AMI connections and database performance

### Production URL Structure

The production deployment uses a specific URL structure:

- **Main Dashboard**: `https://cs.backspace.ug/callcenter/`
- **API Endpoints**: `https://cs.backspace.ug/mayday-api/api/`
- **WebSocket**: `wss://cs.backspace.ug/socket.io/`

### Deployment Scripts

Use the provided deployment scripts for automated deployment:

```bash
# Full deployment
./deploy-on-vm.sh

# Quick fix for routing issues
./fix-static-assets.sh
```

### React App Configuration

The React app is configured with:

- `homepage: "/callcenter/"` in `package.json`
- `basename="/callcenter"` in `App.jsx`
- Nginx serves static assets from `/static/` path
- Proper SPA routing with `try_files` directives

## 🔧 Troubleshooting

### Common Issues

#### Production Deployment Issues

**Blank White Screen in Production:**

- Check if React app has correct `homepage: "/callcenter/"` in `package.json`
- Verify nginx is configured to serve static assets from `/static/` path
- Ensure nginx has proper `try_files` directives for SPA routing
- Check browser console for 404 errors on static assets

**Static Assets Not Loading (404 errors):**

- Verify nginx location blocks for `/static/` and individual assets
- Check file permissions on build directory (`chown -R www-data:www-data build/`)
- Ensure build directory exists and contains `index.html`

**API Calls Failing:**

- Verify backend is running on port 5001
- Check nginx proxy configuration for `/mayday-api/api/` path
- Test backend health endpoint: `curl https://cs.backspace.ug/mayday-api/api/system/health`

#### Port Conflicts

```bash
# Check what's using ports
lsof -i :3000 -i :3002 -i :8000 -i :8004

# Kill conflicting processes
pkill -f "react-scripts start"
pkill -f "node server.js"
```

#### Database Connection Issues

```bash
# Test database connection
cd mayday/slave-backend
node -e "import('./config/sequelize.js').then(db => db.sequelize.authenticate())"
```

#### AMI Connection Issues

- Verify Asterisk server is running on EC2
- Check AMI credentials in `.env`
- Ensure your IP is whitelisted in `manager.conf`

#### JWT Secret Errors

- Ensure `JWT_SECRET` is set in `.env`
- Verify secret is long enough (minimum 32 characters)
- Restart the backend after changing secrets

### Development Mode Features

- **Automatic License Fallback**: Creates development license when master server unavailable
- **Error Resilience**: Server continues running despite AMI connection failures
- **WebSocket Reconnection**: Automatic reconnection to frontend clients
- **Session Cleanup**: Automatic cleanup of expired sessions and orphaned data

---

**Note**: This call center system is designed to work alongside the main Hugamara hospitality management system, providing a complete solution for both hospitality operations and customer service management.
