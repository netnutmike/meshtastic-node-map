#!/bin/bash

# Diagnose Database Connection Leak
# Checks for stuck connections and provides recommendations

echo "=========================================="
echo "Database Connection Leak Diagnostics"
echo "=========================================="

echo ""
echo "Step 1: Checking PostgreSQL connection stats..."
docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper <<'EOF'
SELECT 
    count(*) as total_connections,
    count(*) FILTER (WHERE state = 'active') as active,
    count(*) FILTER (WHERE state = 'idle') as idle,
    count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction,
    count(*) FILTER (WHERE wait_event_type IS NOT NULL) as waiting
FROM pg_stat_activity 
WHERE datname = 'meshtastic_mapper';
EOF

echo ""
echo "Step 2: Checking for long-running queries..."
docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper <<'EOF'
SELECT 
    pid,
    now() - query_start as duration,
    state,
    wait_event_type,
    wait_event,
    left(query, 100) as query
FROM pg_stat_activity 
WHERE datname = 'meshtastic_mapper' 
  AND state != 'idle'
  AND query_start < now() - interval '5 seconds'
ORDER BY duration DESC
LIMIT 10;
EOF

echo ""
echo "Step 3: Checking database statistics..."
docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper <<'EOF'
SELECT 
    'Nodes' as table_name, COUNT(*) as count FROM nodes
UNION ALL
SELECT 'Messages', COUNT(*) FROM messages
UNION ALL
SELECT 'Positions', COUNT(*) FROM positions
UNION ALL
SELECT 'Telemetry', COUNT(*) FROM telemetry_readings;
EOF

echo ""
echo "Step 4: Checking backend logs for errors..."
ERROR_COUNT=$(docker compose -f docker-compose.prod.yml logs backend --tail=200 | grep -c "connection pool" || echo "0")
echo "Connection pool errors in last 200 lines: $ERROR_COUNT"

echo ""
echo "Step 5: Checking for stuck transactions..."
docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper <<'EOF'
SELECT 
    pid,
    usename,
    application_name,
    state,
    now() - xact_start as transaction_duration
FROM pg_stat_activity 
WHERE datname = 'meshtastic_mapper' 
  AND xact_start IS NOT NULL
  AND state = 'idle in transaction'
ORDER BY transaction_duration DESC;
EOF

echo ""
echo "=========================================="
echo "Recommendations"
echo "=========================================="
echo ""
echo "If you see:"
echo "- Many 'idle in transaction' connections → Connection leak in code"
echo "- Many 'active' connections → Slow queries or high load"
echo "- Many 'waiting' connections → Lock contention"
echo ""
echo "Quick fixes:"
echo "1. Restart backend to clear stuck connections:"
echo "   docker compose -f docker-compose.prod.yml restart backend"
echo ""
echo "2. Kill stuck connections (if any shown above):"
echo "   docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c \"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle in transaction' AND now() - xact_start > interval '1 minute';\""
echo ""
