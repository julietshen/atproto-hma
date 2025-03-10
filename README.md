# AT Protocol Hasher-Matcher-Actioner (HMA) Integration

A lightweight, efficient integration of Meta's Hasher-Matcher-Actioner (HMA) with AT Protocol applications for content moderation. This solution supports NCMEC hash database scanning and is suitable for small Bluesky PDS hosts and independent AppView operators.

## Overview

This project integrates Meta's Hasher-Matcher-Actioner (HMA) system with the AT Protocol to provide efficient content moderation capabilities. It allows PDS hosts and AppView operators to:

- Hash images during upload using PDQ and other algorithms
- Match hashes against known databases (like NCMEC)
- Take appropriate actions based on matches
- Maintain compliance logs for legal requirements

## Features

- **Seamless AT Protocol Integration**: Hooks directly into the AT Protocol's image upload and processing pipeline
- **Efficient Hash-Based Content Moderation**: Uses Meta's HMA implementation for robust content matching
- **NCMEC Hash Database Support**: Compatible with the National Center for Missing and Exploited Children hash database
- **Lightweight Design**: Optimized for small teams and indie developers with minimal resource usage
- **Compliance Logging**: Secure, tamper-proof, and auditable logs for all matches
- **Robust Error Handling**: Graceful handling of service downtime, database failures, and other issues

## Implementation Details

This integration is built as a standalone service that communicates with both the HMA service and AT Protocol applications. It provides:

1. **REST API**: Endpoints for hashing, matching, and taking actions
2. **Webhook Support**: Receive callbacks from AT Protocol and send notifications back
3. **Database Storage**: Store hashes, matches, and actions for auditing and compliance
4. **Client Libraries**: Easy-to-use clients for HMA and AT Protocol

### Architecture

The service follows a layered architecture:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  AT Protocol    │◄────┤  AT Protocol    │◄────┤  HMA Service    │
│  Application    │     │  HMA Integration│     │                 │
│  (PDS/AppView)  │────►│                 │────►│                 │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

For more details, see the [Architecture Document](docs/architecture.md).

## Installation

### Prerequisites

- Python 3.10+
- PostgreSQL database
- AT Protocol PDS or AppView instance

### Setup

1. Clone this repository:
   ```
   git clone https://github.com/julietshen/atproto-hma.git
   cd atproto-hma
   ```

2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Configure the environment:
   ```
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Initialize the database:
   ```
   python -m src.db.init
   ```

5. Start the service:
   ```
   python -m src.main
   ```

### Docker Deployment

For production deployment, we recommend using Docker Compose:

```
docker-compose up -d
```

This will start:
- The AT Protocol HMA Integration service
- The HMA service
- A PostgreSQL database

## Configuration

Configuration is handled through environment variables or a `.env` file. See `.env.example` for all available options.

### Key Configuration Options

- `DATABASE_URL`: PostgreSQL connection string
- `HMA_API_URL`: URL of the HMA service
- `AT_PROTOCOL_PDS_URL`: URL of your PDS instance
- `NCMEC_API_KEY`: API key for NCMEC hash database (if applicable)
- `LOG_LEVEL`: Logging level (DEBUG, INFO, WARNING, ERROR)

## Usage

### For PDS Operators

1. Configure the integration to point to your PDS instance
2. Enable the middleware in your PDS configuration
3. Monitor the logs for any matches

See the [Integration Guide](docs/integration_guide.md) for detailed instructions.

### For AppView Developers

1. Configure the integration to work with your AppView
2. Add the necessary hooks to your image processing pipeline
3. Implement appropriate UI for moderator actions

See the [Integration Guide](docs/integration_guide.md) for detailed instructions.

## API Documentation

### Endpoints

- `POST /api/v1/hash`: Hash an image
- `POST /api/v1/hash/url`: Hash an image from a URL
- `POST /api/v1/match`: Match a hash against the database
- `POST /api/v1/match/batch`: Match multiple hashes in batch
- `POST /api/v1/action`: Take action based on a match
- `POST /api/v1/action/batch`: Take multiple actions in batch
- `POST /api/v1/webhook/hma-callback`: Receive callbacks from HMA
- `POST /api/v1/webhook/atproto-callback`: Receive callbacks from AT Protocol
- `GET /api/v1/status`: Get service status
- `GET /api/v1/status/metrics`: Get service metrics

## Documentation

For more detailed documentation, see the [docs](./docs) directory:

- [Architecture Document](docs/architecture.md)
- [Integration Guide](docs/integration_guide.md)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements

- [Meta's Hasher-Matcher-Actioner](https://github.com/facebook/ThreatExchange/tree/main/hasher-matcher-actioner)
- [AT Protocol](https://atproto.com/)
- [Bluesky](https://bsky.app/)
