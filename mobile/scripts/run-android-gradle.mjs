import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const androidDir = path.join(projectRoot, 'android');
const rootGoogleServicesFile = path.join(projectRoot, 'google-services.json');
const androidGoogleServicesFile = path.join(androidDir, 'app', 'google-services.json');
const androidAutolinkingFile = path.join(androidDir, 'build', 'generated', 'autolinking', 'autolinking.json');
const androidAppAutolinkingDir = path.join(androidDir, 'app', 'build', 'generated', 'autolinking');
const expectedPackageName = 'com.safadd.app';

function cleanStaleAutolinkingMetadata() {
  if (!existsSync(androidAutolinkingFile)) {
    return;
  }

  const autolinking = JSON.parse(readFileSync(androidAutolinkingFile, 'utf8'));
  const cachedPackageName = autolinking?.project?.android?.packageName;

  if (!cachedPackageName || cachedPackageName === expectedPackageName) {
    return;
  }

  rmSync(path.dirname(androidAutolinkingFile), { recursive: true, force: true });
  rmSync(androidAppAutolinkingDir, { recursive: true, force: true });
}

function syncGoogleServicesFile() {
  if (!existsSync(rootGoogleServicesFile)) {
    return;
  }

  const googleServices = JSON.parse(readFileSync(rootGoogleServicesFile, 'utf8'));
  const packageNames = new Set(
    (googleServices.client ?? [])
      .map((client) => client?.client_info?.android_client_info?.package_name)
      .filter(Boolean)
  );

  if (!packageNames.has(expectedPackageName)) {
    throw new Error(
      `google-services.json does not include package_name ${expectedPackageName}. Found: ${Array.from(packageNames).join(', ') || 'none'}`
    );
  }

  mkdirSync(path.dirname(androidGoogleServicesFile), { recursive: true });
  copyFileSync(rootGoogleServicesFile, androidGoogleServicesFile);
}

function runGradle(tasks) {
  const wrapper = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
  const args = process.platform === 'win32' ? tasks : tasks;
  const child = spawn(wrapper, args, {
    cwd: androidDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV || 'production',
    },
    shell: process.platform === 'win32',
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });
}

const tasks = process.argv.slice(2);

if (!tasks.length) {
  console.error('Usage: node ./scripts/run-android-gradle.mjs <gradle-task> [more-tasks...]');
  process.exit(1);
}

try {
  cleanStaleAutolinkingMetadata();
  syncGoogleServicesFile();
  runGradle(tasks);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}