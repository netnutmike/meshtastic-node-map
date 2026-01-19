# 🚨 CRITICAL: Deploy Transaction Fix NOW

## What The Diagnostics Show

```
idle_in_transaction: 36 connections  ← STUCK! Connection leak!
waiting: 100 connections              ← All waiting for a connection
Nodes: 17                             ← Barely working
Messages: 0, Positions: 0, Telemetry: 0  ← Nothing being stored
```

**The problem:** Transactions are being started but never committed/rolled back, leaving connections stuck.

**The solution:** The transaction fix I created wraps all operations properly, but **you haven't deployed it yet!**

## Deploy The Fix (3 Steps)

### Step 1: Kill Stuck Connections
```bash
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle in transaction';"
```

### Step 2: Rebuild Backend with Transaction Fix
```bash
docker compose -f docker-compose.prod.yml build --no-cache backend
```

### Step 3: Restart Backend
```bash
docker compose -f docker-compose.prod.yml restart backend
```

## Verify It's Working

Wait 30 seconds, then check:

```bash
# Should see nodes being created
docker compose -f docker-compose.prod.yml logs backend --tail=50 | grep "Created new node"

# Should see NO "idle in transaction"
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'idle in transaction';"

# Should see node count increasing
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT COUNT(*) FROM nodes;"
```

## What The Fix Does

The transaction fix I created earlier wraps ALL database operations for each MQTT message in a single `$transaction()` call. This ensures:

1. **All operations use 1 connection** (not 7-10)
2. **Transaction is automatically committed** when done
3. **Connection is released immediately** after commit
4. **No stuck "idle in transaction" connections**

## Why You're Seeing This

The current production code does this:
```typescript
// Each operation gets its own connection
await findNode();           // Connection 1 - may not be released
await createNode();         // Connection 2 - may not be released  
await createPosition();     // Connection 3 - may not be released
// ... connections pile up and never get released
```

The fix does this:
```typescript
await $transaction(async (tx) => {
  // All operations use same connection
  await tx.node.findUnique();
  await tx.node.create();
  await tx.position.create();
  // Transaction commits, connection released immediately
});
```

## Expected Results After Fix

**Before (current):**
- 36 stuck connections
- 100 waiting
- 17 nodes
- 0 messages/positions/telemetry

**After (with fix):**
- 0 stuck connections
- 0-5 waiting
- Nodes increasing steadily
- Messages/positions/telemetry being stored

## Timeline

- **T+0:** Kill stuck connections
- **T+30s:** Rebuild backend
- **T+1m:** Restart backend
- **T+2m:** Check for stuck connections (should be 0)
- **T+5m:** Verify node count increasing

---

**DO THIS NOW:**
```bash
# One command to do all 3 steps
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle in transaction';" && docker compose -f docker-compose.prod.yml build --no-cache backend && docker compose -f docker-compose.prod.yml restart backend
```

Then wait 2 minutes and run the diagnostics again:
```bash
./scripts/diagnose-connection-leak.sh
```

You should see 0 "idle in transaction" connections!
