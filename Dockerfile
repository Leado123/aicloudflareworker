# Dockerfile for an Astro SSR project to run on Coolify (Node.js Build Runtime) (with PostgreSQL)
# Build stage
FROM oven/bun:1.1.9-alpine AS builder
WORKDIR /app
RUN apk add --no-cache git python3 make g++
COPY package.json bun.lockb ./
RUN bun install
COPY . .
RUN bun run build
# Runtime stage
FROM node:20-alpine
# Install PostgreSQL client
RUN apt-get update && apt-get install -y postgresql-client --no-install-recommends && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
ENV PORT 4321
EXPOSE 4321
# Add PostgreSQL service
FROM postgres:16-alpine AS postgres_server
ENV POSTGRES_USER=astro
ENV POSTGRES_PASSWORD=astro
ENV POSTGRES_DB=astrodb
# Combine the application and database into a single image
FROM node:20-alpine
# Install PostgreSQL client
RUN apt-get update && apt-get install -y postgresql-client --no-install-recommends && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
# Copy PostgreSQL data
COPY --from=postgres_server /var/lib/postgresql/data /var/lib/postgresql/data
# Copy PostgreSQL configuration
COPY --from=postgres_server /usr/local/bin/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
# Expose the application port
EXPOSE 4321
# Expose the PostgreSQL port
EXPOSE 5432
# Set environment variables for PostgreSQL
ENV POSTGRES_USER=astro
ENV POSTGRES_PASSWORD=astro
ENV POSTGRES_DB=astrodb
# Start PostgreSQL and then the Node.js application
CMD service postgresql start && node dist/server/entry.mjs
