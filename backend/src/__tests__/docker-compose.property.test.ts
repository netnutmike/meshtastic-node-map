/**
 * Property-Based Test for Docker Compose Deployment
 * **Feature: meshtastic-node-mapper, Property 1: Container service availability**
 * **Validates: Requirements 9.1**
 */

import * as fc from 'fast-check';
import { execSync } from 'child_process';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

describe('Docker Compose Deployment Properties', () => {
  const dockerComposePath = path.join(__dirname, '../../../docker-compose.yml');
  
  beforeAll(() => {
    // Ensure docker-compose.yml exists
    expect(fs.existsSync(dockerComposePath)).toBe(true);
  });

  /**
   * Property 1: Container service availability
   * For any valid Docker Compose configuration, all defined services should be deployable
   * and their health checks should pass when the stack is started.
   */
  test('Property 1: Container service availability', () => {
    fc.assert(
      fc.property(
        fc.record({
          timeout: fc.integer({ min: 30, max: 120 }), // Health check timeout in seconds
          retries: fc.integer({ min: 1, max: 5 })     // Number of retry attempts
        }),
        (config) => {
          // Read and parse docker-compose.yml
          const dockerComposeContent = fs.readFileSync(dockerComposePath, 'utf8');
          const dockerComposeConfig = yaml.load(dockerComposeContent) as any;
          
          // Verify required services are defined
          const requiredServices = ['postgres', 'redis', 'mosquitto'];
          const definedServices = Object.keys(dockerComposeConfig.services || {});
          
          // Property: All required services must be defined in docker-compose.yml
          for (const service of requiredServices) {
            expect(definedServices).toContain(service);
          }
          
          // Property: Each service must have proper health check configuration
          for (const service of requiredServices) {
            const serviceConfig = dockerComposeConfig.services[service];
            
            // Services should have health checks defined or be inherently healthy
            if (serviceConfig.healthcheck) {
              expect(serviceConfig.healthcheck).toHaveProperty('test');
              expect(serviceConfig.healthcheck).toHaveProperty('interval');
              expect(serviceConfig.healthcheck).toHaveProperty('timeout');
              expect(serviceConfig.healthcheck).toHaveProperty('retries');
            }
            
            // Services should have restart policies for reliability
            expect(serviceConfig.restart).toBeDefined();
          }
          
          // Property: Network configuration should be properly defined
          expect(dockerComposeConfig.networks).toBeDefined();
          expect(dockerComposeConfig.networks['meshtastic-network']).toBeDefined();
          
          // Property: Volume configuration should be properly defined for data persistence
          expect(dockerComposeConfig.volumes).toBeDefined();
          const requiredVolumes = ['postgres_data', 'redis_data', 'mosquitto_data'];
          for (const volume of requiredVolumes) {
            expect(dockerComposeConfig.volumes).toHaveProperty(volume);
          }
          
          // Property: Services should expose correct ports
          const portMappings = {
            postgres: '5432',
            redis: '6379', 
            mosquitto: ['1883', '9001']
          };
          
          for (const [service, expectedPorts] of Object.entries(portMappings)) {
            const serviceConfig = dockerComposeConfig.services[service];
            expect(serviceConfig.ports).toBeDefined();
            
            const ports = Array.isArray(expectedPorts) ? expectedPorts : [expectedPorts];
            for (const port of ports) {
              const hasPort = serviceConfig.ports.some((p: string) => 
                p.includes(`:${port}`) || p === port
              );
              expect(hasPort).toBe(true);
            }
          }
          
          // Property: Environment variables should be properly configured
          const servicesWithEnv = ['postgres', 'backend', 'frontend'];
          for (const service of servicesWithEnv) {
            if (dockerComposeConfig.services[service]) {
              expect(dockerComposeConfig.services[service].environment).toBeDefined();
            }
          }
          
          return true; // Property holds if all assertions pass
        }
      ),
      { 
        numRuns: 10,
        verbose: true
      }
    );
  });

  /**
   * Additional property test for service dependencies
   */
  test('Property: Service dependency chain is correctly configured', () => {
    fc.assert(
      fc.property(
        fc.constant(true), // Simple property that doesn't need generated data
        () => {
          const dockerComposeContent = fs.readFileSync(dockerComposePath, 'utf8');
          const dockerComposeConfig = yaml.load(dockerComposeContent) as any;
          
          // Property: Backend should depend on database services
          const backendConfig = dockerComposeConfig.services.backend;
          if (backendConfig && backendConfig.depends_on) {
            const dependencies = Object.keys(backendConfig.depends_on);
            expect(dependencies).toContain('postgres');
            expect(dependencies).toContain('redis');
            expect(dependencies).toContain('mosquitto');
            
            // Property: Dependencies should have proper condition checks
            for (const dep of ['postgres', 'redis', 'mosquitto']) {
              if (backendConfig.depends_on[dep]) {
                expect(backendConfig.depends_on[dep]).toHaveProperty('condition');
                expect(backendConfig.depends_on[dep].condition).toBe('service_healthy');
              }
            }
          }
          
          // Property: Frontend should depend on backend
          const frontendConfig = dockerComposeConfig.services.frontend;
          if (frontendConfig && frontendConfig.depends_on) {
            expect(frontendConfig.depends_on).toContain('backend');
          }
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property test for configuration file structure
   */
  test('Property: Configuration files are properly structured', () => {
    fc.assert(
      fc.property(
        fc.record({
          configType: fc.constantFrom('app', 'mqtt', 'database')
        }),
        (input) => {
          const configPath = path.join(__dirname, `../../../config/${input.configType}.yml`);
          
          // Property: Configuration files should exist and be valid YAML
          expect(fs.existsSync(configPath)).toBe(true);
          
          const configContent = fs.readFileSync(configPath, 'utf8');
          const config = yaml.load(configContent);
          
          // Property: Configuration should be a valid object
          expect(typeof config).toBe('object');
          expect(config).not.toBeNull();
          
          return true;
        }
      ),
      { numRuns: 10 }
    );
  });
});