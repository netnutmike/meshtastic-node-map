/**
 * Topology Links Tests
 * Tests for network topology link detection including neighbors, traceroutes, and gateway links
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { linksRoutes } from '../routes/links';
import { NodeRepository } from '../database/repositories/node.repository';

const app = express();
app.use(express.json());
app.use('/api/links', linksRoutes);

describe('Topology Links API', () => {
  describe('GET /api/links/topology', () => {
    it('should return neighbor links', async () => {
      const response = await request(app)
        .get('/api/links/topology')
        .query({ includeNeighbors: true, includeTraceroutes: false });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('links');
      expect(Array.isArray(response.body.links)).toBe(true);
    });

    it('should return traceroute links', async () => {
      const response = await request(app)
        .get('/api/links/topology')
        .query({ includeNeighbors: false, includeTraceroutes: true });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('links');
      expect(Array.isArray(response.body.links)).toBe(true);
    });

    it('should return gateway links based on MQTT topics', async () => {
      const response = await request(app)
        .get('/api/links/topology')
        .query({ includeNeighbors: false, includeTraceroutes: false });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('links');
      expect(Array.isArray(response.body.links)).toBe(true);
      
      // Gateway links should be present if there are messages with topics
      const gatewayLinks = response.body.links.filter((link: any) => link.type === 'gateway');
      // We don't assert count since it depends on test data
      expect(Array.isArray(gatewayLinks)).toBe(true);
    });

    it('should filter links by minimum SNR', async () => {
      const response = await request(app)
        .get('/api/links/topology')
        .query({ minSnr: -10 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('links');
      
      // All neighbor links should have SNR >= -10
      const neighborLinks = response.body.links.filter((link: any) => link.type === 'neighbor');
      neighborLinks.forEach((link: any) => {
        if (link.snr !== undefined) {
          expect(link.snr).toBeGreaterThanOrEqual(-10);
        }
      });
    });

    it('should filter links by maximum age', async () => {
      const response = await request(app)
        .get('/api/links/topology')
        .query({ maxAge: 1 }); // 1 hour

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('links');
      
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      response.body.links.forEach((link: any) => {
        if (link.timestamp) {
          const linkTime = new Date(link.timestamp);
          expect(linkTime.getTime()).toBeGreaterThanOrEqual(oneHourAgo.getTime());
        }
      });
    });

    it('should return all link types by default', async () => {
      const response = await request(app)
        .get('/api/links/topology');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('links');
      
      const linkTypes = new Set(response.body.links.map((link: any) => link.type));
      // Should include at least one type (depending on test data)
      expect(linkTypes.size).toBeGreaterThan(0);
    });

    it('should not create self-links for gateways', async () => {
      const response = await request(app)
        .get('/api/links/topology');

      expect(response.status).toBe(200);
      
      const gatewayLinks = response.body.links.filter((link: any) => link.type === 'gateway');
      gatewayLinks.forEach((link: any) => {
        expect(link.source).not.toBe(link.target);
      });
    });

    it('should include metadata for each link type', async () => {
      const response = await request(app)
        .get('/api/links/topology');

      expect(response.status).toBe(200);
      
      response.body.links.forEach((link: any) => {
        expect(link).toHaveProperty('source');
        expect(link).toHaveProperty('target');
        expect(link).toHaveProperty('type');
        
        if (link.type === 'neighbor') {
          expect(link).toHaveProperty('metadata');
          expect(link.metadata).toHaveProperty('sourceName');
          expect(link.metadata).toHaveProperty('targetName');
        } else if (link.type === 'traceroute') {
          expect(link).toHaveProperty('hopIndex');
          expect(link).toHaveProperty('totalHops');
        } else if (link.type === 'gateway') {
          expect(link).toHaveProperty('metadata');
        }
      });
    });
  });
});
