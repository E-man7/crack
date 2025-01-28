const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add @supabase/postgrest-js to extraNodeModules
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@supabase/postgrest-js': require.resolve('@supabase/postgrest-js'),
};

module.exports = config;