# Quick Fix: Frontend Not Loading Data

## The Problem
Frontend loads but shows no nodes/data. Browser console shows errors connecting to `localhost`.

## The Fix (2 minutes)

### On your production server:

```bash
# 1. Run the fix script
./scripts/fix-frontend-urls.sh villagesmesh.com

# 2. Wait for it to complete (about 2 minutes)

# 3. Clear your browser cache
#    Chrome/Firefox: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
#    Or open in incognito mode
```

That's it! Your frontend should now load data correctly.

## What This Does

1. Stops the frontend container
2. Rebuilds it with correct API URLs (`/api/v1` instead of `localhost`)
3. Starts the frontend back up
4. Runs health checks

## Verify It Worked

Open `http://villagesmesh.com` in your browser:
- ✓ Nodes appear on the map
- ✓ Statistics show data
- ✓ No "localhost" errors in console (F12)

## If Using HTTPS

```bash
./scripts/fix-frontend-urls.sh villagesmesh.com https
```

## Need Help?

Check the logs:
```bash
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f backend
```

See `FRONTEND_URL_FIX_COMPLETE.md` for detailed troubleshooting.
