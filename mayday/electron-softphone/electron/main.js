const electron = require("electron");
const { app, BrowserWindow, ipcMain, session } = electron;
const path = require("path");

let mainWindow = null;
let appbarWindow = null;
let isLoadingUrl = false;

const PROD_URL = "https://cs.hugamara.com";
// VERY IMPORTANT TO GET CONSOLE LOGS IN THE TERMINAL
// Forward renderer console messages to main process stdout so they appear in the terminal
function forwardRendererConsole(win, label = "window") {
  if (!win || !win.webContents) return;

  win.webContents.on(
    "console-message",
    (_event, level, message, line, sourceId) => {
      const location = sourceId ? ` (${sourceId}:${line})` : "";
      const prefix = `[renderer:${label}]`;
      if (level === 2) {
        console.error(`${prefix} ${message}${location}`);
      } else if (level === 1) {
        console.warn(`${prefix} ${message}${location}`);
      } else {
        console.log(`${prefix} ${message}${location}`);
      }
    }
  );

  // Optional: log crashes and load failures to terminal as well
  win.webContents.on("render-process-gone", (_event, details) => {
    console.error(`[renderer:${label}] process gone: ${details.reason}`);
  });
  win.webContents.on(
    "did-fail-load",
    (_event, errorCode, errorDescription, validatedURL) => {
      console.error(
        `[renderer:${label}] failed to load ${
          validatedURL || ""
        }: ${errorCode} ${errorDescription}`
      );
    }
  );
}

// Add IPC handler for the URL preference
ipcMain.handle("get-url-preference", () => {
  return {
    useRemoteUrl: global.useRemoteUrl ?? false,
  };
});

// Modify this handler to reload the window
ipcMain.on("set-url-preference", (event, useRemoteUrl) => {
  if (isLoadingUrl) return;
  isLoadingUrl = true;

  global.useRemoteUrl = useRemoteUrl;

  // If switching from remote to local
  if (!useRemoteUrl && mainWindow) {
    const localUrl =
      process.env.NODE_ENV === "development"
        ? "http://localhost:5173"
        : path.join(__dirname, "../dist/index.html");

    if (process.env.NODE_ENV === "development") {
      mainWindow.loadURL(localUrl).finally(() => {
        isLoadingUrl = false;
      });
    } else {
      mainWindow.loadFile(localUrl);
      isLoadingUrl = false;
    }
  }
  // If switching from local to remote
  else if (useRemoteUrl && mainWindow) {
    session.defaultSession
      .clearStorageData({
        storages: ["cookies", "localstorage"],
      })
      .then(() => {
        mainWindow.loadURL(`${PROD_URL}`).finally(() => {
          isLoadingUrl = false;
        });
      })
      .catch(() => {
        isLoadingUrl = false;
      });
  }

  if (appbarWindow) {
    if (useRemoteUrl) {
      appbarWindow.loadURL(`${PROD_URL}/#/appbar`);
    } else {
      const localUrl =
        process.env.NODE_ENV === "development"
          ? "http://localhost:5173/#/appbar"
          : path.join(__dirname, "../dist/index.html");

      if (process.env.NODE_ENV === "development") {
        appbarWindow.loadURL(localUrl);
      } else {
        appbarWindow.loadFile(localUrl, {
          hash: "appbar",
        });
      }
    }
  }
});

function createLoginWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      autoplayPolicy: "no-user-gesture-required",
    },
  });

  forwardRendererConsole(mainWindow, "login");

  // Load based on preference regardless of environment
  if (global.useRemoteUrl) {
    mainWindow.loadURL(`${PROD_URL}`);
  } else {
    // Load local development server or built files
    const localUrl =
      process.env.NODE_ENV === "development"
        ? "http://localhost:5173"
        : path.join(__dirname, "../dist/index.html");

    if (process.env.NODE_ENV === "development") {
      mainWindow.loadURL(localUrl);
      mainWindow.webContents.openDevTools();
    } else {
      mainWindow.loadFile(localUrl);
    }
  }
}

function createAppbarWindow() {
  if (mainWindow) {
    mainWindow.close();
    mainWindow = null;
  }

  appbarWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      webSocketProtocols: ["sip", "wss", "ws"],
      allowRunningInsecureContent: true,
      autoplayPolicy: "no-user-gesture-required",
    },
  });

  forwardRendererConsole(appbarWindow, "appbar");

  // Load based on preference regardless of environment
  if (global.useRemoteUrl) {
    appbarWindow.loadURL(`${PROD_URL}/#/appbar`);
  } else {
    // Load local development server or built files
    const localUrl =
      process.env.NODE_ENV === "development"
        ? "http://localhost:5173/#/appbar"
        : path.join(__dirname, "../dist/index.html");

    if (process.env.NODE_ENV === "development") {
      appbarWindow.loadURL(localUrl);
      appbarWindow.webContents.openDevTools();
    } else {
      appbarWindow.loadFile(localUrl, {
        hash: "appbar",
      });
    }
  }
}

// Handle IPC messages
ipcMain.on("navigate", (event, route) => {
  if (route === "appbar") {
    createAppbarWindow();
  }
});

app.whenReady().then(createLoginWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createLoginWindow();
  }
});
