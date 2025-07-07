# Dockerfile for an Astro SSR project with PostgreSQL
# Build stage - use Node.js instead of Bun for faster, more reliable builds
FROM oven/bun:1.1.9-alpine AS builder
WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./

# Use --no-save and --ignore-scripts to speed up
RUN bun install --frozen-lockfile --no-save --ignore-scripts --verbose

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

# Copy package files and install production dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application and essential files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Create postgres user and initialize database
RUN addgroup -g 70 -S postgres || true && \
    adduser -u 70 -S -D -G postgres -H -h /var/lib/postgresql -s /bin/sh postgres || true && \
    mkdir -p /var/lib/postgresql/data && \
    chown -R postgres:postgres /var/lib/postgresql

# Initialize PostgreSQL database
USER postgres
RUN initdb -D /var/lib/postgresql/data

# Switch back to root to set up the startup script
USER root

# Create startup script
RUN echo '#!/bin/sh' > /start.sh && \
    echo 'echo "Starting PostgreSQL..."' >> /start.sh && \
    echo 'mkdir -p /var/run/postgresql' >> /start.sh && \
    echo 'chown -R postgres:postgres /var/run/postgresql' >> /start.sh && \
    echo 'su - postgres -c "pg_ctl -D /var/lib/postgresql/data -l /var/lib/postgresql/data/logfile start -w"' >> /start.sh && \
    echo 'sleep 3' >> /start.sh && \
    echo 'echo "Setting up database..."' >> /start.sh && \
    echo 'su - postgres -c "createdb -U postgres astrodb" || echo "Database exists"' >> /start.sh && \
    echo 'su - postgres -c "psql -c \"CREATE USER astro WITH PASSWORD '\''astro'\''\"" || echo "User exists"' >> /start.sh && \
    echo 'su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE astrodb TO astro\""' >> /start.sh && \
    echo 'echo "Running migrations..."' >> /start.sh && \
    echo 'cd /app && npx prisma migrate deploy' >> /start.sh && \
    echo 'echo "Starting application..."' >> /start.sh && \
    echo 'node dist/server/entry.mjs' >> /start.sh && \
    chmod +x /start.sh

ENV PORT=4321
ENV DATABASE_URL="postgresql://astro:astro@localhost:5432/astrodb?schema=public"
ENV GEMINI_API_KEY="AIzaSyCfNQuSrU46EFKrx_RKQCdtHT2jl3AcXBQ"

EXPOSE 4321 5432

CMD ["/start.sh"]
