# AT Protocol HMA Integration Architecture

This document describes the architecture of the AT Protocol HMA integration.

## System Overview

The AT Protocol HMA Integration is a service that bridges Meta's Hasher-Matcher-Actioner (HMA) system with AT Protocol applications. It provides a lightweight, efficient way to perform content moderation using hash-based matching against known databases like NCMEC.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  AT Protocol    │◄────┤  AT Protocol    │◄────┤  HMA Service    │
│  Application    │     │  HMA Integration│     │                 │
│  (PDS/AppView)  │────►│                 │────►│                 │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Components

### 1. API Layer

The API layer provides RESTful endpoints for:

- **Hashing**: Hash images using PDQ and other algorithms
- **Matching**: Match hashes against known databases
- **Actions**: Take actions based on matches
- **Webhooks**: Receive callbacks from AT Protocol and HMA
- **Status**: Check the status of the service

### 2. Service Layer

The service layer contains the business logic for:

- **HMA Client**: Communicates with the HMA service
- **AT Protocol Client**: Communicates with AT Protocol applications
- **Image Processing**: Prepares images for hashing

### 3. Data Layer

The data layer handles persistence of:

- **Hashes**: Stores hashes of processed images
- **Matches**: Records matches against known databases
- **Actions**: Logs actions taken based on matches

## Data Flow

### Image Upload Flow

1. User uploads an image to an AT Protocol application
2. AT Protocol application sends the image to the AT Protocol HMA Integration
3. AT Protocol HMA Integration processes the image and sends it to the HMA service for hashing
4. HMA service returns the hash values
5. AT Protocol HMA Integration sends the hash values to the HMA service for matching
6. HMA service returns any matches
7. AT Protocol HMA Integration takes appropriate actions based on matches
8. AT Protocol HMA Integration returns the results to the AT Protocol application

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────┐
│         │     │             │     │             │     │         │
│  User   │────►│  AT Protocol│────►│  AT Protocol│────►│   HMA   │
│         │     │  Application│     │  HMA        │     │ Service │
│         │◄────│             │◄────│  Integration│◄────│         │
└─────────┘     └─────────────┘     └─────────────┘     └─────────┘
```

### Webhook Flow

1. AT Protocol application registers webhooks with the AT Protocol HMA Integration
2. When an event occurs (e.g., image upload), AT Protocol application sends a webhook to the AT Protocol HMA Integration
3. AT Protocol HMA Integration processes the event and takes appropriate actions
4. AT Protocol HMA Integration sends a webhook back to the AT Protocol application with the results

```
┌─────────────┐                 ┌─────────────┐
│             │  1. Register    │             │
│  AT Protocol│────────────────►│  AT Protocol│
│  Application│                 │  HMA        │
│             │◄────────────────│  Integration│
│             │  2. Event       │             │
│             │────────────────►│             │
│             │                 │             │
│             │◄────────────────│             │
│             │  3. Result      │             │
└─────────────┘                 └─────────────┘
```

## Deployment Architecture

The AT Protocol HMA Integration is designed to be deployed as a Docker container alongside the HMA service and a PostgreSQL database. The recommended deployment architecture is:

```
┌─────────────────────────────────────────────────────────┐
│                      Docker Compose                     │
│                                                         │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────┐    │
│  │             │     │             │     │         │    │
│  │  AT Protocol│     │  HMA        │     │PostgreSQL│    │
│  │  HMA        │────►│  Service    │────►│         │    │
│  │  Integration│◄────│             │◄────│         │    │
│  │             │     │             │     │         │    │
│  └─────────────┘     └─────────────┘     └─────────┘    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Security Considerations

1. **API Authentication**: All API endpoints are protected with API keys
2. **Webhook Signatures**: Webhooks are verified using HMAC signatures
3. **Data Encryption**: Sensitive data is encrypted at rest
4. **Audit Logging**: All actions are logged for compliance purposes

## Performance Considerations

1. **Asynchronous Processing**: Images are processed asynchronously to avoid blocking
2. **Caching**: Hash results are cached to improve performance
3. **Connection Pooling**: Database connections are pooled for efficiency
4. **Rate Limiting**: API endpoints are rate-limited to prevent abuse

## Error Handling

1. **Graceful Degradation**: The service continues to function even if components fail
2. **Retry Logic**: Failed operations are retried with exponential backoff
3. **Circuit Breaking**: External services are protected with circuit breakers
4. **Comprehensive Logging**: All errors are logged with context for debugging 