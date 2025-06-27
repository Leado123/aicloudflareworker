# Dockerfile for an Astro SSR project with PostgreSQL
# Build stage - use Bun with optimized approach
FROM oven/bun:1.1.9-alpine AS builder
WORKDIR /app

# Install minimal build dependencies (avoiding libc6-compat conflicts)
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++ \
    linux-headers

# Copy package files for bun install
COPY package.json bun.lockb ./

# Set environment variables for Python if needed by native modules
ENV PYTHON=/usr/bin/python3

# Install dependencies using Bun
# Remove --production flag for build stage to get dev dependencies needed for build
RUN bun install --frozen-lockfile --ignore-scripts

# --- ADDED: Install tw-animate-css specifically if it's an external package ---
# This step is added as a separate RUN command to potentially debug issues if bun install fails for this specific package.
# If it's a direct dependency in package.json, the previous 'bun install' should handle it.
# This line is primarily for demonstration if it's a global tool or a peer dependency not handled by default.
# For most cases, ensuring it's in package.json and 'bun install' works is sufficient.
# Assuming 'tw-animate-css' is a public npm package.
# RUN bun add tw-animate-css

# Copy source code and Prisma schema for client generation
# Copying . before prisma generate ensures schema and other necessary files are present
COPY . .

# Generate Prisma Client after installing dependencies and copying source
# Set a temporary DATABASE_URL for build stage (Prisma needs this even just for generation)
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db?schema=public"
RUN bun x prisma generate

# Build the application using Bun
RUN bun run build

# Runtime stage with PostgreSQL
FROM node:20-alpine

# Install Bun globally for the runtime stage (needed for 'bun install' and 'bun x prisma')
RUN npm install -g bun && \
    # Install PostgreSQL and client
    apk add --no-cache postgresql postgresql-contrib postgresql-client

WORKDIR /app

# Copy only production package.json and bun.lockb for Bun production install
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/bun.lockb ./bun.lockb

# Install only production dependencies using Bun
# --production: Installs only production dependencies
# --ignore-scripts: Prevents running post-install scripts
RUN bun install --production --ignore-scripts

# Copy built application and essential files, including the generated Prisma client and schema
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
# Fix shell script syntax errors by properly escaping quotes
RUN echo '#!/bin/sh' > /start.sh && \
    echo 'echo "Starting PostgreSQL initialization..."' >> /start.sh && \
    echo 'mkdir -p /var/run/postgresql' >> /start.sh && \
    echo 'chown -R postgres:postgres /var/run/postgresql' >> /start.sh && \
    echo 'su - postgres -c "pg_ctl -D /var/lib/postgresql/data -l /var/lib/postgresql/data/logfile start -w"' >> /start.sh && \
    echo 'sleep 3' >> /start.sh && \
    echo 'echo "Creating database and user..."' >> /start.sh && \
    echo 'su - postgres -c "createdb -U postgres astrodb" || echo "Database astrodb already exists"' >> /start.sh && \
    echo 'su - postgres -c "psql -c \"CREATE USER astro WITH PASSWORD '\''astro'\''\"" || echo "User astro already exists"' >> /start.sh && \
    echo 'su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE astrodb TO astro\""' >> /start.sh && \
    echo 'su - postgres -c "psql -d astrodb -c \"GRANT ALL ON SCHEMA public TO astro\""' >> /start.sh && \
    echo 'su - postgres -c "psql -d astrodb -c \"GRANT CREATE ON SCHEMA public TO astro\""' >> /start.sh && \
    echo 'su - postgres -c "psql -d astrodb -c \"ALTER SCHEMA public OWNER TO astro\""' >> /start.sh && \
    echo 'echo "Running Prisma migrations..."' >> /start.sh && \
    echo 'cd /app && bun x prisma migrate deploy' >> /start.sh && \
    echo 'echo "Starting Node.js application..."' >> /start.sh && \
    echo 'node dist/server/entry.mjs' >> /start.sh && \
    chmod +x /start.sh

ENV PORT=4321
ENV DATABASE_URL="postgresql://astro:astro@localhost:5432/astrodb?schema=public"
ENV GEMINI_API_KEY="AIzaSyCfNQuSrU46EFKrx_RKQCdtHT2jl3AcXBQ"

# Expose ports
EXPOSE 4321 5432

# Start both PostgreSQL and the application
CMD ["/start.sh"]
