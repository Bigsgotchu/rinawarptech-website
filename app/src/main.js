const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');

// Keep a global reference of the window object
let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Load index.html
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Mock terminal data
  let mockInput = '';
  const mockPrompt = '> ';

  // Send initial prompt
  setTimeout(() => {
    mainWindow.webContents.send('terminal-data', mockPrompt);
  }, 100);

  // Handle IPC messages
  ipcMain.on('terminal-input', (event, data) => {
    if (data.content === '\r') {
      // Handle Enter key
      mainWindow.webContents.send('terminal-data', '\r\n');
      if (mockInput.trim()) {
        mainWindow.webContents.send('terminal-data', `Command entered: ${mockInput}\r\n`);
      }
      mockInput = '';
      mainWindow.webContents.send('terminal-data', mockPrompt);
    } else if (data.content === '\u007f') {
      // Handle Backspace
      if (mockInput.length > 0) {
        mockInput = mockInput.slice(0, -1);
        mainWindow.webContents.send('terminal-data', '\b \b');
      }
    } else {
      // Echo other characters
      mockInput += data.content;
      mainWindow.webContents.send('terminal-data', data.content);
    }
  });
}

// Create window when app is ready
app.whenReady().then(createWindow);

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
