# Dockerfile for an Astro SSR project with PostgreSQL
# Build stage - use Node.js for faster, more reliable builds
FROM node:20-alpine AS builder
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git python3 make g++ linux-headers

# Copy package files
COPY package.json bun.lockb ./

# Install dependencies with timeout and retry logic
RUN npm install --verbose --timeout=300000

# Copy source code
COPY . .

# Generate Prisma Client
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db?schema=public"
RUN npx prisma generate

# Build the application
RUN npm run build

# Runtime stage with PostgreSQL
FROM node:20-alpine

# Install PostgreSQL
RUN apk add --no-cache postgresql postgresql-contrib postgresql-client

WORKDIR /app

# Copy built application and essential files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

# Create postgres user first
RUN addgroup -g 70 -S postgres 2>/dev/null || true && \
    adduser -u 70 -S -D -G postgres -H -h /var/lib/postgresql -s /bin/sh postgres 2>/dev/null || true

# Create startup script
COPY <<EOF /start.sh
#!/bin/sh
set -e

echo "Starting PostgreSQL setup..."

# Create directories and set permissions
mkdir -p /var/run/postgresql /var/lib/postgresql/data
chown -R postgres:postgres /var/run/postgresql /var/lib/postgresql

# Initialize database if not exists
if [ ! -f /var/lib/postgresql/data/PG_VERSION ]; then
    echo "Initializing database..."
    su - postgres -c "initdb -D /var/lib/postgresql/data"
fi

# Start PostgreSQL if not running
if ! su - postgres -c "pg_ctl -D /var/lib/postgresql/data status" >/dev/null 2>&1; then
    echo "Starting PostgreSQL server..."
    su - postgres -c "pg_ctl -D /var/lib/postgresql/data -l /var/lib/postgresql/data/logfile start -w"
fi

# Wait for PostgreSQL to be ready
sleep 5

# Setup database and user (only once)
if [ ! -f /var/lib/postgresql/.setup_done ]; then
    echo "Setting up database and user..."
    
    # Create database
    su - postgres -c "createdb astrodb" 2>/dev/null || echo "Database astrodb already exists"
    
    # Create user with proper escaping
    su - postgres -c "psql -c \"CREATE USER astro WITH PASSWORD 'astro';\"" 2>/dev/null || echo "User astro already exists"
    
    # Grant privileges with proper escaping
    su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE astrodb TO astro;\""
    
    # Additional permissions for schema
    su - postgres -c "psql -d astrodb -c \"GRANT ALL ON SCHEMA public TO astro;\""
    su - postgres -c "psql -d astrodb -c \"GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO astro;\""
    su - postgres -c "psql -d astrodb -c \"GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO astro;\""
    
    echo "Running migrations..."
    cd /app && npx prisma migrate deploy
    
    # Mark setup as done
    touch /var/lib/postgresql/.setup_done
    echo "Database setup completed"
else
    echo "Database already set up, skipping initialization..."
fi

echo "Starting application..."
exec node dist/server/entry.mjs
EOF

RUN chmod +x /start.sh

ENV PORT=4321
ENV DATABASE_URL="postgresql://astro:astro@localhost:5432/astrodb?schema=public"
ENV GEMINI_API_KEY="AIzaSyCfNQuSrU46EFKrx_RKQCdtHT2jl3AcXBQ"

EXPOSE 4321 5432

CMD ["/start.sh"]
