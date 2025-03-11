#!/bin/bash
# Integration test script for PerchPics with HMA

echo "Starting integration test for PerchPics with HMA..."

# Step 1: Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "Error: Docker is not running. Please start Docker and try again."
  exit 1
fi

# Step 2: Check for perchpics directory
if [ ! -d "../perchpics" ]; then
  echo "Error: The perchpics directory is not found at ../perchpics"
  echo "Please ensure it's in the correct location relative to atproto-hma."
  exit 1
fi

# Step 3: Build and start services
echo "Building and starting all services..."
docker-compose down -v
docker-compose up -d --build

# Step 4: Wait for services to be ready
echo "Waiting for services to start (this may take a minute)..."
sleep 15  # Increased wait time to allow services to initialize

# Step 5: Check service health
echo "Checking service health..."

# Check HMA service
if curl -s http://localhost:5000/health | grep -q "healthy"; then
  echo "✅ HMA service is running."
else
  echo "❌ Error: HMA service is not responding properly."
  docker-compose logs hma
  exit 1
fi

# Check atproto-hma service
if curl -s http://localhost:3000/health | grep -q "healthy"; then
  echo "✅ atproto-hma service is running."
else
  echo "❌ Error: atproto-hma service is not responding properly."
  docker-compose logs atproto-hma
  exit 1
fi

# Check perchpics service
if curl -s http://localhost:3002/xrpc/health | grep -q "success"; then
  echo "✅ PerchPics PDS service is running."
else
  echo "❌ Error: PerchPics PDS service is not responding properly."
  docker-compose logs perchpics
  exit 1
fi

echo -e "\n🎉 All services are running successfully!\n"

# Step 6: Test image upload and moderation
echo "Testing image upload and moderation flow..."
echo "You can now access PerchPics at http://localhost:3000 and upload an image to test the full flow."
echo "Check the logs with: docker-compose logs -f"

echo -e "\n📝 Integration test preparation complete!" 