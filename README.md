# AT Protocol + HMA Integration

This project integrates [AT Protocol](https://atproto.com/) with Meta's [Hasher-Matcher-Actioner (HMA)](https://github.com/facebook/ThreatExchange/tree/main/hasher-matcher-actioner) for content moderation.

## Overview

The integration consists of three main components:

1. **HMA Service**: A containerized implementation of Meta's HMA service that provides hashing and matching capabilities
2. **ATProto-HMA Integration Service**: A Python Flask service that bridges AT Protocol and HMA
3. **PerchPics**: A sample AT Protocol application that demonstrates the integration in action

## Prerequisites

- Docker and Docker Compose
- Node.js (v16+) and npm for local development
- Git

## Project Structure

The project is organized into two main directories:

```
ROOST/
├── atproto-hma/            # Integration service and Docker configuration
│   ├── src/                # Integration service source code
│   ├── scripts/            # Helper scripts including DB initialization
│   ├── Dockerfile          # Dockerfile for the integration service
│   ├── docker-compose.yml  # Docker Compose configuration for all services
│   ├── integration-test.sh # Integration test script
│   └── requirements.txt    # Python dependencies
└── perchpics/              # Sample AT Protocol application
    ├── src/                # Application source code
    ├── Dockerfile          # Dockerfile for PerchPics
    └── package.json        # Node.js dependencies
```

## Quick Start

### Option 1: Running with Docker Compose (Recommended)

1. Clone the repositories:
   ```
   mkdir -p ROOST && cd ROOST
   git clone https://github.com/your-username/atproto-hma.git
   git clone https://github.com/your-username/perchpics.git
   cd atproto-hma
   ```

2. Run the integration test script:
   ```
   ./integration-test.sh
   ```

This will start all services and verify they are working correctly.

3. Access PerchPics at http://localhost:3000

### Option 2: Running Components Separately

#### 1. Start the Database and HMA services:

```
cd atproto-hma
docker-compose up -d db hma
```

#### 2. Start the ATProto-HMA Integration Service:

```
cd atproto-hma
docker-compose up -d atproto-hma
```

#### 3. Start PerchPics locally:

```
cd ../perchpics
npm install
npm run start
```

## Configuration

### HMA Service Configuration

The HMA service uses the following environment variables:

- `POSTGRES_USER`: Database username (default: media_match)
- `POSTGRES_PASSWORD`: Database password
- `POSTGRES_HOST`: Database host
- `POSTGRES_PORT`: Database port
- `POSTGRES_DBNAME`: Database name

### ATProto-HMA Integration Service Configuration

- `DATABASE_URL`: PostgreSQL connection string
- `HMA_API_URL`: URL to the HMA service
- `LOG_LEVEL`: Logging level
- `PORT`: Port for the service
- `HOST`: Host for the service

### PerchPics Configuration

- `PDS_PORT`: Personal Data Server port (default: 3002)
- `PDS_HOST`: Personal Data Server host
- `VITE_PORT`: Vite development server port (default: 3000)
- `VITE_HOST`: Vite development server host
- `HMA_API_URL`: URL to the ATProto-HMA Integration Service

## Testing the Integration

1. Start all services using the integration test script
2. Create a user in PerchPics and log in
3. Upload an image to test the moderation flow
4. Check the logs to see the moderation decisions:
   ```
   cd atproto-hma
   docker-compose logs -f
   ```

## Troubleshooting

### Database Connection Issues

If you experience database connection issues, verify:

1. The database service is running: `docker-compose ps db`
2. The connection parameters match in both the service and database container
3. The database initialization script has completed successfully

### Port Conflicts

If you encounter port conflicts:

1. Modify the exposed ports in docker-compose.yml
2. Update corresponding environment variables in the services

### Common Issues

#### PerchPics Cannot Connect to HMA Service

When running locally:
- Ensure that PerchPics is using `http://localhost:3000/api/v1` as the HMA_API_URL (for local dev)
- Ensure that the atproto-hma service is running on port 3000

When running in Docker:
- Ensure that PerchPics is using `http://atproto-hma:3000/api/v1` as the HMA_API_URL 
- Ensure that all services are on the same Docker network

## Contributing

- [Meta's Hasher-Matcher-Actioner](https://github.com/facebook/ThreatExchange/tree/main/hasher-matcher-actioner)
- [AT Protocol](https://atproto.com/)
- [Bluesky](https://bsky.app/)
