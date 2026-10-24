/**
 * build-protected.js — Защищенная сборочная система TheCore (Anti-Tamper & Obfuscation Pipeline).
 * 
 * Выполняет:
 * 1. Временное резервное копирование оригинальных исходников (src/*.js).
 * 2. Глубокую обфускацию JavaScript (Control Flow Flattening, Base64 String Array, Split Strings).
 * 3. Сборку нативного защищенного инсталлятора через electron-builder.
 * 4. Автоматическое восстановление читаемых исходников для продолжения комфортной разработки.
 * 5. Расчет и вывод официального контрольного хеша SHA-256 готового Setup.exe для 4PDA и GitHub.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const JavaScriptObfuscator = require('javascript-obfuscator');

const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const BACKUP_DIR = path.join(ROOT_DIR, '.build_backup');

const TARGET_FILES = [
  { file: 'main.js', target: 'node' },
  { file: 'preload.js', target: 'node' },
  { file: 'i18n.js', target: 'browser' },
  { file: 'renderer.js', target: 'browser' }
];

console.log('\n=======================================================');
console.log('       TheCore v3.3.0 — Hardened Security Build        ');
console.log('=======================================================\n');

function backupFiles() {
  console.log('[1/4] Резервное копирование исходников перед защитой...');
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  for (const { file } of TARGET_FILES) {
    const srcPath = path.join(SRC_DIR, file);
    const backupPath = path.join(BACKUP_DIR, file);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, backupPath);
    }
  }
  console.log('      Исходные файлы сохранены в .build_backup/');
}

function obfuscateFiles() {
  console.log('[2/4] Защита и обфускация кода (Control Flow Flattening & String Array)...');

  for (const { file, target } of TARGET_FILES) {
    const filePath = path.join(SRC_DIR, file);
    if (!fs.existsSync(filePath)) continue;

    console.log(`      Защита: ${file} (target: ${target})...`);
    const rawCode = fs.readFileSync(filePath, 'utf-8');

    const obfuscationResult = JavaScriptObfuscator.obfuscate(rawCode, {
      target: target,
      compact: true,
      controlFlowFlattening: true,
      controlFlowFlatteningThreshold: 0.7,
      deadCodeInjection: false,
      stringArray: true,
      stringArrayEncoding: ['base64'],
      stringArrayThreshold: 0.75,
      splitStrings: true,
      splitStringsChunkLength: 8,
      transformObjectKeys: true,
      unicodeEscapeSequence: false,
      disableConsoleOutput: false
    });

    fs.writeFileSync(filePath, obfuscationResult.getObfuscatedCode(), 'utf-8');
  }
  console.log('      Все модули интерфейса успешно защищены и запечатаны.');
}

function restoreFiles() {
  console.log('[4/4] Восстановление чистых исходников в рабочей директории...');
  for (const { file } of TARGET_FILES) {
    const backupPath = path.join(BACKUP_DIR, file);
    const srcPath = path.join(SRC_DIR, file);
    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, srcPath);
    }
  }

  // Удаляем временную папку бэкапа
  try {
    fs.rmSync(BACKUP_DIR, { recursive: true, force: true });
  } catch (e) {}

  console.log('      Рабочая ветка восстановлена в исходное состояние (Clean State).');
}

function calculateInstallerHash() {
  const distDir = path.join(ROOT_DIR, 'dist');
  if (!fs.existsSync(distDir)) return;

  const files = fs.readdirSync(distDir);
  const setupFile = files.find(f => f === 'TheCore.exe' || f.endsWith('-Setup.exe') || (f.endsWith('.exe') && !f.includes('unpacked')));

  if (setupFile) {
    const setupPath = path.join(distDir, setupFile);
    const fileBuffer = fs.readFileSync(setupPath);
    const hashSum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const sizeMb = (fs.statSync(setupPath).size / (1024 * 1024)).toFixed(2);

    console.log('\n=======================================================');
    console.log('           РЕЗУЛЬТАТ ЗАЩИЩЕННОЙ СБОРКИ                 ');
    console.log('=======================================================');
    console.log(`Файл инсталлятора:  dist/${setupFile}`);
    console.log(`Размер файла:       ${sizeMb} МБ`);
    console.log(`SHA-256 ХЕШ:        ${hashSum}`);
    console.log('-------------------------------------------------------');
    console.log('Скопируйте этот хеш для публикации в шапке на 4PDA и GitHub!');
    console.log('=======================================================\n');
  }
}

// Главный цикл защищенной сборки
try {
  const distDir = path.join(ROOT_DIR, 'dist');
  if (fs.existsSync(distDir)) {
    const oldFiles = fs.readdirSync(distDir);
    for (const f of oldFiles) {
      if (f.endsWith('.exe') || f.endsWith('.blockmap')) {
        try { fs.rmSync(path.join(distDir, f), { force: true }); } catch (e) {}
      }
    }
  }

  backupFiles();
  obfuscateFiles();

  console.log('[3/4] Сборка нативного инсталлятора NSIS через electron-builder...');
  execSync('npx electron-builder --win nsis', {
    cwd: ROOT_DIR,
    stdio: 'inherit'
  });

} catch (err) {
  console.error('\n[ОШИБКА СБОРКИ]', err.message);
  process.exitCode = 1;
} finally {
  restoreFiles();
  calculateInstallerHash();
}
