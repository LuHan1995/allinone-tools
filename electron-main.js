const { app, BrowserWindow, shell, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function getSerialAssistantPath() {
  // In development: ref/串口助手.exe
  // In portable: resources/ref/串口助手.exe (next to exe) or inside app.asar.unpacked
  const devPath = path.join(__dirname, 'ref', '串口助手.exe');
  if (fs.existsSync(devPath)) {
    return devPath;
  }
  // In production, extraResources are placed beside the executable
  const prodPath = path.join(process.resourcesPath, 'ref', '串口助手.exe');
  if (fs.existsSync(prodPath)) {
    return prodPath;
  }
  // Fallback: relative to exe location
  const exeDir = path.dirname(app.getPath('exe'));
  const portablePath = path.join(exeDir, 'ref', '串口助手.exe');
  if (fs.existsSync(portablePath)) {
    return portablePath;
  }
  return null;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'electron-preload.js')
    },
    show: false,
    title: '鲁工不要慌工具箱'
  });

  // Remove default menu for cleaner look
  Menu.setApplicationMenu(null);

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (process.argv.includes('--dev')) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Open external links in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      event.preventDefault();
      return;
    }
    const appBase = app.getAppPath().replace(/\\/g, '/');
    const isLocalFile = parsedUrl.protocol === 'file:';
    if (isLocalFile) {
      const filePath = decodeURIComponent(parsedUrl.pathname).replace(/\//g, '/');
      // On Windows, pathname starts with /C:/... so normalize
      const normalized = filePath.replace(/^\//, '').replace(/^([a-zA-Z]:)/, '$1');
      const appNormalized = appBase.replace(/^\//, '').replace(/^([a-zA-Z]:)/, '$1');
      if (!normalized.toLowerCase().startsWith(appNormalized.toLowerCase())) {
        event.preventDefault();
      }
      return;
    }
    // Allow http(s) localhost for devtools or similar
    const isLocalhost = parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1';
    if (!isLocalhost) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers
ipcMain.handle('get-serial-path', () => {
  return getSerialAssistantPath();
});

ipcMain.handle('open-serial', async () => {
  const serialPath = getSerialAssistantPath();
  if (serialPath && fs.existsSync(serialPath)) {
    try {
      await shell.openPath(serialPath);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
  return { success: false, error: '未找到串口助手程序' };
});

ipcMain.handle('show-serial-not-found', async () => {
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    title: '串口助手',
    message: '未找到串口助手可执行文件',
    detail: '请确保 ref/串口助手.exe 存在。',
    buttons: ['确定']
  });
  return result;
});
