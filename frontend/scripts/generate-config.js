#!/usr/bin/env node

/**
 * Generate config.json from app.yml for frontend build
 * This script reads config/app.yml and extracts frontend-relevant configuration
 * into public/config.json so it can be loaded at runtime
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const CONFIG_PATH = path.join(__dirname, '../../config/app.yml');
const OUTPUT_PATH = path.join(__dirname, '../public/config.json');

try {
  // Read and parse YAML config
  const yamlContent = fs.readFileSync(CONFIG_PATH, 'utf8');
  const config = yaml.load(yamlContent);

  // Extract frontend-relevant configuration
  const frontendConfig = {
    customLinks: config.customLinks || [],
    motd: config.motd || { enabled: false },
    app: {
      name: config.app?.name || 'Meshtastic Node Mapper',
      version: config.app?.version || '1.0.0',
      description: config.app?.description || 'Web-based visualization for Meshtastic mesh networks'
    }
  };

  // Write to public directory
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(frontendConfig, null, 2));
  console.log('✓ Generated config.json from app.yml');
  console.log(`  Custom links: ${frontendConfig.customLinks.length}`);
  console.log(`  MOTD enabled: ${frontendConfig.motd.enabled}`);
} catch (error) {
  console.error('Error generating config.json:', error.message);
  
  // Create a minimal fallback config
  const fallbackConfig = {
    customLinks: [
      {
        name: "Meshtastic Documentation",
        description: "Official Meshtastic documentation",
        url: "https://meshtastic.org/docs",
        icon: "book"
      }
    ],
    motd: { enabled: false },
    app: {
      name: 'Meshtastic Node Mapper',
      version: '1.0.0',
      description: 'Web-based visualization for Meshtastic mesh networks'
    }
  };
  
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(fallbackConfig, null, 2));
  console.log('⚠ Created fallback config.json');
}
