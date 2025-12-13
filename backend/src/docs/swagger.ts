import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Meshtastic Node Mapper API',
      version: '1.0.0',
      description: 'REST API for Meshtastic mesh network visualization and monitoring',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      },
      license: {
        name: 'GPL v3',
        url: 'https://www.gnu.org/licenses/gpl-3.0.html'
      }
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3001',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
        apiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error code'
            },
            message: {
              type: 'string',
              description: 'Error message'
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            },
            path: {
              type: 'string'
            },
            method: {
              type: 'string'
            }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              minimum: 1
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100
            },
            total: {
              type: 'integer'
            },
            pages: {
              type: 'integer'
            }
          }
        },
        Node: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            nodeId: {
              type: 'string',
              description: 'Unique node identifier'
            },
            hexId: {
              type: 'string',
              description: 'Hexadecimal representation'
            },
            shortName: {
              type: 'string',
              maxLength: 4
            },
            longName: {
              type: 'string',
              maxLength: 40
            },
            hardwareModel: {
              type: 'string'
            },
            firmwareVersion: {
              type: 'string'
            },
            role: {
              type: 'string',
              enum: ['CLIENT', 'CLIENT_MUTE', 'ROUTER', 'ROUTER_CLIENT', 'REPEATER', 'TRACKER', 'SENSOR', 'TAK', 'CLIENT_HIDDEN', 'LOST_AND_FOUND', 'TAK_TRACKER']
            },
            lastSeen: {
              type: 'string',
              format: 'date-time'
            },
            lastHeard: {
              type: 'string',
              format: 'date-time'
            },
            isOnline: {
              type: 'boolean'
            },
            mqttConnected: {
              type: 'boolean'
            },
            batteryLevel: {
              type: 'number',
              minimum: 0,
              maximum: 100
            },
            voltage: {
              type: 'number'
            },
            channelUtilization: {
              type: 'number',
              minimum: 0,
              maximum: 100
            },
            airUtilTx: {
              type: 'number',
              minimum: 0,
              maximum: 100
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            },
            networkId: {
              type: 'string',
              format: 'uuid'
            }
          }
        },
        Position: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            nodeId: {
              type: 'string',
              format: 'uuid'
            },
            latitude: {
              type: 'number',
              minimum: -90,
              maximum: 90
            },
            longitude: {
              type: 'number',
              minimum: -180,
              maximum: 180
            },
            altitude: {
              type: 'number'
            },
            precision: {
              type: 'number',
              minimum: 0
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            },
            source: {
              type: 'string',
              enum: ['GPS', 'MANUAL', 'ESTIMATED', 'NETWORK']
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        TelemetryReading: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            nodeId: {
              type: 'string',
              format: 'uuid'
            },
            type: {
              type: 'string',
              enum: ['DEVICE_METRICS', 'ENVIRONMENT_METRICS', 'POWER_METRICS']
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            },
            data: {
              type: 'object',
              description: 'Telemetry data varies by type'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Message: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            messageId: {
              type: 'string'
            },
            fromNodeId: {
              type: 'string',
              format: 'uuid'
            },
            toNodeId: {
              type: 'string',
              format: 'uuid'
            },
            type: {
              type: 'string',
              enum: ['TEXT', 'POSITION', 'TELEMETRY', 'NODEINFO', 'ROUTING', 'ADMIN']
            },
            content: {
              oneOf: [
                { type: 'string' },
                { type: 'object' }
              ]
            },
            encrypted: {
              type: 'boolean'
            },
            hopLimit: {
              type: 'integer',
              minimum: 0,
              maximum: 7
            },
            hopStart: {
              type: 'integer',
              minimum: 0,
              maximum: 7
            },
            wantAck: {
              type: 'boolean'
            },
            priority: {
              type: 'string',
              enum: ['UNSET', 'MIN', 'BACKGROUND', 'DEFAULT', 'RELIABLE', 'ACK', 'MAX']
            },
            channel: {
              type: 'integer',
              minimum: 0,
              maximum: 7
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            },
            receivedAt: {
              type: 'string',
              format: 'date-time'
            },
            routingPath: {
              type: 'array',
              items: {
                type: 'string'
              }
            },
            rssi: {
              type: 'number'
            },
            snr: {
              type: 'number'
            }
          }
        },
        Network: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            name: {
              type: 'string'
            },
            description: {
              type: 'string'
            },
            mqttBroker: {
              type: 'string',
              format: 'uri'
            },
            mqttCredentials: {
              type: 'object',
              description: 'MQTT authentication credentials (sensitive data redacted in responses)'
            },
            region: {
              type: 'string',
              enum: ['UNSET', 'US', 'EU_433', 'EU_868', 'CN', 'JP', 'ANZ', 'KR', 'TW', 'RU', 'IN', 'NZ_865', 'TH', 'LORA_24', 'UA_433', 'UA_868', 'MY_433', 'MY_919', 'SG_923']
            },
            isActive: {
              type: 'boolean'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      },
      {
        apiKeyAuth: []
      }
    ]
  },
  apis: ['./src/routes/*.ts'], // Path to the API docs
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Express) => {
  app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Meshtastic Node Mapper API Documentation'
  }));

  // Serve the raw OpenAPI spec
  app.get('/api/v1/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
};

export { specs as swaggerSpecs };