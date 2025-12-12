// Repository exports
export { BaseRepository, PaginationOptions, PaginatedResult } from './base.repository';
export { NodeRepository } from './node.repository';
export { NetworkRepository } from './network.repository';
export { PositionRepository } from './position.repository';
export { TelemetryRepository } from './telemetry.repository';
export { MessageRepository } from './message.repository';

import { NodeRepository } from './node.repository';
import { NetworkRepository } from './network.repository';
import { PositionRepository } from './position.repository';
import { TelemetryRepository } from './telemetry.repository';
import { MessageRepository } from './message.repository';

// Repository instances (singletons)
let nodeRepository: NodeRepository;
let networkRepository: NetworkRepository;
let positionRepository: PositionRepository;
let telemetryRepository: TelemetryRepository;
let messageRepository: MessageRepository;

export function getNodeRepository(): NodeRepository {
  if (!nodeRepository) {
    nodeRepository = new NodeRepository();
  }
  return nodeRepository;
}

export function getNetworkRepository(): NetworkRepository {
  if (!networkRepository) {
    networkRepository = new NetworkRepository();
  }
  return networkRepository;
}

export function getPositionRepository(): PositionRepository {
  if (!positionRepository) {
    positionRepository = new PositionRepository();
  }
  return positionRepository;
}

export function getTelemetryRepository(): TelemetryRepository {
  if (!telemetryRepository) {
    telemetryRepository = new TelemetryRepository();
  }
  return telemetryRepository;
}

export function getMessageRepository(): MessageRepository {
  if (!messageRepository) {
    messageRepository = new MessageRepository();
  }
  return messageRepository;
}