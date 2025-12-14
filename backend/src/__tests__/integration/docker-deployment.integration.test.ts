/**
 * Docker Deployment Integration Tests
 * 
 * Validates Docker Compose deployment and configuration:
 * - Service health checks and connectivity
 * - Environment variable configuration
 * - Volume mounts and persistence
 * - Network connectivity between services
 * - Production configuration validation
 * 
 * Requirements: 10.1, 10.2, 10.3
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';
import { createClient } from 'redis';
import * as mqtt from 'mqtt';
import { PrismaClient } from '@prisma/client';

const execAsync = promisify(exec);

describe('Docker Deployment Integration Tests', () => {
  const DOCKER_COMPOSE_FILE = 'docker-compose.yml';
  const TEST_TIMEOUT = 120000; // 2 minutes for Docker operations

  beforeAll(async () => {
    // Ensure Docker Compose is available
    try {
      await execAsync('docker-compose --version');
    } catch (error) {
      throw new Error('Docker Compose is not available. Please install Docker Compose to run these tests.');
    }
  }, TEST_TIMEOUT);

  afterAll(async () => {
    // Cleanup: Stop all services
    try {
      await execAsync('docker-compose -f docker-compose.yml down -v');
    } catch (error) {
      console.warn('Failed to cleanup Docker services:', error);
    }
  }, TEST_TIMEOUT);

  describe('Service Health Checks', () => {
    it('should start all required services successfully', async () => {
      // Start services
      const { stdout } = await execAsync('docker-compose -f docker-compose.yml up -d');
      expect(stdout).toContain('Creating');

      // Wait for services to be ready
      await new Promise(resolve => setTimeout(resolve, 30000));

      // Check service status
      const { stdout: psOutput } = await execAsync('docker-compose -f docker-compose.yml ps');
      
      // Verify all services are running
      expect(psOutput).toContain('meshtastic-postgres');
      expect(psOutput).toContain('meshtastic-redis');
      expect(psOutput).toContain('meshtastic-mosquitto');
      expect(psOutput).toContain('meshtastic-backend');
      expect(psOutput).toContain('meshtastic-frontend');
      
      // Check for "Up" status (services should be healthy)
      const lines = psOutput.split('\n');
      const serviceLines = lines.filter(line => line.includes('meshtastic-'));
      
      serviceLines.forEach(line => {
        expect(line).toMatch(/Up|healthy/);
      });
    }, TEST_TIMEOUT);

    it('should have healthy PostgreSQL service', async () => {
      // Test database connectivity
      const prisma = new PrismaClient({
        datasources: {
          db: {
            url: 'postgresql://meshtastic:meshtastic_password@localhost:5432/meshtastic_mapper'
          }
        }
      });

      try {
        await prisma.$connect();
        const result = await prisma.$queryRaw`SELECT 1 as test`;
        expect(result).toBeDefined();
      } finally {
        await prisma.$disconnect();
      }
    });

    it('should have healthy Redis service', async () => {
      const redisClient = createClient({
        url: 'redis://localhost:6379'
      });

      try {
        await redisClient.connect();
        await redisClient.set('test_key', 'test_value');
        const value = await redisClient.get('test_key');
        expect(value).toBe('test_value');
      } finally {
        await redisClient.quit();
      }
    });

    it('should have healthy MQTT service', async () => {
      return new Promise<void>((resolve, reject) => {
        const client = mqtt.connect('mqtt://localhost:1883');
        
        const timeout = setTimeout(() => {
          client.end();
          reject(new Error('MQTT connection timeout'));
        }, 10000);

        client.on('connect', () => {
          clearTimeout(timeout);
          
          // Test publish/subscribe
          client.subscribe('test/topic', (err) => {
            if (err) {
              client.end();
              reject(err);
              return;
            }

            client.publish('test/topic', 'test message');
          });
        });

        client.on('message', (topic, message) => {
          if (topic === 'test/topic' && message.toString() === 'test message') {
            client.end();
            resolve();
          }
        });

        client.on('error', (err) => {
          clearTimeout(timeout);
          client.end();
          reject(err);
        });
      });
    });

    it('should have healthy backend API service', async () => {
      // Wait for backend to be ready
      let retries = 10;
      let response: any = null;
      
      while (retries > 0) {
        try {
          response = await axios.get('http://localhost:3001/health', {
            timeout: 5000
          });
          break;
        } catch (error) {
          retries--;
          if (retries === 0) throw error;
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }

      expect(response!.status).toBe(200);
      expect(response!.data).toHaveProperty('status', 'healthy');
      expect(response!.data).toHaveProperty('timestamp');
    });

    it('should have healthy frontend service', async () => {
      // Wait for frontend to be ready
      let retries = 10;
      let response: any = null;
      
      while (retries > 0) {
        try {
          response = await axios.get('http://localhost:3000', {
            timeout: 5000
          });
          break;
        } catch (error) {
          retries--;
          if (retries === 0) throw error;
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }

      expect(response!.status).toBe(200);
      expect(response!.data).toContain('<!DOCTYPE html>');
      expect(response!.data).toContain('Meshtastic Node Mapper');
    });
  });

  describe('Environment Configuration', () => {
    it('should load environment variables correctly', async () => {
      const { stdout } = await execAsync('docker-compose -f docker-compose.yml exec -T backend printenv');
      
      // Check required environment variables
      expect(stdout).toContain('NODE_ENV=development');
      expect(stdout).toContain('DATABASE_URL=postgresql://meshtastic:meshtastic_password@postgres:5432/meshtastic_mapper');
      expect(stdout).toContain('REDIS_URL=redis://redis:6379');
      expect(stdout).toContain('MQTT_BROKER_URL=mqtt://mosquitto:1883');
      expect(stdout).toContain('API_PORT=3001');
    });

    it('should have correct network connectivity between services', async () => {
      // Test backend can connect to database
      const { stdout: dbTest } = await execAsync(
        'docker-compose -f docker-compose.yml exec -T backend sh -c "nc -z postgres 5432 && echo DB_CONNECTED"'
      );
      expect(dbTest.trim()).toBe('DB_CONNECTED');

      // Test backend can connect to Redis
      const { stdout: redisTest } = await execAsync(
        'docker-compose -f docker-compose.yml exec -T backend sh -c "nc -z redis 6379 && echo REDIS_CONNECTED"'
      );
      expect(redisTest.trim()).toBe('REDIS_CONNECTED');

      // Test backend can connect to MQTT
      const { stdout: mqttTest } = await execAsync(
        'docker-compose -f docker-compose.yml exec -T backend sh -c "nc -z mosquitto 1883 && echo MQTT_CONNECTED"'
      );
      expect(mqttTest.trim()).toBe('MQTT_CONNECTED');
    });
  });

  describe('Volume Persistence', () => {
    it('should persist database data across container restarts', async () => {
      // Create test data
      const prisma = new PrismaClient({
        datasources: {
          db: {
            url: 'postgresql://meshtastic:meshtastic_password@localhost:5432/meshtastic_mapper'
          }
        }
      });

      try {
        // Create test network first
        const network = await prisma.network.create({
          data: {
            name: 'Persistence Test Network',
            mqttBroker: 'mqtt://test:1883',
            mqttCredentials: {},
            region: 'US',
            isActive: true
          }
        });

        await prisma.node.create({
          data: {
            nodeId: 'persistence_test',
            hexId: 'persist01',
            shortName: 'PERSIST',
            longName: 'Persistence Test Node',
            hardwareModel: 'TBEAM',
            role: 'ROUTER',
            isOnline: true,
            mqttConnected: true,
            networkId: network.id,
            lastSeen: new Date(),
            lastHeard: new Date()
          }
        });
      } finally {
        await prisma.$disconnect();
      }

      // Restart PostgreSQL container
      await execAsync('docker-compose -f docker-compose.yml restart postgres');
      
      // Wait for service to be ready
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Verify data persisted
      const prisma2 = new PrismaClient({
        datasources: {
          db: {
            url: 'postgresql://meshtastic:meshtastic_password@localhost:5432/meshtastic_mapper'
          }
        }
      });

      try {
        const node = await prisma2.node.findUnique({
          where: { nodeId: 'persistence_test' }
        });
        
        expect(node).toBeDefined();
        expect(node?.shortName).toBe('PERSIST');
        expect(node?.longName).toBe('Persistence Test Node');
      } finally {
        await prisma2.$disconnect();
      }
    });

    it('should persist Redis data across container restarts', async () => {
      // Set test data in Redis
      const redisClient = createClient({
        url: 'redis://localhost:6379'
      });

      try {
        await redisClient.connect();
        await redisClient.set('persistence_test', 'test_value_persist');
      } finally {
        await redisClient.quit();
      }

      // Restart Redis container
      await execAsync('docker-compose -f docker-compose.yml restart redis');
      
      // Wait for service to be ready
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Verify data persisted
      const redisClient2 = createClient({
        url: 'redis://localhost:6379'
      });

      try {
        await redisClient2.connect();
        const value = await redisClient2.get('persistence_test');
        expect(value).toBe('test_value_persist');
      } finally {
        await redisClient2.quit();
      }
    });

    it('should persist configuration files', async () => {
      // Check that configuration files are mounted correctly
      const { stdout: configCheck } = await execAsync(
        'docker-compose -f docker-compose.yml exec -T backend ls -la /app/config'
      );
      
      expect(configCheck).toContain('app.yml');
      expect(configCheck).toContain('mqtt.yml');
      expect(configCheck).toContain('database.yml');

      // Verify configuration content is accessible
      const { stdout: appConfig } = await execAsync(
        'docker-compose -f docker-compose.yml exec -T backend cat /app/config/app.yml'
      );
      
      expect(appConfig).toContain('app:');
      expect(appConfig).toContain('name:');
    });
  });

  describe('Production Configuration', () => {
    it('should validate production Docker Compose configuration', async () => {
      // Check if production profile exists
      const { stdout } = await execAsync('docker-compose -f docker-compose.yml config --profiles');
      expect(stdout).toContain('production');

      // Validate production services configuration
      const { stdout: prodConfig } = await execAsync(
        'docker-compose -f docker-compose.yml --profile production config'
      );
      
      expect(prodConfig).toContain('nginx:');
      expect(prodConfig).toContain('image: nginx:alpine');
      expect(prodConfig).toContain('ports:');
      expect(prodConfig).toContain('- "80:80"');
      expect(prodConfig).toContain('- "443:443"');
    });

    it('should have proper security configurations', async () => {
      // Check that sensitive data is not exposed in logs
      const { stdout: logs } = await execAsync('docker-compose -f docker-compose.yml logs backend');
      
      // Ensure passwords are not logged
      expect(logs).not.toContain('meshtastic_password');
      expect(logs).not.toContain('your-jwt-secret');

      // Check that proper security headers are configured
      const response = await axios.get('http://localhost:3001/api/health');
      
      // Verify security headers (these should be set by helmet middleware)
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });

    it('should handle graceful shutdown', async () => {
      // Send SIGTERM to backend container
      const { stdout: containerInfo } = await execAsync(
        'docker-compose -f docker-compose.yml ps -q backend'
      );
      const containerId = containerInfo.trim();

      if (containerId) {
        // Send graceful shutdown signal
        await execAsync(`docker kill -s SIGTERM ${containerId}`);
        
        // Wait a moment for graceful shutdown
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Check container status
        const { stdout: status } = await execAsync(`docker ps -a --filter id=${containerId} --format "{{.Status}}"`);
        expect(status).toContain('Exited');
      }

      // Restart the service
      await execAsync('docker-compose -f docker-compose.yml up -d backend');
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Verify service is healthy again
      const response = await axios.get('http://localhost:3001/health');
      expect(response.status).toBe(200);
    });
  });

  describe('Resource Limits and Performance', () => {
    it('should respect resource limits', async () => {
      // Check memory usage of containers
      const { stdout: stats } = await execAsync(
        'docker stats --no-stream --format "table {{.Container}}\\t{{.MemUsage}}\\t{{.CPUPerc}}"'
      );
      
      expect(stats).toContain('meshtastic-postgres');
      expect(stats).toContain('meshtastic-redis');
      expect(stats).toContain('meshtastic-backend');
      expect(stats).toContain('meshtastic-frontend');

      // Parse memory usage (basic check that containers are not using excessive memory)
      const lines = stats.split('\n').slice(1); // Skip header
      lines.forEach(line => {
        if (line.includes('meshtastic-')) {
          const parts = line.split(/\s+/);
          const memUsage = parts[1];
          
          // Basic sanity check - memory usage should be reported
          expect(memUsage).toMatch(/\d+(\.\d+)?(MiB|GiB)/);
        }
      });
    });

    it('should handle container health checks', async () => {
      // Wait for health checks to run
      await new Promise(resolve => setTimeout(resolve, 30000));

      // Check health status of all services
      const { stdout: healthStatus } = await execAsync(
        'docker-compose -f docker-compose.yml ps --format json'
      );

      const services = healthStatus.split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));

      services.forEach(service => {
        if (service.Name.includes('meshtastic-')) {
          // Service should be running
          expect(service.State).toBe('running');
          
          // If health check is configured, it should be healthy
          if (service.Health) {
            expect(service.Health).toBe('healthy');
          }
        }
      });
    });
  });
});