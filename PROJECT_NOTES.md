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

## Docker Setup Success (March 2025)

We successfully got the Docker-based HMA environment working with our PerchPics application. Here are the key observations and solutions:

1. **Database Configuration**:
   - The HMA bridge service expects to connect to a PostgreSQL database at hostname "db"
   - This hostname only resolves within the Docker network
   - Running the HMA bridge outside Docker requires modifying the `.env` file

2. **Docker Container Setup**:
   - All required services (app, db, atproto-hma) need to be running for proper operation
   - The `docker-compose.yml` file in the project root provides the complete configuration
   - Docker needs to be running on the host machine before starting the containers

3. **PerchPics Connection**:
   - PerchPics can run on the host and still connect to Docker services
   - The HMA bridge health check works properly when accessible on port 3001
   - Successful image processing flow has been verified

4. **Common Issues and Solutions**:
   - "PayloadTooLargeError" in PerchPics logs is normal for large image uploads
   - Connection errors in Altitude client to "http://gateway:80/" are expected in development
   - "HMA bridge responded with status 500" typically means database connection issues

5. **Important Port Mappings**:
   - HMA Bridge: Port 3001
   - HMA Service: Port 5000 (through Docker)
   - PerchPics API: Port 3002
   - PerchPics Frontend: Port 3000
   - Altitude Client: Port 4200

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

## Altitude Integration

### Integration Overview
The ATProto-HMA bridge integrates with Altitude (a content moderation platform) to provide a streamlined review workflow for moderators. This integration enables content flagged by HMA to be sent to Altitude for human review.

### Implemented Changes and Fixes
As of March 14, 2025, we've implemented the following fixes to the Altitude integration:

1. **Database Model Updates**:
   - Added `altitude_task_id` field to the `ModerationLog` model to track Altitude reviews
   - Created a database migration script to add this field to existing database tables
   - Added functions for updating and retrieving moderation logs by Altitude task ID

2. **Missing Models Implementation**:
   - Created `HashResult` model for handling PDQ hash results
   - Created `MatchResult` model for handling match results from HMA
   - Added proper imports and structure to link these components together

3. **Case Sensitivity Fixes**:
   - Fixed import case mismatches between `HMAClient`/`HmaClient` and `ATProtoClient`/`AtprotoClient`
   - Ensured consistent naming across the entire codebase

### Workflow Details
The Altitude integration works as follows:
1. When an image is uploaded through the ATProto-HMA bridge, it's hashed and compared against the HMA database
2. If a match is found, the bridge creates a review task in Altitude
3. The Altitude task ID is stored in the `altitude_task_id` field of the `ModerationLog` record
4. Moderators can then review the content in the Altitude UI
5. The ATProto-HMA bridge can query the status of reviews using the Altitude API

### Future Improvements
- Implement webhook support for Altitude to notify the bridge when review decisions are made
- Add more detailed logging about the Altitude integration process
- Create a UI component in the bridge dashboard to display Altitude review status
- Add support for batch processing of review tasks

### Reminders and Notes
- The Altitude client needs the MongoDB credentials to connect properly to the MongoDB instance
- Both `author_did` and `photo_id` are required for creating tasks in Altitude; if not provided, the system generates UUIDs as defaults
- The MongoDB instance running in the Altitude container requires authentication
- When deploying, make sure to run the database migration script to ensure the `altitude_task_id` field exists
- The signal initialization script needs to run with the proper MongoDB credentials to set up default signals

### Troubleshooting
If Altitude integration is not working:
1. Check that MongoDB credentials are properly configured
2. Verify that the `HMA_API_URL` environment variable is set correctly (should point to `http://app:5000`)
3. Check the proper usage of `altitude_client.create_review_task` in the code
4. Ensure that PDQ hashes are properly passed to Altitude
5. Look for specific errors related to the Altitude integration in the logs

### Commands for Testing and Setup
```bash
# Run the signal initialization script
./altitude/scripts/run_init_signals.sh

# Check MongoDB environment variables
docker exec altitude-prod-signal-service-1 bash -c "env | grep MONGO"

# Copy migration script to container and run it
docker cp src/db/migrate.py atproto-hma-atproto-hma-1:/app/src/db/ && docker exec atproto-hma-atproto-hma-1 python -m src.db.migrate

# Restart the ATProto-HMA bridge
docker restart atproto-hma-atproto-hma-1
``` 