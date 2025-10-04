// electron/main.dev.js
import { app, BrowserWindow } from "electron";
import installExtension, { REDUX_DEVTOOLS } from "electron-devtools-installer";
// import path from "path";

async function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      autoplayPolicy: "no-user-gesture-required",
    },
  });

  // Install DevTools extensions
  if (process.env.NODE_ENV === "development") {
    try {
      await installExtension(REDUX_DEVTOOLS);
      console.log("Redux DevTools installed successfully");

      // Open DevTools automatically
      mainWindow.webContents.openDevTools();
    } catch (err) {
      console.log("Error installing Redux DevTools: ", err);
    }
  }

  // Load the app
  mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
}

app.whenReady().then(createWindow);
