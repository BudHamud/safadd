const fs = require('fs');
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const safaddRoot = path.resolve(projectRoot, '..');
const workspaceRoot = path.resolve(projectRoot, '../../..');

const config = getDefaultConfig(projectRoot);

const projectNodeModules = path.resolve(projectRoot, 'node_modules');
const safaddNodeModules = path.resolve(safaddRoot, 'node_modules');
const workspaceNodeModules = path.resolve(workspaceRoot, 'node_modules');

const workspacePackages = path.resolve(safaddRoot, 'packages');
const sharedPackage = path.resolve(workspacePackages, 'shared');
const i18nPackage = path.resolve(workspacePackages, 'i18n');
const expoPackage = path.dirname(require.resolve('expo/package.json', { paths: [projectRoot, safaddRoot, workspaceRoot] }));
const expoModulesCorePackage = path.dirname(require.resolve('expo-modules-core/package.json', { paths: [workspaceRoot] }));
const expoRouterPackage = path.dirname(require.resolve('expo-router/package.json', { paths: [projectRoot, safaddRoot, workspaceRoot] }));
const reactPackage = path.dirname(require.resolve('react/package.json', { paths: [projectRoot, safaddRoot, workspaceRoot] }));
const reactNativePackage = path.dirname(require.resolve('react-native/package.json', { paths: [projectRoot, safaddRoot, workspaceRoot] }));
const babelRuntimePackage = path.dirname(require.resolve('@babel/runtime/package.json', { paths: [expoRouterPackage] }));
const regeneratorRuntimePackage = path.dirname(require.resolve('regenerator-runtime/package.json', { paths: [reactNativePackage] }));

config.watchFolders = [
  workspaceRoot,
  safaddRoot,
  projectRoot,
  workspacePackages,
  sharedPackage,
  i18nPackage,
  safaddNodeModules,
  workspaceNodeModules,
  projectNodeModules,
].filter((folderPath) => fs.existsSync(folderPath));

config.resolver.unstable_enableSymlinks = true;
config.resolver.unstable_enablePackageExports = true;

config.resolver.nodeModulesPaths = [
  projectNodeModules,
  safaddNodeModules,
  workspaceNodeModules,
].filter((folderPath) => fs.existsSync(folderPath));

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  expo: expoPackage,
  'expo-modules-core': expoModulesCorePackage,
  'expo-router': expoRouterPackage,
  '@safed/i18n': i18nPackage,
  '@safed/shared': sharedPackage,
  '@safed/shared/locale': path.resolve(sharedPackage, 'locale.js'),
  '@babel/runtime': babelRuntimePackage,
  'regenerator-runtime': regeneratorRuntimePackage,
  react: reactPackage,
  'react-native': reactNativePackage,
};

// disableHierarchicalLookup intentionally removed:
// pnpm places each package's deps as siblings in its virtual store entry
// (.pnpm/<pkg@version>/node_modules/<dep>). Disabling hierarchical lookup
// prevents Metro from finding those siblings, causing cascading "Unable to resolve"
// errors for transitives. The explicit extraNodeModules overrides above already
// pin the critical packages (react, react-native, expo, expo-router, etc.)
// so version conflicts are not a concern.

module.exports = config;