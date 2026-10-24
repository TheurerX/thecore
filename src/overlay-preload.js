const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onTelemetryUpdate: (callback) => {
    ipcRenderer.on('overlay-telemetry', (_event, data) => callback(data));
  }
});
