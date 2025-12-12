import { PrismaClient } from '@prisma/client';
import { NodeRole, LoRaRegion, TelemetryType, MessageType, MessagePriority, PositionSource } from '../src/types/database';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create a default network
  const defaultNetwork = await prisma.network.upsert({
    where: { id: 'default-network' },
    update: {},
    create: {
      id: 'default-network',
      name: 'Default Meshtastic Network',
      description: 'Default network for development and testing',
      mqttBroker: 'mqtt://localhost:1883',
      mqttCredentials: {
        username: 'meshtastic',
        password: 'meshtastic',
        clientId: 'meshtastic-node-mapper'
      },
      region: LoRaRegion.US,
      isActive: true
    }
  });

  console.log('✅ Created default network:', defaultNetwork.name);

  // Create default channels for the network
  const defaultChannel = await prisma.channel.upsert({
    where: {
      networkId_index: {
        networkId: defaultNetwork.id,
        index: 0
      }
    },
    update: {},
    create: {
      networkId: defaultNetwork.id,
      index: 0,
      name: 'Primary',
      psk: 'AQ==', // Default PSK
      frequency: BigInt(906875000), // 906.875 MHz for US region
      bandwidth: 250,
      spreadingFactor: 11,
      codingRate: 8,
      isDefault: true
    }
  });

  console.log('✅ Created default channel:', defaultChannel.name);

  // Create sample nodes for development
  const sampleNodes = [
    {
      nodeId: '!12345678',
      hexId: '12345678',
      shortName: 'NODE1',
      longName: 'Sample Node 1',
      hardwareModel: 'TBEAM',
      firmwareVersion: '2.2.0',
      role: NodeRole.ROUTER,
      isOnline: true,
      mqttConnected: true,
      batteryLevel: 85,
      voltage: 4.1,
      channelUtilization: 12.5,
      airUtilTx: 8.3
    },
    {
      nodeId: '!87654321',
      hexId: '87654321',
      shortName: 'NODE2',
      longName: 'Sample Node 2',
      hardwareModel: 'HELTEC_V3',
      firmwareVersion: '2.2.0',
      role: NodeRole.CLIENT,
      isOnline: true,
      mqttConnected: false,
      batteryLevel: 92,
      voltage: 4.2,
      channelUtilization: 5.2,
      airUtilTx: 3.1
    },
    {
      nodeId: '!ABCDEF01',
      hexId: 'ABCDEF01',
      shortName: 'NODE3',
      longName: 'Sample Node 3',
      hardwareModel: 'RAK4631',
      firmwareVersion: '2.1.22',
      role: NodeRole.CLIENT,
      isOnline: false,
      mqttConnected: false,
      batteryLevel: 45,
      voltage: 3.8,
      channelUtilization: 0,
      airUtilTx: 0
    }
  ];

  const createdNodes = [];
  for (const nodeData of sampleNodes) {
    const node = await prisma.node.upsert({
      where: { nodeId: nodeData.nodeId },
      update: nodeData,
      create: {
        ...nodeData,
        networkId: defaultNetwork.id,
        lastSeen: nodeData.isOnline ? new Date() : new Date(Date.now() - 3600000), // 1 hour ago if offline
        lastHeard: nodeData.isOnline ? new Date() : new Date(Date.now() - 3600000)
      }
    });
    createdNodes.push(node);
    console.log('✅ Created sample node:', node.shortName);
  }

  // Create sample positions
  const samplePositions = [
    {
      nodeId: createdNodes[0].id,
      latitude: 37.7749,
      longitude: -122.4194,
      altitude: 50,
      precision: 5,
      timestamp: new Date(),
      source: PositionSource.GPS
    },
    {
      nodeId: createdNodes[1].id,
      latitude: 37.7849,
      longitude: -122.4094,
      altitude: 75,
      precision: 8,
      timestamp: new Date(),
      source: PositionSource.GPS
    },
    {
      nodeId: createdNodes[2].id,
      latitude: 37.7649,
      longitude: -122.4294,
      altitude: 25,
      precision: 12,
      timestamp: new Date(Date.now() - 3600000), // 1 hour ago
      source: PositionSource.GPS
    }
  ];

  for (const positionData of samplePositions) {
    const position = await prisma.position.create({
      data: positionData
    });
    console.log('✅ Created sample position for node:', position.nodeId);
  }

  // Create sample telemetry data
  const now = new Date();
  const telemetryData = [
    {
      nodeId: createdNodes[0].id,
      type: TelemetryType.DEVICE_METRICS,
      timestamp: now,
      data: {
        batteryLevel: 85,
        voltage: 4.1,
        channelUtilization: 12.5,
        airUtilTx: 8.3,
        uptimeSeconds: 86400
      }
    },
    {
      nodeId: createdNodes[0].id,
      type: TelemetryType.ENVIRONMENT_METRICS,
      timestamp: now,
      data: {
        temperature: 22.5,
        humidity: 65.2,
        pressure: 1013.25
      }
    },
    {
      nodeId: createdNodes[1].id,
      type: TelemetryType.DEVICE_METRICS,
      timestamp: now,
      data: {
        batteryLevel: 92,
        voltage: 4.2,
        channelUtilization: 5.2,
        airUtilTx: 3.1,
        uptimeSeconds: 172800
      }
    }
  ];

  for (const telemetry of telemetryData) {
    const reading = await prisma.telemetryReading.create({
      data: telemetry
    });
    console.log('✅ Created sample telemetry reading:', reading.type);
  }

  // Create sample messages
  const sampleMessages = [
    {
      messageId: 'msg_001',
      fromNodeId: createdNodes[0].id,
      toNodeId: createdNodes[1].id,
      type: MessageType.TEXT,
      content: { text: 'Hello from Node 1!' },
      encrypted: false,
      hopLimit: 3,
      hopStart: 3,
      wantAck: true,
      priority: MessagePriority.DEFAULT,
      channel: 0,
      timestamp: new Date(),
      routingPath: [createdNodes[0].nodeId, createdNodes[1].nodeId],
      rssi: -85,
      snr: 8.5
    },
    {
      messageId: 'msg_002',
      fromNodeId: createdNodes[1].id,
      type: MessageType.POSITION,
      content: {
        latitude: 37.7849,
        longitude: -122.4094,
        altitude: 75
      },
      encrypted: false,
      hopLimit: 3,
      hopStart: 3,
      wantAck: false,
      priority: MessagePriority.DEFAULT,
      channel: 0,
      timestamp: new Date(),
      routingPath: [createdNodes[1].nodeId],
      rssi: -78,
      snr: 12.2
    }
  ];

  for (const messageData of sampleMessages) {
    const message = await prisma.message.create({
      data: messageData
    });
    console.log('✅ Created sample message:', message.type);
  }

  // Create sample neighbor relationships
  const neighborRelationships = [
    {
      nodeId: createdNodes[0].id,
      neighborId: createdNodes[1].id,
      rssi: -85,
      snr: 8.5,
      lastHeard: new Date(),
      hopCount: 1
    },
    {
      nodeId: createdNodes[1].id,
      neighborId: createdNodes[0].id,
      rssi: -82,
      snr: 9.2,
      lastHeard: new Date(),
      hopCount: 1
    },
    {
      nodeId: createdNodes[0].id,
      neighborId: createdNodes[2].id,
      rssi: -95,
      snr: 5.1,
      lastHeard: new Date(Date.now() - 1800000), // 30 minutes ago
      hopCount: 2
    }
  ];

  for (const neighbor of neighborRelationships) {
    const relationship = await prisma.nodeNeighbor.create({
      data: neighbor
    });
    console.log('✅ Created neighbor relationship');
  }

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });