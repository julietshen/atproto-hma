# PerchPics

A simple photo sharing application built on the AT Protocol with its own custom Lexicon and Personal Data Server (PDS).

## Overview

PerchPics is a minimalist photo sharing app that allows users to:
- Upload photos to their personal repository
- View photos from other PerchPics users
- Like and repost photos
- View user profiles and their photo collections

The app is built with simplicity in mind, following the KISS (Keep It Simple, Stupid) principle.

## Key Features

- **Custom Lexicon**: PerchPics uses its own custom Lexicon (`app.perchpics.photo`) to define the schema for photos, ensuring they remain exclusive to the PerchPics ecosystem.
- **Custom PDS**: PerchPics hosts its own Personal Data Server (PDS) to store user data and photos, rather than relying on the standard AT Protocol infrastructure.
- **Independent Ecosystem**: Photos posted on PerchPics are not visible on Bluesky or other AT Protocol applications unless they specifically support our custom Lexicon.

## Tech Stack

- React + TypeScript for the frontend
- Express.js for the custom PDS
- SQLite for data storage
- Custom AT Protocol implementation

## HMA Integration Architecture

PerchPics integrates with Meta's Hasher-Matcher-Actioner (HMA) for content moderation via a specialized architecture:

### Bridge-Based Integration

1. **Bridge Service**: 
   - The ATProto-HMA bridge (running on port 3001) serves as a translation layer between PerchPics and HMA 2.0
   - The bridge exposes conventional REST endpoints (`/api/v1/hash`, `/api/v1/match`) that PerchPics uses
   - It translates these requests to HMA 2.0's specific endpoint format (`/h/hash`, `/m/compare`)

2. **Connection Flow**:
   - PerchPics → Bridge (port 3001) → HMA Service (port 5000)
   - This indirect connection ensures compatibility and proper processing

3. **Configuration**:
   - `HMA_BRIDGE_API_URL` in `.env` should be set to `http://localhost:3001` (bridge service)
   - `HMA_SERVICE_API_URL` in `.env` should be set to `http://localhost:5000` (direct HMA service)
   - For backward compatibility, `HMA_API_URL` is also supported but should point to the bridge

### Configuration Hierarchy

The HMA client in PerchPics uses a sophisticated configuration hierarchy to ensure robust operation:

1. Environment variables (highest priority)
2. Configuration settings in `config.js`
3. Default values (lowest priority)

This enables flexible deployment across different environments while maintaining sensible defaults.

### Why Use the Bridge?

The bridge provides crucial functionality:
- AT Protocol-specific data formatting and blob handling
- Authentication and security integration matching AT Protocol patterns
- Future-proofing against changes in HMA API design
- Additional webhook handling and notification features

Direct connections to HMA will fail because HMA doesn't understand the endpoint format PerchPics expects.

## Port Configuration

PerchPics uses environment variables to manage ports and connections between components:

- `FRONTEND_PORT`: The port for the Vite frontend server (default: 3000)
- `PDS_PORT`: The port for the PDS server (default: 3002)
- `HMA_BRIDGE_API_URL`: The URL for the ATProto-HMA bridge (default: http://localhost:3001)
- `HMA_SERVICE_API_URL`: The URL for the HMA service (default: http://localhost:5000)

To change these ports, edit the `.env` file in the project root. The system will:

1. Use exactly the ports specified - no automatic fallbacks
2. Fail with a clear error message if a port is already in use
3. Automatically configure connections between components based on these settings

For local development with Docker:
- Ensure the ports in `.env` match the exposed ports in `docker-compose.yml`
- The frontend will proxy API requests to the PDS server
- The PDS server will connect to the HMA service through the bridge

## Starting the Project

The ATProto-HMA project consists of several interconnected services. These can be started together or individually depending on your needs.

### Starting the Complete System

The complete system includes three main components:
1. The HMA service (port 5000)
2. The ATProto-HMA Bridge (port 3001)
3. The PerchPics application (frontend port 3000, PDS port 3002)

To start everything at once:

```bash
# Start from the project root directory
cd /Users/jsroost/ROOST/atproto-hma

# Start the Docker services (database, HMA service, and bridge)
docker-compose up -d db app atproto-hma

# Start the PerchPics application
cd perchpics
npm run start:clean:debug
```

### Starting Individual Services

#### Starting HMA Service Only
```bash
cd /Users/jsroost/ROOST/atproto-hma
docker-compose up -d db app
```

#### Starting ATProto-HMA Bridge Only
```bash
cd /Users/jsroost/ROOST/atproto-hma
# Make sure the database is running first
docker-compose up -d db
# Then start the bridge
docker-compose up -d atproto-hma
```

#### Starting PerchPics Without HMA
If you want to run PerchPics without content moderation functionality:
```bash
cd /Users/jsroost/ROOST/atproto-hma/perchpics
npm run start:clean:debug
```
Note: The application will still function, but image hashing and content moderation features will be disabled with appropriate warnings in the logs.

### Service Dependencies

For proper functionality, services should be started in this order:
1. Database (PostgreSQL)
2. HMA Service 
3. ATProto-HMA Bridge
4. PerchPics Application

### Troubleshooting

#### Connection Issues
- **404 errors from HMA**: Ensure you're using the ATProto-HMA Bridge (port 3001) and not connecting directly to HMA (port 5000)
- **Database connection errors**: Ensure the PostgreSQL database is running and accessible
- **Port conflicts**: Check if the required ports are already in use by other applications

#### Configuration
- Verify that your environment variables are correctly set:
  - `HMA_BRIDGE_API_URL` should point to the bridge service (`http://localhost:3001`)
  - `HMA_SERVICE_API_URL` should point to the HMA service (`http://localhost:5000`)
  - For backward compatibility, `HMA_API_URL` is also supported but should point to the bridge

#### Checking Service Status
```bash
# Check Docker services
docker-compose ps

# Check logs for HMA service
docker-compose logs app

# Check logs for ATProto-HMA Bridge
docker-compose logs atproto-hma

# Check HMA configuration in PerchPics
cd perchpics
node -e "console.log(require('./src/config.js').config.hma)"
```

#### Verifying the Bridge Connection
Use curl to check if the bridge is accessible:
```bash
curl -v http://localhost:3001/health
```
You should receive a response with `{"status":"healthy"}` if the bridge is running correctly.

## Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/perchpics.git
   cd perchpics
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start both the frontend and PDS server:
   ```
   npm run start
   ```

4. Open your browser and navigate to `http://localhost:3000`

### Note on Dependencies

This project uses package overrides to handle some deprecated dependencies that are used by underlying packages. If you encounter any dependency-related issues, you can:

1. Check the `overrides` section in package.json
2. Run `npm install --force` to force resolution of dependencies
3. Update Node.js to the latest LTS version

## Architecture

PerchPics consists of two main components:

1. **Frontend (Port 3000)**: A React application that provides the user interface for interacting with photos.
2. **PDS Server (Port 3001)**: A custom Personal Data Server that handles authentication, data storage, and serving content.

### Custom Lexicon

PerchPics defines its own Lexicon schema for photos:

```json
{
  "lexicon": 1,
  "id": "app.perchpics.photo",
  "description": "A photo post for the PerchPics application",
  "defs": {
    "main": {
      "type": "record",
      "key": "tid",
      "record": {
        "type": "object",
        "required": ["image", "caption", "createdAt"],
        "properties": {
          "image": {
            "type": "blob",
            "accept": ["image/jpeg", "image/png", "image/webp"],
            "maxSize": 5000000
          },
          "caption": {
            "type": "string",
            "maxLength": 500,
            "description": "Caption for the photo"
          },
          "altText": {
            "type": "string",
            "maxLength": 1000,
            "description": "Alt text for accessibility"
          },
          "tags": {
            "type": "array",
            "items": {
              "type": "string",
              "maxLength": 50
            },
            "maxLength": 10,
            "description": "Tags associated with the photo"
          },
          "location": {
            "type": "string",
            "maxLength": 100,
            "description": "Optional location information"
          },
          "createdAt": {
            "type": "string",
            "format": "datetime",
            "description": "Timestamp when the photo was created"
          }
        }
      }
    }
  }
}
```

## Development

### Running the Frontend Only

```
npm run dev
```

### Running the PDS Server Only

```
npm run pds
```

### Building for Production

```
npm run build
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [AT Protocol](https://atproto.com/) for the underlying protocol
- [Bluesky](https://bsky.app/) for the social network
- The AT Protocol team for their documentation and SDKs 

## Altitude Integration for Content Moderation

PerchPics now includes integration with [Altitude](https://github.com/Jigsaw-Code/altitude), a content moderation tool developed by Jigsaw and Tech Against Terrorism. This integration enhances the HMA hash matching system by providing a dedicated interface for human review of matched content.

### Features

- Images that match known hashes are automatically sent to Altitude for review
- Admin users can access a dedicated moderation interface via the "Moderation" link in the navbar
- Decisions made in Altitude are recorded back in the PerchPics database
- Feedback loop with hash providers to improve accuracy of future matches

### Setup

1. Deploy an Altitude instance following the instructions at [Jigsaw-Code/altitude](https://github.com/Jigsaw-Code/altitude)
2. Configure the Altitude integration in your `.env` file:
   ```
   ALTITUDE_ENABLED=true
   ALTITUDE_URL=http://your-altitude-instance-url
   ALTITUDE_API_KEY=your_altitude_api_key
   ALTITUDE_WEBHOOK_ENDPOINT=/api/altitude/webhook
   ```
3. Restart your PerchPics application
4. Log in with an admin account to access the moderation interface

### Architecture

The Altitude integration consists of several components:

1. **Altitude Service**: A Node.js service that communicates with the Altitude API
2. **Admin UI**: A React component that embeds the Altitude interface
3. **Database Extensions**: Additional fields in the database to track Altitude submissions and decisions
4. **API Endpoints**: Routes for handling configuration and webhooks

When an image matches a hash in HMA, it is automatically sent to Altitude for review. Admin users can then review the flagged content in the moderation interface and make decisions. These decisions are sent back to PerchPics via webhook and recorded in the database. 