const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Replit injects helper files under .local; Metro should not index them as app code.
config.resolver.blockList = [/\/\.local\/.*/];

module.exports = config;