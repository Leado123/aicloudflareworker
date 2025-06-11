# Dockerfile for an Astro SSR project to run on Coolify (Node.js Build Runtime)

# Build stage
FROM oven/bun:1.1.9-alpine AS builder
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install
COPY . .
RUN bun run build

# Runtime stage
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
ENV PORT 4321
EXPOSE 4321
CMD ["node", "dist/server/entry.mjs"]