# Dockerfile for an Astro SSR project to run on Coolify (Node.js Build Runtime)

# Stage 1: Build the Astro project
# We use an oven/bun image to leverage Bun for dependency management and building
FROM oven/bun:1.1.9-alpine AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and bun.lockb to leverage Docker build cache
# This ensures dependencies are re-installed only when they change.
COPY package.json ./
COPY bun.lockb ./

# Install project dependencies using Bun
# bun install is fast and uses bun.lockb for reproducible installs.
RUN bun install

# Copy the rest of your Astro project source code
COPY . .

# Run the Astro build command.
# This command will:
# - Generate static assets in `dist/client/`.
# - Generate the server-side entrypoint in `dist/server/entry.mjs`.
RUN bun run build

# Stage 2: Create a minimal runtime image for the built SSR application
# We use a Node.js image as the Node.js adapter generates a standard Node.js server.
FROM node:20-alpine

# Set the working directory
WORKDIR /app

# Copy only the necessary files from the builder stage:
# 1. The entire 'dist' directory containing both static client assets and server-side code.
# 2. Production-only 'node_modules' as the server will need these at runtime.
#    We install them here to ensure the final image is slim.
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
# If you have public static assets not referenced by Astro's build (e.g., /public/favicon.ico)
# ensure they are copied. Astro's default build moves them to dist/client, so usually not needed.
# COPY --from=builder /app/public ./public

# Define the port your Astro server will listen on.
# The Astro Node.js adapter will default to process.env.PORT or 3000.
ENV PORT 4321
EXPOSE 4321

# Command to start the Astro SSR server.
# This executes the generated Node.js server entry point.
CMD ["node", "dist/server/entry.mjs"]