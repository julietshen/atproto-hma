# ATproto-HMA Integration Project Notes

## Project Overview
The goal of this project is to integrate [AT Protocol](https://atproto.com/) with [HMA (Hasher-Matcher-Actioner)](https://github.com/facebook/ThreatExchange/tree/main/hasher-matcher-actioner) from Meta's ThreatExchange. This integration enables content moderation capabilities for images shared on the AT Protocol network.

## Components
1. **atproto-hma integration service**: A Flask application that serves as a bridge between AT Protocol and HMA
2. **HMA service**: The official Meta HMA container providing hashing and matching capabilities
3. **PostgreSQL database**: Stores both the atproto-hma service data and HMA's data
4. **PerchPics**: A sample AT Protocol application for testing the integration

## Current Status

### What's Working
- Basic Flask application structure for the atproto-hma integration service
- Database setup and initialization via Docker Compose
- Connection between the atproto-hma service and the PostgreSQL database
- PerchPics application can start and run locally

### Outstanding Issues
- HMA container authentication issues - continually restarting with "password authentication failed for user 'media_match'"
- Port conflicts between PerchPics components (3001 port already in use)
- Environment configuration complexity between the different services

## Lessons Learned

1. **HMA Configuration Challenges**:
   - HMA has very specific expectations about database configuration
   - The default configuration expects a "media_match" user with correct privileges
   - HMA relies on configuration files at specific paths within the container
   - Environment variable overrides may not fully replace the need for proper configuration files

2. **Docker Networking**:
   - Services need proper configuration to communicate with each other
   - PostgreSQL connection issues can occur if networking or authentication isn't properly set up

3. **Development Approach**:
   - Start with minimal configurations and build up
   - Test database connections independently before integrating
   - Consider using mock services for initial development

## Next Steps

1. **Fix HMA Database Connection**:
   - Options:
     - Create a custom HMA config file and mount it to override database settings
     - Create the media_match user with the proper password in PostgreSQL
     - Use the mocked.py storage option in HMA for initial testing

2. **Configure PerchPics Properly**:
   - Update .env file with different port configurations
   - Ensure all services (PDS and web UI) use unique ports

3. **End-to-End Testing**:
   - Test image upload flow once services are running
   - Verify hash generation and storage
   - Test integration points between services

4. **Documentation**:
   - Document the setup process and configuration requirements
   - Create troubleshooting guide for common issues

## Core Principles

1. **ALWAYS follow HMA's standard initialization process**:
   - Avoid custom initialization scripts or complex entrypoint overrides
   - Let HMA handle its own database migration and schema setup
   - Follow the documented approach in HMA's official documentation
   - Keep configurations as close as possible to HMA's reference examples
   - When in doubt, prefer simplicity over custom solutions

This principle is crucial for maintainability, as it ensures we're using HMA as intended by its creators, minimizing potential issues with upgrades or compatibility.

## Technical Debt / Future Improvements

1. **Simplified Configuration**:
   - Consolidate configuration approaches
   - Create better defaults for development

2. **Monitoring and Logging**:
   - Add structured logging
   - Set up monitoring for service health

3. **Production Readiness**:
   - Security review
   - Performance testing
   - Proper secrets management

## Reference Commands

### Starting the Services
```bash
# Start with Docker Compose
docker-compose up -d

# Check container status
docker ps

# View logs for a specific container
docker logs atproto-hma-hma-1

# Start PerchPics (after configuring ports)
cd perchpics && npm start
```

### Database Operations
```bash
# Connect to PostgreSQL
docker exec -it atproto-hma-db-1 psql -U postgres

# List databases
\l

# Create the media_match user (if needed)
CREATE USER media_match WITH PASSWORD 'media_match';
GRANT ALL PRIVILEGES ON DATABASE hma TO media_match;
```

## Required Environment Variables

### atproto-hma Service
- DATABASE_URL=postgresql://postgres:postgres@db:5432/atproto_hma
- HMA_API_URL=http://hma:5000
- LOG_LEVEL=INFO
- PORT=3000
- HOST=0.0.0.0
- WORKERS=4

### HMA Service
- POSTGRES_USER=postgres
- POSTGRES_PASSWORD=postgres
- POSTGRES_HOST=db
- POSTGRES_PORT=5432
- POSTGRES_DBNAME=hma
- OMM_CONFIG=/build/reference_omm_configs/development_omm_config.py
- POSTGRES_CONNECTION_STRING=postgresql://postgres:postgres@db:5432/hma
- SQL_ALCHEMY_DATABASE_URI=postgresql://postgres:postgres@db:5432/hma

### PerchPics
- PORT=3002 (updated from 3001 to avoid conflicts)
- HMA_URL=http://localhost:5000 