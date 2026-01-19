#!/bin/sh
set -e

echo "🔧 Starting Meshtastic Node Mapper Backend..."

# Wait for database to be ready
echo "⏳ Waiting for database..."
until npx prisma db execute --stdin <<EOF
SELECT 1;
EOF
do
  echo "Database is unavailable - sleeping"
  sleep 2
done

echo "✓ Database is ready"

# Run migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy || {
  echo "⚠️  Migration deploy failed, trying db push..."
  npx prisma db push --accept-data-loss || {
    echo "❌ Failed to apply schema"
    exit 1
  }
}

echo "✓ Database schema is up to date"

# Generate Prisma client (in case it's not generated)
echo "🔄 Generating Prisma client..."
npx prisma generate

echo "✓ Prisma client generated"

# Start the application
echo "🚀 Starting application..."
exec "$@"
