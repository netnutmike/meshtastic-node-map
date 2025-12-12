-- TimescaleDB setup script for Meshtastic Node Mapper
-- This script should be run after the initial Prisma migration

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create hypertables for time-series data
-- Positions table - optimized for time-series queries
SELECT create_hypertable(
  'positions', 
  'timestamp',
  chunk_time_interval => INTERVAL '1 day',
  if_not_exists => TRUE
);

-- Telemetry readings table - optimized for time-series queries
SELECT create_hypertable(
  'telemetry_readings', 
  'timestamp',
  chunk_time_interval => INTERVAL '1 day',
  if_not_exists => TRUE
);

-- Messages table - optimized for time-series queries
SELECT create_hypertable(
  'messages', 
  'timestamp',
  chunk_time_interval => INTERVAL '1 day',
  if_not_exists => TRUE
);

-- Create additional indexes for better performance
-- Spatial index for positions (requires PostGIS extension)
-- CREATE EXTENSION IF NOT EXISTS postgis;
-- CREATE INDEX IF NOT EXISTS positions_location_idx ON positions USING GIST (ST_Point(longitude, latitude));

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS positions_node_time_idx ON positions (nodeId, timestamp DESC);
CREATE INDEX IF NOT EXISTS telemetry_node_type_time_idx ON telemetry_readings (nodeId, type, timestamp DESC);
CREATE INDEX IF NOT EXISTS messages_from_time_idx ON messages (fromNodeId, timestamp DESC);
CREATE INDEX IF NOT EXISTS messages_to_time_idx ON messages (toNodeId, timestamp DESC) WHERE toNodeId IS NOT NULL;

-- Create continuous aggregates for common analytics queries
-- Daily node activity summary
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_node_activity
WITH (timescaledb.continuous) AS
SELECT 
  time_bucket('1 day', timestamp) AS day,
  nodeId,
  COUNT(*) as position_updates,
  AVG(CASE WHEN altitude IS NOT NULL THEN altitude END) as avg_altitude,
  MIN(timestamp) as first_update,
  MAX(timestamp) as last_update
FROM positions
GROUP BY day, nodeId
WITH NO DATA;

-- Refresh policy for the continuous aggregate
SELECT add_continuous_aggregate_policy('daily_node_activity',
  start_offset => INTERVAL '3 days',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour');

-- Hourly telemetry summary
CREATE MATERIALIZED VIEW IF NOT EXISTS hourly_telemetry_summary
WITH (timescaledb.continuous) AS
SELECT 
  time_bucket('1 hour', timestamp) AS hour,
  nodeId,
  type,
  COUNT(*) as reading_count,
  AVG((data->>'batteryLevel')::numeric) as avg_battery_level,
  AVG((data->>'temperature')::numeric) as avg_temperature,
  AVG((data->>'voltage')::numeric) as avg_voltage
FROM telemetry_readings
WHERE data ? 'batteryLevel' OR data ? 'temperature' OR data ? 'voltage'
GROUP BY hour, nodeId, type
WITH NO DATA;

-- Refresh policy for telemetry summary
SELECT add_continuous_aggregate_policy('hourly_telemetry_summary',
  start_offset => INTERVAL '2 days',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour');

-- Data retention policies
-- Keep detailed position data for 90 days, then compress
SELECT add_retention_policy('positions', INTERVAL '90 days');

-- Keep detailed telemetry data for 30 days, then compress
SELECT add_retention_policy('telemetry_readings', INTERVAL '30 days');

-- Keep detailed message data for 7 days, then compress
SELECT add_retention_policy('messages', INTERVAL '7 days');

-- Compression policies for better storage efficiency
-- Compress position data older than 7 days
SELECT add_compression_policy('positions', INTERVAL '7 days');

-- Compress telemetry data older than 3 days
SELECT add_compression_policy('telemetry_readings', INTERVAL '3 days');

-- Compress message data older than 1 day
SELECT add_compression_policy('messages', INTERVAL '1 day');

-- Create functions for common queries
-- Function to get latest position for a node
CREATE OR REPLACE FUNCTION get_latest_position(node_id TEXT)
RETURNS TABLE (
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  altitude INTEGER,
  timestamp TIMESTAMP(3),
  source "PositionSource"
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.latitude, p.longitude, p.altitude, p.timestamp, p.source
  FROM positions p
  WHERE p.nodeId = node_id
  ORDER BY p.timestamp DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to get telemetry data for a time range
CREATE OR REPLACE FUNCTION get_telemetry_range(
  node_id TEXT,
  telemetry_type "TelemetryType",
  start_time TIMESTAMP(3),
  end_time TIMESTAMP(3)
)
RETURNS TABLE (
  timestamp TIMESTAMP(3),
  data JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT tr.timestamp, tr.data
  FROM telemetry_readings tr
  WHERE tr.nodeId = node_id
    AND tr.type = telemetry_type
    AND tr.timestamp >= start_time
    AND tr.timestamp <= end_time
  ORDER BY tr.timestamp ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get network statistics
CREATE OR REPLACE FUNCTION get_network_stats(network_id TEXT)
RETURNS TABLE (
  total_nodes BIGINT,
  online_nodes BIGINT,
  total_messages_24h BIGINT,
  avg_battery_level NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(n.id) as total_nodes,
    COUNT(CASE WHEN n.isOnline THEN 1 END) as online_nodes,
    (SELECT COUNT(*) FROM messages m 
     JOIN nodes n2 ON m.fromNodeId = n2.id 
     WHERE n2.networkId = network_id 
     AND m.timestamp >= NOW() - INTERVAL '24 hours') as total_messages_24h,
    AVG(n.batteryLevel) as avg_battery_level
  FROM nodes n
  WHERE n.networkId = network_id;
END;
$$ LANGUAGE plpgsql;

-- Create indexes on JSON fields for better performance
CREATE INDEX IF NOT EXISTS telemetry_battery_level_idx ON telemetry_readings 
USING BTREE ((data->>'batteryLevel')) WHERE data ? 'batteryLevel';

CREATE INDEX IF NOT EXISTS telemetry_temperature_idx ON telemetry_readings 
USING BTREE ((data->>'temperature')) WHERE data ? 'temperature';

CREATE INDEX IF NOT EXISTS telemetry_voltage_idx ON telemetry_readings 
USING BTREE ((data->>'voltage')) WHERE data ? 'voltage';

-- Grant necessary permissions
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO meshtastic_reader;
-- GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO meshtastic_writer;

COMMENT ON EXTENSION timescaledb IS 'TimescaleDB extension for time-series data optimization';
COMMENT ON TABLE positions IS 'Hypertable for storing node position data with time-series optimization';
COMMENT ON TABLE telemetry_readings IS 'Hypertable for storing telemetry data with time-series optimization';
COMMENT ON TABLE messages IS 'Hypertable for storing message data with time-series optimization';