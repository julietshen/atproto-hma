# ATproto-HMA Integration Project Notes

## Project Overview
The goal of this project is to integrate [AT Protocol](https://atproto.com/) with [HMA (Hasher-Matcher-Actioner)](https://github.com/facebook/ThreatExchange/tree/main/hasher-matcher-actioner) from Meta's ThreatExchange. This integration enables content moderation capabilities for images shared on the AT Protocol network.

## Components
1. **atproto-hma integration service**: A Flask application that serves as a bridge between AT Protocol and HMA
2. **HMA service**: The official Meta HMA container providing hashing and matching capabilities
3. **PostgreSQL database**: Stores both the atproto-hma service data and HMA's data
4. **PerchPics**: A sample AT Protocol application for testing the integration

## Architecture: ATProto-HMA Bridge 

### Bridge Purpose and Design

The atproto-hma bridge serves as a translation layer between AT Protocol applications and HMA 2.0's content moderation services. This integration bridge is a critical component for several reasons:

1. **API Translation**: 
   - HMA 2.0 uses a unique API structure with endpoints like `/h/hash` and `/m/compare`
   - The bridge exposes standardized REST endpoints with conventional patterns (`/api/v1/hash`, `/api/v1/match`) that are more familiar to developers
   - This translation allows applications to use a consistent API pattern without needing to adapt to HMA's specific patterns

2. **AT Protocol-Specific Integration**:
   - The bridge handles AT Protocol-specific requirements such as blob formatting and webhook handling
   - It provides authentication mechanisms compatible with AT Protocol security models
   - It translates between AT Protocol's data structures and what HMA expects

3. **Decoupling and Future-Proofing**:
   - By using the bridge, applications are insulated from changes in the underlying HMA implementation
   - If HMA's API changes in future versions, only the bridge needs to be updated, not all client applications
   - This architecture supports better modularization and separation of concerns

### Connection Flow

The proper connection flow should be:
1. AT Protocol Application → Bridge (port 3001) → HMA Service (port 5000)

The bridge uses `/api/v1/...` style endpoints, which it then translates to the appropriate HMA 2.0 endpoints.

### Common Issues

A frequent issue is applications attempting to bypass the bridge and connect directly to HMA, which fails because:
1. HMA 2.0 doesn't support the `/api/v1/...` endpoint pattern that applications expect
2. Direct connections miss AT Protocol-specific handling that the bridge provides
3. Authentication and data formatting may not be correctly managed

Applications must be configured to use the bridge's URL (typically `http://localhost:3001`) rather than connecting directly to HMA (`http://localhost:5000`).

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
   - The HMA container needs specific database tables to exist, especially `signal_type_override`
   - HMA depends on proper database initialization before it can run

2. **Docker Networking**:
   - Services need proper configuration to communicate with each other
   - PostgreSQL connection issues can occur if networking or authentication isn't properly set up

3. **Development Approach**:
   - Start with minimal configurations and build up
   - Test database connections independently before integrating
   - Consider using mock services for initial development
   - Follow the official HMA docker-compose.yaml approach for most reliable results

4. **Database Schema Requirements**:
   - The `signal_type_override` table is crucial for HMA to function
   - Proper indices are needed for performance on larger tables
   - Let HMA handle its own migrations when possible instead of custom scripts
   - If migrations fail, check logs carefully for specific table/column requirements

5. **Integration Architecture**:
   - The perchpics service communicates with HMA via its REST API
   - Clean separation between services allows for more resilient architecture
   - Configuration values must be properly shared across services

## Important Reminders

1. **Always follow the official HMA setup pattern**:
   - Use the same service names as in the official docker-compose.yaml
   - Use the same environment variables and initialization approach
   - Avoid custom entrypoints or initialization scripts unless necessary

2. **Database initialization**:
   - Let HMA handle its own migrations when possible
   - If custom initialization is needed, always include the `signal_type_override` table
   - Ensure database user permissions are correct before starting services

3. **Troubleshooting**:
   - Check container logs first (`docker-compose logs app` or `docker-compose logs db`)
   - Verify database connectivity directly from containers if needed
   - Use debug containers with sleep infinity for inspection when needed

4. **Configuration management**:
   - Keep .env files properly versioned with .env.example templates
   - Document all environment variables and their purpose
   - Be careful with credential management in version control

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
docker logs atproto-hma-app-1

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
GRANT ALL PRIVILEGES ON DATABASE media_match TO media_match;

# Check for existing tables
\c media_match
\dt

# Check for specific table structure
\d signal_type_override
```

### Debugging Commands
```bash
# Check if HMA is accepting connections
curl -s http://localhost:5000/ui

# Check container running status
docker-compose ps

# Restart specific service
docker-compose restart app

# Create a debug container for inspection
docker-compose -f docker-compose.debug.yml up -d hma-debug
docker-compose exec hma-debug bash
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

## Recent Updates and Improvements

### HMA Logging System Enhancements (March 2025)
- Improved formatting for both successful match and no-match cases
- Added consistent separator lines for better log readability
- Enhanced debug information with clear status indicators
- Standardized success/failure messaging format
- Added detailed context in log messages (hash IDs, match scores, etc.)

### Configuration Troubleshooting

#### HMA Bridge Configuration
When connecting PerchPics to HMA, proper configuration is essential:

1. **Connection Order**: 
   - Correct: PerchPics → HMA Bridge (3001) → HMA Service (5000)
   - Incorrect: PerchPics → HMA Service (5000) directly

2. **Environment Variable Configuration**:
   ```
   # In PerchPics .env:
   HMA_API_URL=http://localhost:5000      # Direct service URL (used by bridge)
   HMA_BRIDGE_API_URL=http://localhost:3001 # Bridge URL (used by application)
   ```

3. **Common Connection Issues**:
   - "HMA bridge responded with status 404": Application trying to use `/api/v1/...` endpoints directly with HMA service
   - "Unable to connect to HMA service": Bridge URL misconfigured or service not running

#### Troubleshooting Application Crashes
The frontend application (Vite) frequently crashes with `Killed: 9`. This is typically due to:
1. Memory limits on the development machine
2. Port conflicts when services restart
3. WebSocket connection issues during hot module replacement

Solutions:
- Use the `start:clean:debug` script which kills existing processes on the required ports
- Reduce memory usage by closing other applications
- Monitor memory usage through the built-in memory monitor

## HMA Integration Testing Tips

### Verifying Correct Bridge Configuration
```
-------------------- HMA CONFIGURATION --------------------
Bridge URL: http://localhost:3001 (this is the primary API endpoint used)
Service URL: http://localhost:5000 (direct HMA service, used by bridge)
Environment Variables:
  HMA_API_URL: http://localhost:5000
  HMA_BRIDGE_API_URL: http://localhost:3001
  HMA_SERVICE_API_URL: http://localhost:5000
------------------------------------------------------------
```

The above configuration shows the proper setup with both bridge and service URLs correctly configured.

### Logging Verification
Successful HMA health check should show:
```
✅ HMA SUCCESS: HMA bridge health check succeeded
   url: http://localhost:3001/health
   status: healthy
   endpoint: /health
   ----------------------------------------
```

No-match cases now use consistent formatting:
```
🔍 HMA DEBUG: Image did not match any entries in HMA database
   ----------------------------------------
``` 