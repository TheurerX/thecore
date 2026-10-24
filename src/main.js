const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, dialog, globalShortcut, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { spawn } = require('child_process');
const readline = require('readline');

// Мастер-ключ закрытого криптографического протокола TheCore IPC
const THECORE_IPC_SECRET = 'TheCore_Secure_Kernel_Key_2026_AntiTamper_V3';
let isEngineAuthenticated = false;
let engineAuthDeferred = null;

let mainWindow = null;
let tray = null;
let pythonProcess = null;
let isQuitting = false;
let pendingRequests = new Map();
let requestIdCounter = 1;

// Поиск пути к python executable
function getPythonCommand() {
  if (process.platform === 'win32') {
    const localPy = path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python312', 'python.exe');
    const fs = require('fs');
    if (fs.existsSync(localPy)) {
      return localPy;
    }
  }
  return 'python';
}

function performHandshake() {
  const nonce = crypto.randomBytes(32).toString('hex');
  const timestamp = Date.now();
  const message = `${nonce}:${timestamp}`;
  const clientSignature = crypto.createHmac('sha256', THECORE_IPC_SECRET).update(message).digest('hex');

  const id = requestIdCounter++;
  pendingRequests.set(id, {
    resolve: (res) => {
      if (res && res.status === 'authenticated') {
        const expectedServerMsg = `${nonce}:authorized_session:${timestamp}`;
        const expectedServerSig = crypto.createHmac('sha256', THECORE_IPC_SECRET).update(expectedServerMsg).digest('hex');
        if (res.server_signature === expectedServerSig) {
          isEngineAuthenticated = true;
          if (engineAuthDeferred && engineAuthDeferred.resolve) {
            engineAuthDeferred.resolve(true);
          }
          console.log(`[Security] Core IPC handshake verified. Session ID: ${res.session_id}`);
        } else {
          console.error('[Security] Core returned invalid signature. Terminating.');
          app.quit();
        }
      } else {
        console.error('[Security] Core rejected handshake. Terminating.');
        app.quit();
      }
    },
    reject: (err) => {
      console.error('[Security] Handshake failed:', err);
      if (engineAuthDeferred && engineAuthDeferred.reject) {
        engineAuthDeferred.reject(err);
      }
      app.quit();
    }
  });

  const payload = JSON.stringify({
    id,
    method: 'auth_handshake',
    params: {
      nonce,
      timestamp,
      client_signature: clientSignature
    }
  }) + '\n';

  if (pythonProcess && pythonProcess.stdin.writable) {
    pythonProcess.stdin.write(payload, 'utf-8');
  }
}

function startPythonEngine() {
  const fs = require('fs');
  let exePath = null;
  let args = [];

  // Сброс состояния аутентификации при старте/перезапуске
  isEngineAuthenticated = false;
  let resolveAuth, rejectAuth;
  engineAuthDeferred = new Promise((resolve, reject) => {
    resolveAuth = resolve;
    rejectAuth = reject;
  });
  engineAuthDeferred.resolve = resolveAuth;
  engineAuthDeferred.reject = rejectAuth;

  // Проверяем наличие скомпилированного автономного движка
  const packagedExe = path.join(process.resourcesPath, 'bin', 'engine.exe');
  const packagedExeDirect = path.join(process.resourcesPath, 'engine.exe');
  const devBinExe = path.join(__dirname, '..', 'bin', 'engine.exe');

  if (fs.existsSync(packagedExe)) {
    exePath = packagedExe;
  } else if (fs.existsSync(packagedExeDirect)) {
    exePath = packagedExeDirect;
  } else if (fs.existsSync(devBinExe)) {
    exePath = devBinExe;
  } else {
    // Fallback на системный Python
    exePath = getPythonCommand();
    args = [path.join(__dirname, '..', 'engine.py')];
  }

  const workDir = exePath.endsWith('.exe') ? path.dirname(exePath) : path.join(__dirname, '..');

  pythonProcess = spawn(exePath, args, {
    cwd: workDir,
    windowsHide: true,
    env: { ...process.env, PYTHONUNBUFFERED: '1', PYTHONIOENCODING: 'utf-8' },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  const rl = readline.createInterface({
    input: pythonProcess.stdout,
    terminal: false
  });

  rl.on('line', (line) => {
    line = line.trim();
    if (!line) return;

    try {
      const msg = JSON.parse(line);
      if (msg.type === 'event') {
        if (msg.event === 'ready') {
          // Инициируем криптографическое рукопожатие IPC
          performHandshake();
        }
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('engine-event', {
            event: msg.event,
            data: msg.data
          });
        }
      } else if (msg.type === 'response') {
        const id = msg.id;
        if (pendingRequests.has(id)) {
          const { resolve, reject } = pendingRequests.get(id);
          pendingRequests.delete(id);
          if (msg.error) {
            reject(new Error(msg.error));
          } else {
            resolve(msg.result);
          }
        }
      }
    } catch (e) {
      console.error('[Engine stdout error]', e, line);
    }
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`[Python Engine]: ${data.toString()}`);
  });

  pythonProcess.on('exit', (code) => {
    console.log(`[Python Engine] exited with code ${code}`);
    if (!isQuitting) {
      // Перезапуск при случайном падении
      setTimeout(startPythonEngine, 1000);
    }
  });
}

async function callEngine(method, params = {}) {
  // Для любых системных вызовов (кроме auth_handshake и ping) дожидаемся подтверждения авторизации
  if (method !== 'auth_handshake' && method !== 'ping') {
    if (!isEngineAuthenticated && engineAuthDeferred) {
      // Защитный таймаут ожидания рукопожатия (до 3 сек), предотвращающий зависание интерфейса
      const timeoutPromise = new Promise((_, rej) => setTimeout(() => rej(new Error('Auth handshake timeout')), 3000));
      try {
        await Promise.race([engineAuthDeferred, timeoutPromise]);
      } catch (e) {
        console.warn('[Security] Handshake race notice:', e.message);
      }
    }
  }

  return new Promise((resolve, reject) => {
    if (!pythonProcess || !pythonProcess.stdin.writable) {
      return reject(new Error('Python engine is not running'));
    }

    const id = requestIdCounter++;
    pendingRequests.set(id, { resolve, reject });

    // Таймаут на 30 секунд
    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject(new Error(`Request timeout for method: ${method}`));
      }
    }, 30000);

    const payload = JSON.stringify({ id, method, params }) + '\n';
    pythonProcess.stdin.write(payload, 'utf-8');
  });
}

function createWindow() {
  const iconPath = path.join(__dirname, '..', 'assets', 'logo.png');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1040,
    minHeight: 720,
    frame: false,
    backgroundColor: '#0C0E12',
    show: false,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: !app.isPackaged
    }
  });

  // Защита окна от инъекций и запрет отладчика в релизной сборке
  if (app.isPackaged) {
    mainWindow.webContents.on('before-input-event', (event, input) => {
      // Блокировка DevTools: F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      const isDevKey = input.key === 'F12' ||
        (input.control && input.shift && ['I', 'i', 'J', 'j'].includes(input.key)) ||
        (input.control && ['U', 'u'].includes(input.key));
      if (isDevKey) {
        event.preventDefault();
      }
    });

    mainWindow.webContents.on('will-navigate', (event, url) => {
      if (!url.startsWith('file://')) {
        event.preventDefault();
      }
    });
  }

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.webContents.on('console-message', (e, level, message, line, sourceId) => {
    console.log(`[Renderer Console]: ${message} (line ${line})`);
  });

  mainWindow.once('ready-to-show', () => {
    const isHiddenStart = process.argv.includes('--hidden');
    if (!isHiddenStart) {
      mainWindow.show();
    }
  });

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const trayIconPath = path.join(__dirname, '..', 'assets', 'tray-icon.png');
  const iconPath = fs.existsSync(trayIconPath) ? trayIconPath : path.join(__dirname, '..', 'assets', 'logo.png');
  const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });

  tray = new Tray(trayIcon);
  tray.setToolTip('TheCore');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Панель управления',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Оптимизировать систему',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.webContents.send('trigger-quick-boost');
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Выход',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
      }
    }
  });
}

// --- TheCore In-Game HUD (Overlay Window) ---
let overlayWindow = null;
let overlayPosition = 'top-right'; // 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
let overlayEnabled = false;
let overlayTelemetryInterval = null;

function getOverlayCoordinates(width, height, position) {
  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { workArea } = primaryDisplay;
    const margin = 20;

    let x = workArea.x + workArea.width - width - margin;
    let y = workArea.y + margin;

    if (position === 'top-left') {
      x = workArea.x + margin;
      y = workArea.y + margin;
    } else if (position === 'bottom-right') {
      x = workArea.x + workArea.width - width - margin;
      y = workArea.y + workArea.height - height - margin;
    } else if (position === 'bottom-left') {
      x = workArea.x + margin;
      y = workArea.y + workArea.height - height - margin;
    }
    return { x: Math.round(x), y: Math.round(y) };
  } catch (_) {
    return { x: 50, y: 50 };
  }
}

function createOverlayWindow() {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    return overlayWindow;
  }

  const width = 250;
  const height = 160;
  const coords = getOverlayCoordinates(width, height, overlayPosition);

  overlayWindow = new BrowserWindow({
    width,
    height,
    x: coords.x,
    y: coords.y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: true,
    focusable: false,
    show: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'overlay-preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });

  overlayWindow.loadFile(path.join(__dirname, 'overlay.html'));

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });

  return overlayWindow;
}

function startOverlayTelemetryLoop() {
  if (overlayTelemetryInterval) return;
  overlayTelemetryInterval = setInterval(async () => {
    if (overlayWindow && !overlayWindow.isDestroyed() && overlayWindow.isVisible()) {
      try {
        const metrics = await callEngine('get_live_metrics');
        if (metrics && overlayWindow && !overlayWindow.isDestroyed()) {
          overlayWindow.webContents.send('overlay-telemetry', metrics);
        }
      } catch (_) {}
    } else {
      clearInterval(overlayTelemetryInterval);
      overlayTelemetryInterval = null;
    }
  }, 1000);
}

function setOverlayVisible(visible) {
  overlayEnabled = Boolean(visible);
  if (overlayEnabled) {
    if (!overlayWindow || overlayWindow.isDestroyed()) {
      createOverlayWindow();
    }
    const width = 250;
    const height = 160;
    const coords = getOverlayCoordinates(width, height, overlayPosition);
    overlayWindow.setPosition(coords.x, coords.y);
    overlayWindow.showInactive();
    startOverlayTelemetryLoop();
  } else {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.hide();
    }
    if (overlayTelemetryInterval) {
      clearInterval(overlayTelemetryInterval);
      overlayTelemetryInterval = null;
    }
  }
}

function setOverlayPosition(pos) {
  overlayPosition = pos;
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    const width = 250;
    const height = 160;
    const coords = getOverlayCoordinates(width, height, overlayPosition);
    overlayWindow.setPosition(coords.x, coords.y);
  }
}

function toggleOverlay() {
  setOverlayVisible(!overlayEnabled);
  mainWindow?.webContents?.send('overlay-status-changed', overlayEnabled);
}

// IPC Handlers
ipcMain.handle('get-hardware', async () => {
  return await callEngine('get_hardware');
});

ipcMain.handle('get-live-metrics', async () => {
  const metrics = await callEngine('get_live_metrics');
  if (overlayWindow && !overlayWindow.isDestroyed() && overlayWindow.isVisible()) {
    overlayWindow.webContents.send('overlay-telemetry', metrics);
  }
  return metrics;
});

// Overlay Management IPC
ipcMain.handle('toggle-overlay', () => {
  toggleOverlay();
  return overlayEnabled;
});

ipcMain.handle('set-overlay-visible', (_event, visible) => {
  setOverlayVisible(visible);
  return overlayEnabled;
});

ipcMain.handle('set-overlay-position', (_event, pos) => {
  setOverlayPosition(pos);
  return overlayPosition;
});

ipcMain.handle('get-overlay-status', () => {
  return {
    enabled: overlayEnabled,
    position: overlayPosition,
    visible: Boolean(overlayWindow && !overlayWindow.isDestroyed() && overlayWindow.isVisible())
  };
});

ipcMain.handle('run-optimization', async () => {
  return await callEngine('run_optimization');
});

ipcMain.handle('get-optimization-analysis', async () => {
  return await callEngine('get_optimization_analysis');
});

ipcMain.handle('get-startup-items', async () => {
  return await callEngine('get_startup_items');
});

ipcMain.handle('toggle-startup-item', async (event, { name, enable }) => {
  return await callEngine('toggle_startup_item', { name, enable });
});

ipcMain.handle('get-upgrade-recommendations', async () => {
  return await callEngine('get_upgrade_recommendations');
});

// Windows Experience Index (System Rating)
ipcMain.handle('get-system-rating', async () => {
  return await callEngine('get_system_rating');
});

ipcMain.handle('run-system-assessment', async () => {
  return await callEngine('run_system_assessment');
});

// Clean Uninstaller & Force Removal
ipcMain.handle('get-installed-apps', async () => {
  return await callEngine('get_installed_apps');
});

const appIconMemoryCache = new Map();

ipcMain.handle('get-app-icon', async (event, filePath) => {
  if (!filePath || typeof filePath !== 'string') return null;
  const clean = filePath.trim().replace(/^"(.*)"$/, '$1');
  if (appIconMemoryCache.has(clean)) {
    return appIconMemoryCache.get(clean);
  }

  try {
    if (!fs.existsSync(clean)) return null;

    let dataUrl = null;
    const lower = clean.toLowerCase();

    // 1. Direct .ico or .png file
    if (lower.endsWith('.ico') || lower.endsWith('.png')) {
      const nImg = nativeImage.createFromPath(clean);
      if (!nImg.isEmpty()) {
        dataUrl = nImg.toDataURL();
      }
    }

    // 2. Windows shell icon extraction for .exe, .lnk, .dll, etc.
    if (!dataUrl && typeof app.getFileIcon === 'function') {
      const shellIcon = await app.getFileIcon(clean, { size: 'normal' });
      if (shellIcon && !shellIcon.isEmpty()) {
        dataUrl = shellIcon.toDataURL();
      }
    }

    if (dataUrl) {
      appIconMemoryCache.set(clean, dataUrl);
    }
    return dataUrl;
  } catch (err) {
    return null;
  }
});

ipcMain.handle('scan-app-residuals', async (event, app) => {
  return await callEngine('scan_app_residuals', { app });
});

ipcMain.handle('delete-residuals', async (event, items) => {
  return await callEngine('delete_residuals', { items });
});

ipcMain.handle('run-standard-uninstall', async (event, app) => {
  return await callEngine('run_standard_uninstall', { app });
});

ipcMain.handle('force-remove-app', async (event, app) => {
  return await callEngine('force_remove_app', { app });
});

// Проверка и сброс флага первого запуска после установки / обновления
ipcMain.handle('check-post-install-eula', () => {
  try {
    const proc = spawnSync('reg.exe', ['query', 'HKCU\\Software\\TheCore', '/v', 'ShowEulaPostInstall'], { windowsHide: true });
    if (proc.status === 0 && proc.stdout && proc.stdout.toString().includes('0x1')) {
      return true;
    }
  } catch (_) {}
  return false;
});

ipcMain.handle('clear-post-install-eula', () => {
  try {
    spawnSync('reg.exe', ['delete', 'HKCU\\Software\\TheCore', '/v', 'ShowEulaPostInstall', '/f'], { windowsHide: true });
  } catch (_) {}
  return true;
});

// Нативное определение операционной системы Windows
function getWindowsOsInfo() {
  try {
    const proc = spawnSync('reg.exe', ['query', 'HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion'], { encoding: 'utf8', windowsHide: true });
    if (proc.status === 0 && proc.stdout) {
      const getVal = (name) => {
        const m = proc.stdout.match(new RegExp(name + '\\s+REG_SZ\\s+([^\\r\\n]+)'));
        return m ? m[1].trim() : '';
      };
      const productName = getVal('ProductName') || 'Windows';
      const displayVersion = getVal('DisplayVersion') || '';
      const currentBuild = getVal('CurrentBuild') || getVal('CurrentBuildNumber') || '';
      const buildNum = parseInt(currentBuild, 10) || 0;
      let osName = productName;
      if (buildNum >= 22000 && osName.includes('Windows 10')) {
        osName = osName.replace('Windows 10', 'Windows 11');
      }
      const parts = [];
      if (displayVersion) parts.push(displayVersion);
      if (currentBuild) parts.push(`Сборка ${currentBuild}`);
      else parts.push(process.arch === 'x64' ? '64-bit' : '32-bit');

      return {
        name: osName,
        displayVersion,
        build: currentBuild,
        subtext: parts.join(' • ') || '64-bit Edition'
      };
    }
  } catch (e) {
    console.error('Failed to get Windows OS info:', e);
  }
  return { name: 'Windows 11 Pro', displayVersion: '23H2', build: '', subtext: '64-bit Edition' };
}

ipcMain.handle('get-os-info', () => {
  return getWindowsOsInfo();
});

// Автозапуск TheCore вместе с Windows (нативная работа с реестром HKCU Run)
function getTheCoreExePath() {
  const fs = require('fs');
  const installedPath = path.join(process.env.ProgramFiles || 'C:\\Program Files', 'TheCore', 'TheCore.exe');
  if (app.isPackaged) {
    return process.execPath;
  }
  if (fs.existsSync(installedPath)) {
    return installedPath;
  }
  return process.execPath;
}

function checkRegistryAutostart() {
  try {
    const { spawnSync } = require('child_process');
    const res = spawnSync('reg.exe', [
      'query',
      'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
      '/v',
      'TheCore'
    ], {
      encoding: 'utf-8',
      windowsHide: true
    });
    return res.status === 0;
  } catch (e) {
    return false;
  }
}

function setRegistryAutostart(enable) {
  const { spawnSync } = require('child_process');
  const targetExe = getTheCoreExePath();

  // Удаляем любые фантомные или устаревшие ключи (включая старые TheOptimizer)
  const phantomKeys = ['electron.app.Electron', 'electron.app.TheOptimizer', 'TheOptimizer', 'electron.app.TheCore', 'TheCore'];
  for (const k of phantomKeys) {
    try {
      spawnSync('reg.exe', ['delete', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', '/v', k, '/f'], { windowsHide: true });
    } catch (_) {}
    try {
      spawnSync('reg.exe', ['delete', 'HKCU\\Software\\TheCore\\DisabledStartup', '/v', k, '/f'], { windowsHide: true });
    } catch (_) {}
    try {
      spawnSync('reg.exe', ['delete', 'HKCU\\Software\\TheOptimizer\\DisabledStartup', '/v', k, '/f'], { windowsHide: true });
    } catch (_) {}
  }

  if (enable) {
    try {
      // Записываем гарантированный ключ TheCore
      spawnSync('reg.exe', [
        'add',
        'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
        '/v',
        'TheCore',
        '/t',
        'REG_SZ',
        '/d',
        '\"' + targetExe + '\" --hidden',
        '/f'
      ], { windowsHide: true });

      // Очищаем системные блокировки Explorer Task Manager
      for (const k of ['TheCore', 'TheOptimizer', 'electron.app.Electron']) {
        try {
          spawnSync('reg.exe', ['delete', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run', '/v', k, '/f'], { windowsHide: true });
        } catch (_) {}
      }
    } catch (err) {
      console.error('Failed to enable autostart:', err);
    }
  }

  return checkRegistryAutostart();
}

ipcMain.handle('get-autostart-status', () => {
  return checkRegistryAutostart();
});

ipcMain.handle('set-autostart', (event, enable) => {
  return setRegistryAutostart(enable);
});

// Оконные контроллеры
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-hide-to-tray', () => {
  if (mainWindow) mainWindow.hide();
});

ipcMain.on('window-close-app', () => {
  isQuitting = true;
  app.quit();
});

// Инициализация жизненного цикла
app.whenReady().then(() => {
  startPythonEngine();
  createWindow();
  createTray();

  try {
    globalShortcut.register('CommandOrControl+Shift+O', () => {
      toggleOverlay();
    });
  } catch (err) {
    console.warn('Failed to register global shortcut CommandOrControl+Shift+O:', err);
  }

  if (process.env.APEX_SCREENSHOT_DIR) {
    const outDir = process.env.APEX_SCREENSHOT_DIR;
    const fs = require('fs');
    setTimeout(async () => {
      try {
        console.log('[Preview] Capturing screenshots to:', outDir);
        // 1. Dashboard
        let img = await mainWindow.capturePage();
        fs.writeFileSync(path.join(outDir, 'preview_system.png'), img.toPNG());

        // 2. Optimize tab
        await mainWindow.webContents.executeJavaScript("document.getElementById('nav-btn-optimize')?.click();");
        await new Promise(r => setTimeout(r, 1200));
        img = await mainWindow.capturePage();
        fs.writeFileSync(path.join(outDir, 'preview_optimize.png'), img.toPNG());

        // 3. Startup tab
        await mainWindow.webContents.executeJavaScript("document.getElementById('nav-btn-startup')?.click();");
        await new Promise(r => setTimeout(r, 1000));
        img = await mainWindow.capturePage();
        fs.writeFileSync(path.join(outDir, 'preview_startup.png'), img.toPNG());

        // 4. Upgrade tab
        await mainWindow.webContents.executeJavaScript("document.getElementById('nav-btn-upgrade')?.click();");
        await new Promise(r => setTimeout(r, 1000));
        img = await mainWindow.capturePage();
        fs.writeFileSync(path.join(outDir, 'preview_upgrade.png'), img.toPNG());

        console.log('[Preview] All screenshots saved successfully!');
      } catch (err) {
        console.error('[Preview Error]', err);
      } finally {
        isQuitting = true;
        app.quit();
      }
    }, 4000);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  try {
    globalShortcut.unregisterAll();
  } catch (_) {}
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    try {
      overlayWindow.destroy();
    } catch (_) {}
  }
  if (pythonProcess) {
    try {
      pythonProcess.kill();
    } catch (e) {}
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && isQuitting) {
    app.quit();
  }
});
