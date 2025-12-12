-- Initialize Meshtastic Node Mapper Database
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create initial tables will be handled by Prisma migrations
SELECT 'Database initialized successfully' as status;