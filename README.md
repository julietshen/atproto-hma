# AT Protocol + HMA Integration

This project integrates [AT Protocol](https://atproto.com/) with Meta's [Hasher-Matcher-Actioner (HMA)](https://github.com/facebook/ThreatExchange/tree/main/hasher-matcher-actioner) for content moderation.

## Overview

The integration consists of three main components:

1. **HMA Service**: A containerized implementation of Meta's HMA service that provides hashing and matching capabilities
2. **ATProto-HMA Bridge Service**: A Flask-based service that bridges AT Protocol applications and HMA
3. **PerchPics**: A sample AT Protocol application that demonstrates the integration in action

PerchPics is a complete example application built on the AT Protocol that utilizes a self-hosted Personal Data Server (PDS) and implements custom lexicon schemas. It showcases how decentralized applications can integrate content moderation capabilities while maintaining the protocol's open and federated nature.

## Architecture & Bridge Value

### Why a Bridge Service?

The ATProto-HMA bridge (running on port 3001) serves as a critical adaptation layer between AT Protocol applications and the HMA service. Its value includes:

#### 1. Protocol & Context Adaptation
- Translates between AT Protocol concepts (DIDs, URIs) and HMA's content moderation paradigms
- Adds AT Protocol-specific context to HMA requests (author DIDs, photo IDs)
- Provides AT Protocol applications with a standardized interface for content moderation

#### 2. API Translation
- The HMA service exposes endpoints like `/v2/hash/lookup` that follow HMA's native API
- The bridge translates these to application-friendly endpoints like `/api/v1/hash` 
- Simplifies integration for AT Protocol developers

#### 3. Ecosystem Support
- Enables any AT Protocol application to leverage HMA for content moderation
- Provides a reusable component for the ATProto ecosystem
- Abstracts the complexity of direct HMA integration

#### 4. Logging & Auditing
- Implements logging of moderation events specific to AT Protocol identifiers
- Creates an audit trail of content moderation decisions
- Maintains context between content, users, and moderation actions

### Architecture Diagram

```
┌────────────┐     ┌───────────────┐     ┌────────────┐     ┌──────────┐
│            │     │               │     │            │     │          │
│  PerchPics │────►│ ATProto-HMA   │────►│ HMA Service│────►│ Database │
│ (AT Proto  │     │ Bridge Service│     │            │     │          │
│   App)     │◄────│ (Port 3001)   │◄────│ (Port 5000)│◄────│          │
│            │     │               │     │            │     │          │
└────────────┘     └───────────────┘     └────────────┘     └──────────┘
```

The bridge service is a necessary component in this architecture. It allows AT Protocol applications like PerchPics to communicate with the HMA service while maintaining proper context, logging, and data flow between the protocol's decentralized identity system and content moderation needs.

## PerchPics: AT Protocol Example Application

PerchPics is a complete social photo-sharing application built on AT Protocol that showcases:

### Self-Hosted Personal Data Server (PDS)
- Implements a complete PDS from scratch using Node.js and Express
- Stores user data, authentication, and content locally
- Provides all necessary APIs for a functioning AT Protocol application
- Can be deployed independently while maintaining compatibility with the broader network

### Custom Lexicon
- Extends the AT Protocol with custom schemas for photo sharing
- Defines record types like `app.perchpics.photo` for photos
- Implements custom indexing and querying
- Demonstrates how to build application-specific features while maintaining protocol compatibility

### Integration with Content Moderation
- Showcases how AT Protocol apps can implement responsible content moderation
- Demonstrates practical trust & safety workflows for decentralized applications
- Provides patterns that other AT Protocol developers can adopt

PerchPics serves as a reference implementation that other developers can use to understand how to build robust applications on the AT Protocol with integrated content moderation capabilities.

## Prerequisites

- Docker and Docker Compose
- Node.js (v16+) and npm for local development
- Git

## Project Structure

The project is organized into two main directories:

```
ROOST/
├── atproto-hma/            # Integration service and Docker configuration
│   ├── src/                # Bridge service source code
│   ├── scripts/            # Helper scripts including DB initialization
│   ├── Dockerfile          # Dockerfile for the bridge service
│   ├── docker-compose.yml  # Docker Compose configuration for all services
│   ├── integration-test.sh # Integration test script
│   └── requirements.txt    # Python dependencies
└── perchpics/              # Sample AT Protocol application
    ├── src/                # Application source code
    │   ├── pds/            # Personal Data Server implementation
    │   ├── services/       # Backend services including HMA integration
    │   └── components/     # Frontend React components
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

#### 2. Start the ATProto-HMA Bridge Service:

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

### ATProto-HMA Bridge Service Configuration

- `DATABASE_URL`: PostgreSQL connection string
- `HMA_API_URL`: URL to the HMA service (default: http://hma:5000)
- `LOG_LEVEL`: Logging level
- `PORT`: Port for the service (default: 3001)
- `HOST`: Host for the service (default: 0.0.0.0)

### PerchPics Configuration

- `PDS_PORT`: Personal Data Server port (default: 3002)
- `PDS_HOST`: Personal Data Server host
- `FRONTEND_PORT`: Frontend development server port (default: 3000)
- `HMA_API_URL`: URL to the ATProto-HMA Bridge Service (default: http://localhost:3001)

## AT Protocol Custom Lexicon

PerchPics implements the following custom AT Protocol lexicon types:

```
app.perchpics.photo    # Photo record type for storing images
app.perchpics.like     # Like interaction on photos
app.perchpics.repost   # Repost interaction for photos
app.perchpics.comment  # Comment interaction for photos
```

These lexicon types extend the standard AT Protocol data model while maintaining compatibility with the protocol's expectations.

## Connection Flow for Image Moderation

When PerchPics users upload an image, the following flow occurs:

1. User uploads an image through PerchPics frontend
2. PerchPics PDS (Personal Data Server) stores the image and creates a record
3. PDS calls the ATProto-HMA Bridge Service to process the image
4. Bridge Service forwards the image to HMA for hashing and matching
5. HMA returns any matches found against known content
6. Bridge Service enriches the response with AT Protocol context
7. PDS receives moderation decision and updates the image record
8. If configured, the Bridge Service can notify moderators about matches

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

### Common Issues

#### PerchPics Cannot Connect to Bridge Service

When running locally:
- Ensure PerchPics is configured to use `http://localhost:3001` as the HMA_API_URL
- Verify the bridge service is running on port 3001: `docker ps | grep atproto-hma`
- Check bridge service logs: `docker logs atproto-hma-atproto-hma`

#### Bridge Service Cannot Connect to HMA

- Verify the HMA service is running: `docker ps | grep app-1`
- Ensure the bridge service is configured with the correct HMA_API_URL (http://hma:5000 in Docker or http://localhost:5000 locally)
- Check HMA service logs: `docker logs atproto-hma-app-1`

#### Health Check Failures

- The HMA service may report 404 errors for health checks as it implements different API endpoints
- The bridge service is designed to handle this gracefully in development mode
- These errors can be safely ignored if photo upload functionality is working

## Further Development

The ATProto-HMA bridge can be extended to support:

1. Additional AT Protocol applications beyond PerchPics
2. More sophisticated content moderation workflows
3. Integration with other content moderation services
4. Custom moderation policies specific to AT Protocol communities

## Contributing

- [Meta's Hasher-Matcher-Actioner](https://github.com/facebook/ThreatExchange/tree/main/hasher-matcher-actioner)
- [AT Protocol](https://atproto.com/)
- [Bluesky](https://bsky.app/)
