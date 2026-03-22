const fs = require('fs');
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;

function findWorkspaceRoot(startDir) {
  let currentDir = startDir;
  let fallbackRoot = startDir;

  while (true) {
    const packageJsonPath = path.join(currentDir, 'package.json');

    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        if (packageJson && packageJson.workspaces) {
          return currentDir;
        }
      } catch {}
    }

    if (fs.existsSync(path.join(currentDir, 'node_modules'))) {
      fallbackRoot = currentDir;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return fallbackRoot;
    }

    currentDir = parentDir;
  }
}

const workspaceRoot = findWorkspaceRoot(projectRoot);

const config = getDefaultConfig(projectRoot);
const projectNodeModules = path.resolve(projectRoot, 'node_modules');
const workspaceNodeModules = path.resolve(workspaceRoot, 'node_modules');
const workspacePackages = path.resolve(workspaceRoot, 'packages');
const sharedPackage = path.resolve(workspacePackages, 'shared');
const i18nPackage = path.resolve(workspacePackages, 'i18n');

config.watchFolders = [
  workspaceRoot,
  workspacePackages,
  sharedPackage,
  i18nPackage,
  projectNodeModules,
  workspaceNodeModules,
].filter((folderPath) => fs.existsSync(folderPath));
config.resolver.unstable_enableSymlinks = true;
config.resolver.unstable_enablePackageExports = true;
config.resolver.nodeModulesPaths = [
  projectNodeModules,
  workspaceNodeModules,
];
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  '@safed/i18n': i18nPackage,
  '@safed/shared': sharedPackage,
};
config.resolver.disableHierarchicalLookup = false;

module.exports = config;