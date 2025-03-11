FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Create necessary directories
RUN mkdir -p data/blobs logs/hma

# Expose port 3001
EXPOSE 3001

# Start the application with a custom command to run both processes properly
CMD ["sh", "-c", "node --experimental-json-modules src/pds/server.js"] 