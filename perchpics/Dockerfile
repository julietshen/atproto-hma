# Build stage
FROM node:20-alpine as build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy app source
COPY . .

# Build the frontend
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Create necessary directories
RUN mkdir -p /app/data/blobs /app/logs/hma

# Copy built assets from build stage
COPY --from=build /app/dist /app/dist
COPY --from=build /app/src/pds /app/src/pds
COPY --from=build /app/src/services /app/src/services

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Expose ports
EXPOSE 3000

# Start the PDS server
CMD ["node", "src/pds/server.js"] 