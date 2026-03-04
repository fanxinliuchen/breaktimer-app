import { app, shell } from "electron";
import electronDebug from "electron-debug";
import log from "electron-log";
import { autoUpdater } from "electron-updater";
import path from "node:path";
import { setAutoLauch } from "./lib/auto-launch";
import { initBreaks } from "./lib/breaks";
import "./lib/ipc";
import { showNotification } from "./lib/notifications";
import { getAppInitialized } from "./lib/store";
import { initTray } from "./lib/tray";
import {
  createSettingsWindow,
  createSoundsWindow,
  createWelcomeWindow,
} from "./lib/windows";

const RELEASE_REPO_URL =
  "https://github.com/fanxinliuchen/breaktimer-app/releases/latest";

function isWindowsPortableBuild(): boolean {
  return process.platform === "win32" && !!process.env.PORTABLE_EXECUTABLE_DIR;
}

function configurePortableRuntime(): void {
  if (!isWindowsPortableBuild()) {
    return;
  }

  const portableDataDir = path.join(
    process.env.PORTABLE_EXECUTABLE_DIR as string,
    "BreakTimerData",
  );

  // Keep portable settings/logs isolated from installed app data.
  app.setPath("userData", portableDataDir);
  log.info(`Portable mode enabled. userData path: ${portableDataDir}`);
}

configurePortableRuntime();

const gotTheLock = app.requestSingleInstanceLock();

app.on("second-instance", (event, commandLine, workingDirectory) => {
  log.info("Second instance detected, opening welcome window");
  log.info(`Command line: ${commandLine}`);
  log.info(`Working directory: ${workingDirectory}`);
  createWelcomeWindow();
});

app.on("activate", () => {
  log.info("App activated, opening welcome window");
  createWelcomeWindow();
});

if (!gotTheLock) {
  log.info("App already running");
  app.exit();
}

function getDownloadUrl(): string {
  switch (process.platform) {
    case "win32":
      return `${RELEASE_REPO_URL}/download/BreakTimer-Setup.exe`;
    case "linux":
      return RELEASE_REPO_URL;
    default:
      throw new Error("Download URL should not be called for macOS");
  }
}

function shouldAutoInstall(): boolean {
  const isMac = process.platform === "darwin";
  const isLinux = process.platform === "linux";

  return isMac || isLinux;
}

function shouldCheckForUpdates(): boolean {
  if (process.env.NODE_ENV === "development") {
    return false;
  }

  // Portable Windows builds should not self-update into installed binaries.
  if (isWindowsPortableBuild()) {
    return false;
  }

  return true;
}

function checkForUpdates(): void {
  log.info("Checking for updates...");
  autoUpdater.logger = log;

  autoUpdater.on("error", (error) => {
    log.error(`Auto updater error: ${error}`);
  });

  if (shouldAutoInstall()) {
    autoUpdater.checkForUpdatesAndNotify().catch((error) => {
      log.error(`Unable to run auto updater: ${error}`);
    });
  } else {
    autoUpdater.autoDownload = false;

    autoUpdater.on("update-available", (info) => {
      log.info("Update available:", info);

      const downloadUrl = getDownloadUrl();

      showNotification(
        "Update Available",
        "A new version of BreakTimer is available. Click to download.",
        () => {
          shell.openExternal(downloadUrl).catch((error) => {
            log.error(`Failed to open download URL: ${error}`);
          });
        },
        false,
      );
    });

    autoUpdater.checkForUpdates().catch((error) => {
      log.error(`Unable to check for updates: ${error}`);
    });
  }
}

if (process.env.NODE_ENV === "production") {
  const sourceMapSupport = require("source-map-support");
  sourceMapSupport.install();
}

if (
  process.env.NODE_ENV === "development" ||
  process.env.DEBUG_PROD === "true"
) {
  electronDebug();
}

// function installExtensions() {
//   const installer = require('electron-devtools-installer')
//   const forceDownload = !!process.env.UPGRADE_EXTENSIONS
//   const extensions = ['REACT_DEVELOPER_TOOLS']
//
//   return Promise.all(
//     extensions.map(name => installer.default(installer[name], forceDownload))
//   ).catch(console.log)
// }

// Don't exit on close all windows - live in tray
app.on("window-all-closed", () => {
  // Pass
});

app.on("ready", async () => {
  if (
    process.env.NODE_ENV === "development" ||
    process.env.DEBUG_PROD === "true"
  ) {
    // Extensions are broken on electron 10
    // await installExtensions()
  }

  // Required for notifications to work on windows
  if (process.platform === "win32") {
    app.setAppUserModelId("com.tomjwatson.breaktimer");
  }

  if (process.platform === "darwin") {
    app.dock?.hide();
  }

  const appInitialized = getAppInitialized();

  if (!appInitialized) {
    if (process.env.NODE_ENV !== "development") {
      setAutoLauch(true);
    }
    // First launch: show settings and onboarding.
    createSettingsWindow();
  } else {
    // Subsequent launches: show welcome window directly.
    createWelcomeWindow();
  }

  initBreaks();
  initTray();
  createSoundsWindow();

  if (shouldCheckForUpdates()) {
    checkForUpdates();
  }
});
