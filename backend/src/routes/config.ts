/**
 * Configuration Routes
 * API endpoints for serving application configuration from app.yml
 */

import express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { logger } from '../utils/logger';

const router = express.Router();

// Cache for config to avoid reading file on every request
let configCache: any = null;
let configCacheTime: number = 0;
const CACHE_TTL = 60000; // 1 minute

/**
 * Load configuration from app.yml
 */
function loadConfig(): any {
  const now = Date.now();
  
  // Return cached config if still valid
  if (configCache && (now - configCacheTime) < CACHE_TTL) {
    return configCache;
  }

  try {
    // Try multiple possible locations for config file
    const possiblePaths = [
      path.join(__dirname, '../../config/app.yml'),
      path.join(process.cwd(), 'config/app.yml'),
      '/app/config/app.yml'
    ];

    let configPath: string | null = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        configPath = p;
        break;
      }
    }

    if (!configPath) {
      logger.warn('app.yml not found in any expected location, using defaults');
      return getDefaultConfig();
    }

    const fileContents = fs.readFileSync(configPath, 'utf8');
    const config = yaml.load(fileContents);
    
    // Cache the config
    configCache = config;
    configCacheTime = now;
    
    return config;
  } catch (error) {
    logger.error('Error loading app.yml:', error);
    return getDefaultConfig();
  }
}

/**
 * Get default configuration if app.yml cannot be loaded
 */
function getDefaultConfig(): any {
  return {
    app: {
      name: 'Meshtastic Node Mapper',
      version: '1.0.0',
      description: 'Web-based visualization for Meshtastic mesh networks'
    },
    customLinks: [
      {
        name: 'Meshtastic Documentation',
        description: 'Official Meshtastic documentation',
        url: 'https://meshtastic.org/docs',
        icon: 'book'
      },
      {
        name: 'Community Forum',
        description: 'Meshtastic community discussions',
        url: 'https://meshtastic.discourse.group',
        icon: 'forum'
      }
    ],
    motd: {
      enabled: true,
      title: 'Welcome to Meshtastic Node Mapper',
      message: 'Monitor your mesh network in real-time',
      dismissible: true
    }
  };
}

/**
 * @swagger
 * /api/v1/config:
 *   get:
 *     summary: Get application configuration
 *     description: Returns frontend configuration from app.yml
 *     tags: [Config]
 *     responses:
 *       200:
 *         description: Application configuration
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 app:
 *                   type: object
 *                 customLinks:
 *                   type: array
 *                 motd:
 *                   type: object
 */
router.get('/', (req, res) => {
  try {
    const config = loadConfig();
    
    // Return only frontend-relevant configuration
    res.json({
      app: config.app || {},
      customLinks: config.customLinks || [],
      motd: config.motd || { enabled: false }
    });
  } catch (error) {
    logger.error('Error in config endpoint:', error);
    res.status(500).json({
      error: 'Failed to load configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/v1/config/custom-links:
 *   get:
 *     summary: Get custom links configuration
 *     description: Returns custom links from app.yml
 *     tags: [Config]
 *     responses:
 *       200:
 *         description: Custom links array
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   url:
 *                     type: string
 *                   icon:
 *                     type: string
 */
router.get('/custom-links', (req, res) => {
  try {
    const config = loadConfig();
    res.json(config.customLinks || []);
  } catch (error) {
    logger.error('Error in custom-links endpoint:', error);
    res.status(500).json({
      error: 'Failed to load custom links',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/v1/config/motd:
 *   get:
 *     summary: Get MOTD configuration
 *     description: Returns Message of the Day configuration from app.yml
 *     tags: [Config]
 *     responses:
 *       200:
 *         description: MOTD configuration
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 enabled:
 *                   type: boolean
 *                 title:
 *                   type: string
 *                 message:
 *                   type: string
 *                 dismissible:
 *                   type: boolean
 */
router.get('/motd', (req, res) => {
  try {
    const config = loadConfig();
    res.json(config.motd || { enabled: false });
  } catch (error) {
    logger.error('Error in motd endpoint:', error);
    res.status(500).json({
      error: 'Failed to load MOTD configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/v1/config/app:
 *   get:
 *     summary: Get app information
 *     description: Returns app name, version, and description from app.yml
 *     tags: [Config]
 *     responses:
 *       200:
 *         description: App information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                 version:
 *                   type: string
 *                 description:
 *                   type: string
 */
router.get('/app', (req, res) => {
  try {
    const config = loadConfig();
    res.json(config.app || {});
  } catch (error) {
    logger.error('Error in app config endpoint:', error);
    res.status(500).json({
      error: 'Failed to load app configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/v1/config/reload:
 *   post:
 *     summary: Reload configuration from disk
 *     description: Clears the config cache and reloads from app.yml
 *     tags: [Config]
 *     responses:
 *       200:
 *         description: Configuration reloaded successfully
 */
router.post('/reload', (req, res) => {
  try {
    configCache = null;
    configCacheTime = 0;
    const config = loadConfig();
    
    res.json({
      message: 'Configuration reloaded successfully',
      customLinksCount: config.customLinks?.length || 0,
      motdEnabled: config.motd?.enabled || false
    });
  } catch (error) {
    logger.error('Error reloading config:', error);
    res.status(500).json({
      error: 'Failed to reload configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
