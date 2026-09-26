import { app, BrowserWindow, ipcMain, session } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    minWidth: 300,
    minHeight: 400,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: true,
      contextIsolation: false,
    },
    // titleBarStyle: 'hidden',
  });

  mainWindow.webContents.openDevTools();

  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['https://api.openai.com/*', 'wss://api.openai.com/*'] },
    (details, callback) => {
      let protocolKey = Object.keys(details.requestHeaders).find(k => k.toLowerCase() === 'sec-websocket-protocol');
      let protocols = protocolKey ? details.requestHeaders[protocolKey] : '';
      let apiKeyMatch = protocols.match(/api-key-([^,]+)/);
      if (apiKeyMatch) {
        let apiKey = apiKeyMatch[1].trim();
        details.requestHeaders['Authorization'] = `Bearer ${apiKey}`;
        details.requestHeaders['OpenAI-Beta'] = 'realtime=v1';
        
        let newProtocols = protocols
          .split(',')
          .map(p => p.trim())
          .filter(p => !p.startsWith('api-key-'))
          .join(', ');
          
        if (newProtocols) {
            details.requestHeaders[protocolKey as string] = newProtocols;
        } else {
            delete details.requestHeaders[protocolKey as string];
        }
      }
      callback({ requestHeaders: details.requestHeaders });
    }
  );

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true);
  });
  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    return true;
  });
  session.defaultSession.setDevicePermissionHandler((details) => {
    return true;
  });

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

ipcMain.on('resize-window', (event, { width, height }) => {
  if (mainWindow) {
    mainWindow.setSize(width, height, true);
  }
});
