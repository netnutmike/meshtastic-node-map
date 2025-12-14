import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mock the validation middleware to avoid DOMPurify issues
jest.mock('../middleware/validation', () => ({
  validate: () => (req: any, res: any, next: any) => next()
}));

// Mock the coverage analysis service
jest.mock('../services/coverage-analysis.service', () => ({
  coverageAnalysisService: {
    calculateRadioRanges: jest.fn(),
    identifyCoverageGaps: jest.fn(),
    simulateDeployment: jest.fn(),
    calculateLineOfSight: jest.fn(),
    estimatePerformance: jest.fn(),
    generateOptimizationRecommendations: jest.fn(),
    getTerrainElevation: jest.fn(),
  },
}));

const { coverageAnalysisService } = require('../services/coverage-analysis.service');

// Import the routes after mocking
import coverageAnalysisRoutes from '../routes/coverage-analysis';

describe('Coverage Analysis Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/coverage-analysis', coverageAnalysisRoutes);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('GET /radio-ranges', () => {
    it('should return radio ranges for all nodes', async () => {
      // Arrange
      const mockRanges = [
        {
          nodeId: 'node1',
          latitude: 40.7128,
          longitude: -74.0060,
          rangeMeters: 10000,
          hardwareModel: 'TBEAM'
        }
      ];
      
      coverageAnalysisService.calculateRadioRanges.mockResolvedValue(mockRanges);

      // Act
      const response = await request(app)
        .get('/api/coverage-analysis/radio-ranges')
        .expect(200);

      // Assert
      expect(response.body).toEqual(mockRanges);
      expect(coverageAnalysisService.calculateRadioRanges).toHaveBeenCalledWith(undefined);
    });

    it('should filter by network ID when provided', async () => {
      // Arrange
      const networkId = 'network123';
      coverageAnalysisService.calculateRadioRanges.mockResolvedValue([]);

      // Act
      await request(app)
        .get('/api/coverage-analysis/radio-ranges')
        .query({ networkId })
        .expect(200);

      // Assert
      expect(coverageAnalysisService.calculateRadioRanges).toHaveBeenCalledWith(networkId);
    });

    it('should handle service errors', async () => {
      // Arrange
      coverageAnalysisService.calculateRadioRanges.mockRejectedValue(new Error('Service error'));

      // Act
      const response = await request(app)
        .get('/api/coverage-analysis/radio-ranges')
        .expect(500);

      // Assert
      expect(response.body).toEqual({ error: 'Failed to calculate radio ranges' });
    });
  });

  describe('GET /coverage-gaps', () => {
    it('should return coverage gaps', async () => {
      // Arrange
      const mockGaps = [
        {
          id: 'gap1',
          latitude: 40.7300,
          longitude: -74.0000,
          gapRadius: 15000,
          severity: 'high',
          nearestNodes: [{ nodeId: 'node1', distance: 15000 }]
        }
      ];
      
      coverageAnalysisService.identifyCoverageGaps.mockResolvedValue(mockGaps);

      // Act
      const response = await request(app)
        .get('/api/coverage-analysis/coverage-gaps')
        .expect(200);

      // Assert
      expect(response.body).toEqual(mockGaps);
      expect(coverageAnalysisService.identifyCoverageGaps).toHaveBeenCalledWith(undefined);
    });

    it('should filter by network ID when provided', async () => {
      // Arrange
      const networkId = 'network123';
      coverageAnalysisService.identifyCoverageGaps.mockResolvedValue([]);

      // Act
      await request(app)
        .get('/api/coverage-analysis/coverage-gaps')
        .query({ networkId })
        .expect(200);

      // Assert
      expect(coverageAnalysisService.identifyCoverageGaps).toHaveBeenCalledWith(networkId);
    });
  });

  describe('POST /simulate-deployment', () => {
    it('should simulate deployment of hypothetical nodes', async () => {
      // Arrange
      const hypotheticalNodes = [
        {
          id: 'hyp1',
          latitude: 40.7589,
          longitude: -73.9851,
          hardwareModel: 'TBEAM'
        }
      ];

      const mockResult = {
        coverageImprovement: 25.5,
        connectivityImprovement: 15.2,
        newConnections: [{ from: 'node1', to: 'hyp1', distance: 5000 }]
      };

      coverageAnalysisService.simulateDeployment.mockResolvedValue(mockResult);

      // Act
      const response = await request(app)
        .post('/api/coverage-analysis/simulate-deployment')
        .send({ hypotheticalNodes })
        .expect(200);

      // Assert
      expect(response.body).toEqual(mockResult);
      expect(coverageAnalysisService.simulateDeployment).toHaveBeenCalledWith(hypotheticalNodes, undefined);
    });

    it('should handle missing request body', async () => {
      // Arrange
      coverageAnalysisService.simulateDeployment.mockRejectedValue(new Error('Missing hypothetical nodes'));

      // Act
      const response = await request(app)
        .post('/api/coverage-analysis/simulate-deployment')
        .send({})
        .expect(500);

      // Assert
      expect(response.body).toEqual({ error: 'Failed to simulate deployment' });
    });

    it('should handle invalid hypothetical nodes structure', async () => {
      // Arrange
      coverageAnalysisService.simulateDeployment.mockRejectedValue(new Error('Invalid node structure'));

      // Act
      const response = await request(app)
        .post('/api/coverage-analysis/simulate-deployment')
        .send({
          hypotheticalNodes: [
            {
              id: 'hyp1',
              latitude: 'invalid', // Should be number
              longitude: -73.9851,
              hardwareModel: 'TBEAM'
            }
          ]
        })
        .expect(500);

      // Assert
      expect(response.body).toEqual({ error: 'Failed to simulate deployment' });
    });
  });

  describe('GET /line-of-sight/:fromNodeId/:toNodeId', () => {
    it('should calculate line of sight between nodes', async () => {
      // Arrange
      const mockResult = {
        fromNodeId: 'node1',
        toNodeId: 'node2',
        hasLineOfSight: true,
        fresnelZoneClearance: 1.5
      };

      coverageAnalysisService.calculateLineOfSight.mockResolvedValue(mockResult);

      // Act
      const response = await request(app)
        .get('/api/coverage-analysis/line-of-sight/node1/node2')
        .expect(200);

      // Assert
      expect(response.body).toEqual(mockResult);
      expect(coverageAnalysisService.calculateLineOfSight).toHaveBeenCalledWith('node1', 'node2', undefined);
    });

    it('should handle network ID parameter', async () => {
      // Arrange
      const networkId = 'network123';
      const mockResult = {
        fromNodeId: 'node1',
        toNodeId: 'node2',
        hasLineOfSight: false,
        obstacleElevation: 200,
        fresnelZoneClearance: 0.5
      };

      coverageAnalysisService.calculateLineOfSight.mockResolvedValue(mockResult);

      // Act
      await request(app)
        .get('/api/coverage-analysis/line-of-sight/node1/node2')
        .query({ networkId })
        .expect(200);

      // Assert
      expect(coverageAnalysisService.calculateLineOfSight).toHaveBeenCalledWith('node1', 'node2', networkId);
    });
  });

  describe('GET /performance-estimate/:fromNodeId/:toNodeId', () => {
    it('should estimate performance between nodes', async () => {
      // Arrange
      const mockResult = {
        messageDeliveryRate: 0.95,
        averageLatency: 150,
        hopCount: 2,
        signalStrength: -85.5
      };

      coverageAnalysisService.estimatePerformance.mockResolvedValue(mockResult);

      // Act
      const response = await request(app)
        .get('/api/coverage-analysis/performance-estimate/node1/node2')
        .expect(200);

      // Assert
      expect(response.body).toEqual(mockResult);
      expect(coverageAnalysisService.estimatePerformance).toHaveBeenCalledWith('node1', 'node2', undefined);
    });
  });

  describe('GET /optimization-recommendations', () => {
    it('should return optimization recommendations', async () => {
      // Arrange
      const mockResult = {
        suggestedPlacements: [
          {
            latitude: 40.7350,
            longitude: -74.0050,
            priority: 'high',
            reason: 'Coverage gap with 15000m radius to nearest node',
            expectedImprovement: 15.5
          }
        ],
        coverageImprovement: 25.3,
        connectivityImprovement: 18.7
      };

      coverageAnalysisService.generateOptimizationRecommendations.mockResolvedValue(mockResult);

      // Act
      const response = await request(app)
        .get('/api/coverage-analysis/optimization-recommendations')
        .expect(200);

      // Assert
      expect(response.body).toEqual(mockResult);
      expect(coverageAnalysisService.generateOptimizationRecommendations).toHaveBeenCalledWith(undefined);
    });
  });

  describe('GET /terrain-elevation', () => {
    it('should return terrain elevation', async () => {
      // Arrange
      const elevation = 150.5;
      coverageAnalysisService.getTerrainElevation.mockResolvedValue(elevation);

      // Act
      const response = await request(app)
        .get('/api/coverage-analysis/terrain-elevation')
        .query({ latitude: 40.7128, longitude: -74.0060 })
        .expect(200);

      // Assert
      expect(response.body).toEqual({ elevation });
      expect(coverageAnalysisService.getTerrainElevation).toHaveBeenCalledWith(40.7128, -74.0060);
    });

    it('should handle invalid latitude parameters', async () => {
      // Arrange
      coverageAnalysisService.getTerrainElevation.mockRejectedValue(new Error('Invalid latitude'));

      // Act
      const response = await request(app)
        .get('/api/coverage-analysis/terrain-elevation')
        .query({ latitude: 'invalid', longitude: -74.0060 })
        .expect(500);

      // Assert
      expect(response.body).toEqual({ error: 'Failed to get terrain elevation' });
    });

    it('should handle out of range latitude', async () => {
      // Arrange
      coverageAnalysisService.getTerrainElevation.mockRejectedValue(new Error('Latitude out of range'));

      // Act
      const response = await request(app)
        .get('/api/coverage-analysis/terrain-elevation')
        .query({ latitude: 91, longitude: -74.0060 })
        .expect(500);

      // Assert
      expect(response.body).toEqual({ error: 'Failed to get terrain elevation' });
    });

    it('should handle out of range longitude', async () => {
      // Arrange
      coverageAnalysisService.getTerrainElevation.mockRejectedValue(new Error('Longitude out of range'));

      // Act
      const response = await request(app)
        .get('/api/coverage-analysis/terrain-elevation')
        .query({ latitude: 40.7128, longitude: 181 })
        .expect(500);

      // Assert
      expect(response.body).toEqual({ error: 'Failed to get terrain elevation' });
    });
  });
});