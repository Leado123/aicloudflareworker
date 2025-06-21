# Dockerfile for an Astro SSR project with PostgreSQL
# Build stage - use the same bun version but with more build tools
FROM oven/bun:1.1.9-alpine AS builder
WORKDIR /app

# Install comprehensive build dependencies
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++ \
    sqlite \
    sqlite-dev \
    libc6-compat \
    linux-headers

# Copy package files
COPY package.json bun.lockb ./

# Set environment variables to help with native module compilation
ENV PYTHON=/usr/bin/python3
ENV MAKE=/usr/bin/make
ENV GCC=/usr/bin/gcc
ENV GXX=/usr/bin/g++

# Install dependencies with verbose logging for debugging
RUN bun install --verbose

# Copy source code
COPY . .

# Build the application
RUN bun run build

# Runtime stage with PostgreSQL
FROM node:20-alpine
# Install PostgreSQL and client
RUN apk add --no-cache postgresql postgresql-contrib postgresql-client
WORKDIR /app

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

# Create postgres user and initialize database
RUN addgroup -g 70 -S postgres && \
    adduser -u 70 -S -D -G postgres -H -h /var/lib/postgresql -s /bin/sh postgres && \
    mkdir -p /var/lib/postgresql/data && \
    chown -R postgres:postgres /var/lib/postgresql

# Initialize PostgreSQL database
USER postgres
RUN initdb -D /var/lib/postgresql/data

# Switch back to root to set up the startup script
USER root

# Create startup script
RUN echo '#!/bin/sh' > /start.sh && \
    echo 'su - postgres -c "pg_ctl -D /var/lib/postgresql/data -l /var/lib/postgresql/data/logfile start"' >> /start.sh && \
    echo 'sleep 5' >> /start.sh && \
    echo 'su - postgres -c "createdb -U postgres astrodb" || true' >> /start.sh && \
    echo 'su - postgres -c "psql -c \"CREATE USER astro WITH PASSWORD '"'"'astro'"'"';\""' >> /start.sh && \
    echo 'su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE astrodb TO astro;\""' >> /start.sh && \
    echo 'cd /app && npx prisma migrate deploy' >> /start.sh && \
    echo 'node dist/server/entry.mjs' >> /start.sh && \
    chmod +x /start.sh

ENV PORT=4321
ENV DATABASE_URL="postgresql://astro:astro@localhost:5432/astrodb?schema=public"

# Expose ports
EXPOSE 4321 5432

# Start both PostgreSQL and the application
CMD ["/start.sh"]
