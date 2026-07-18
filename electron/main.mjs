import { app, BrowserWindow } from "electron";
import { join } from "node:path";
import { startServer } from "../server.js";

let mainWindow;
let serverHandle;
let serverReady;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 820,
    backgroundColor: "#eef2f5",
    title: "DreamTools",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  await mainWindow.loadURL(`http://127.0.0.1:${serverHandle.port}`);
}

app.whenReady().then(async () => {
  process.env.DREAMTOOLS_CONFIG_PATH = join(app.getPath("userData"), "settings.json");
  serverReady = startServer(process.env.PORT ? Number(process.env.PORT) : 5177);
  serverHandle = await serverReady;
  await createWindow();
});

app.on("window-all-closed", async () => {
  if (process.platform !== "darwin") {
    if (serverHandle?.server) {
      await new Promise((resolve) => serverHandle.server.close(resolve));
    }
    app.quit();
  }
});

app.on("activate", async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    if (!serverHandle && serverReady) {
      serverHandle = await serverReady;
    }
    await createWindow();
  }
});
