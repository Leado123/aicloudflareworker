#!/bin/bash

echo "🚀 Testing Docker deployment..."

# Clean up any existing containers
echo "📦 Cleaning up existing containers..."
docker stop astro-app 2>/dev/null || true
docker rm astro-app 2>/dev/null || true

# Build the Docker image
echo "🔨 Building Docker image..."
docker build -t astro-app .

# Run the container
echo "🏃 Starting container..."
docker run -d --name astro-app -p 4321:4321 -p 5432:5432 astro-app

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 45

# Check if app is responding
echo "🌐 Testing application health..."
curl -f http://localhost:4321/ || echo "❌ App health check failed"

# Show logs for debugging
echo "📋 Recent logs:"
docker logs --tail=30 astro-app

echo "✅ Test complete! If no errors above, your deployment should be working."
echo "🌍 Visit http://localhost:4321 to test your application"
echo "🛑 To stop: docker stop astro-app && docker rm astro-app"
