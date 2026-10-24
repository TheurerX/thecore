const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Python Engine RPC
  getHardware: () => ipcRenderer.invoke('get-hardware'),
  getLiveMetrics: () => ipcRenderer.invoke('get-live-metrics'),
  runOptimization: () => ipcRenderer.invoke('run-optimization'),
  getOptimizationAnalysis: () => ipcRenderer.invoke('get-optimization-analysis'),
  getStartupItems: () => ipcRenderer.invoke('get-startup-items'),
  toggleStartupItem: (name, enable) => ipcRenderer.invoke('toggle-startup-item', { name, enable }),
  getUpgradeRecommendations: () => ipcRenderer.invoke('get-upgrade-recommendations'),
  getSystemRating: () => ipcRenderer.invoke('get-system-rating'),
  runSystemAssessment: () => ipcRenderer.invoke('run-system-assessment'),
  getOsInfo: () => ipcRenderer.invoke('get-os-info'),

  // Clean Uninstaller & Force Removal
  getInstalledApps: () => ipcRenderer.invoke('get-installed-apps'),
  getAppIcon: (filePath) => ipcRenderer.invoke('get-app-icon', filePath),
  scanAppResiduals: (app) => ipcRenderer.invoke('scan-app-residuals', app),
  deleteResiduals: (items) => ipcRenderer.invoke('delete-residuals', items),
  runStandardUninstall: (app) => ipcRenderer.invoke('run-standard-uninstall', app),
  forceRemoveApp: (app) => ipcRenderer.invoke('force-remove-app', app),

  // TheCore Autostart Management
  getAutostartStatus: () => ipcRenderer.invoke('get-autostart-status'),
  setAutostart: (enable) => ipcRenderer.invoke('set-autostart', enable),

  // Post-install / update EULA notification
  checkPostInstallEula: () => ipcRenderer.invoke('check-post-install-eula'),
  clearPostInstallEula: () => ipcRenderer.invoke('clear-post-install-eula'),

  // In-Game Overlay (HUD)
  toggleOverlay: () => ipcRenderer.invoke('toggle-overlay'),
  setOverlayVisible: (visible) => ipcRenderer.invoke('set-overlay-visible', visible),
  setOverlayPosition: (pos) => ipcRenderer.invoke('set-overlay-position', pos),
  getOverlayStatus: () => ipcRenderer.invoke('get-overlay-status'),
  onOverlayStatusChanged: (callback) => {
    ipcRenderer.on('overlay-status-changed', (_event, enabled) => callback(enabled));
  },

  // Engine Event Stream
  onEngineEvent: (callback) => {
    ipcRenderer.on('engine-event', (event, data) => callback(data));
  },

  // Shell Window Controls
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  hideToTray: () => ipcRenderer.send('window-hide-to-tray'),
  closeApp: () => ipcRenderer.send('window-close-app'),

  // Listeners from Main Process (Tray / Close requests)
  onRequestClose: (callback) => {
    ipcRenderer.on('request-close-confirm', () => callback());
  },
  onTriggerQuickBoost: (callback) => {
    ipcRenderer.on('trigger-quick-boost', () => callback());
  }
});
