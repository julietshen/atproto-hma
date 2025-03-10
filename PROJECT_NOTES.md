# AT Protocol HMA Integration - Project Notes

## Project Overview

This project implements a lightweight, efficient integration of Meta's Hasher-Matcher-Actioner (HMA) with AT Protocol applications for content moderation. The solution supports NCMEC hash database scanning and is suitable for small Bluesky PDS hosts and independent AppView operators.

## Development Log

### 2023-03-10: Initial Implementation

#### Completed Tasks

1. **Project Setup**
   - Created repository structure
   - Set up basic configuration files (.env.example, requirements.txt)
   - Created Docker and Docker Compose configurations
   - Updated README.md with project details

2. **Core Implementation**
   - Implemented API endpoints for hashing, matching, and actions
   - Created webhook handlers for AT Protocol and HMA integration
   - Developed database models for storing hashes, matches, and actions
   - Implemented client libraries for HMA and AT Protocol
   - Added utility functions for image processing

3. **Documentation**
   - Created architecture document explaining system design
   - Developed integration guide for PDS and AppView operators
   - Added API documentation for developers

#### Architecture

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

#### Key Features Implemented

1. **API Layer**
   - Hash endpoints for processing images
   - Match endpoints for comparing against known databases
   - Action endpoints for taking moderation actions
   - Webhook endpoints for receiving callbacks
   - Status endpoints for monitoring

2. **Service Layer**
   - HMA client for communicating with the HMA service
   - AT Protocol client for interacting with PDS/AppView
   - Image processing utilities for preparing images

3. **Data Layer**
   - Database models for hashes, matches, and actions
   - Database initialization scripts
   - Persistence layer for audit logging

#### Deployment Configuration

- Docker Compose setup with:
  - AT Protocol HMA Integration service
  - HMA service
  - PostgreSQL database

#### Next Steps

1. **Testing**
   - Implement unit tests for core functionality
   - Add integration tests for API endpoints
   - Create end-to-end tests with AT Protocol applications

2. **Performance Optimization**
   - Add caching for frequently accessed hashes
   - Implement batch processing for high-volume scenarios
   - Optimize database queries for scale

3. **Security Enhancements**
   - Add rate limiting to prevent abuse
   - Implement more robust authentication
   - Add encryption for sensitive data

4. **Documentation Improvements**
   - Create API reference documentation
   - Add more examples for different integration scenarios
   - Create troubleshooting guide

## PerchPics Application Notes

### 2025-03-10: React Compatibility Findings

During development of the PerchPics application, we encountered critical compatibility issues that were resolved by using specific dependency versions. These findings are important for future development:

#### Key Compatibility Requirements

1. **React and React Router Versions**:
   - **Working Configuration**: React 18.2.0 and React Router 6.22.1
   - **Problematic Configuration**: React 19.0.0 and React Router 7.3.0
   - **Issue**: React 19 introduces breaking changes that are incompatible with our application structure and React Router 7 has significant API changes

2. **Authentication Implementation**:
   - The custom AT Protocol service (atproto.ts) handles authentication locally
   - Tokens are stored in localStorage with clear isLoggedIn() functionality
   - The PDS (Personal Data Server) implementation must be complete and functional

3. **Application Structure**:
   - Clean, straightforward structure with a simple App.tsx that handles routing and authentication
   - Standard React Router v6 patterns with Routes and Route components
   - Well-defined authentication flow

4. **Backend Integration**:
   - PDS server configured to run on port 3001
   - Frontend configured to communicate with this server
   - Database setup includes automatic creation of a demo user

#### Troubleshooting Notes

If the application shows a blank page or fails to render:
1. Check React and React Router versions - must use React 18.x and React Router 6.x
2. Verify the root element exists in index.html
3. Ensure authentication flow is properly implemented
4. Check for console errors related to hooks or routing

#### Commit Reference

The working version is based on commit c5573bad822e02be096d225da84367e1cbe8ac98, which should be used as the reference implementation for any future development.

### 2025-03-15: User Experience Improvements

#### Photo Upload Enhancements

1. **Optional Caption and Alt Text**:
   - Modified the frontend (Upload.tsx) to make caption and alt text fields optional
   - Updated the backend (photos.js) to handle uploads without caption or alt text
   - Improved user experience by removing mandatory fields that might discourage photo sharing
   - Added appropriate UI indicators to show which fields are optional

2. **Implementation Details**:
   - Frontend changes:
     - Removed validation checks that required caption and alt text
     - Updated form labels to indicate optional fields
     - Removed the `required` attribute from input fields
   - Backend changes:
     - Removed validation check that required a caption
     - Added default empty string for caption if not provided
     - Maintained compatibility with existing database schema

3. **Testing Considerations**:
   - Verified uploads work correctly with:
     - Both caption and alt text provided
     - Only caption provided
     - Only alt text provided
     - Neither caption nor alt text provided
   - Confirmed that the application handles all cases gracefully

#### Benefits

1. **Improved User Experience**:
   - Reduced friction in the upload process
   - Allows for quicker sharing of photos
   - Maintains accessibility options while making them optional

2. **Increased Flexibility**:
   - Users can choose what metadata to include with their photos
   - Supports different use cases (quick sharing vs. detailed posts)

## Implementation Notes

### Key Design Decisions

1. **Standalone Service Approach**
   - Implemented as a separate service rather than a library to allow for independent scaling
   - Provides a clean separation of concerns between AT Protocol and content moderation

2. **Docker-Based Deployment**
   - Leverages HMA's existing Docker container
   - Simplifies deployment for small teams and indie developers
   - Allows for easy updates when HMA is updated

3. **Webhook Integration**
   - Provides a non-blocking way to integrate with AT Protocol applications
   - Allows for asynchronous processing of images
   - Reduces impact on user experience

### Challenges and Solutions

1. **Integration with HMA API**
   - Challenge: Understanding the HMA API and how to properly integrate with it
   - Solution: Created a dedicated client library that abstracts away the complexity

2. **AT Protocol Integration Points**
   - Challenge: Identifying the best points to integrate with AT Protocol
   - Solution: Provided multiple integration options (webhooks, direct API calls)

3. **Error Handling and Resilience**
   - Challenge: Ensuring the system is robust against failures
   - Solution: Implemented comprehensive error handling and fallback mechanisms

## Resources

- [Meta's Hasher-Matcher-Actioner](https://github.com/facebook/ThreatExchange/tree/main/hasher-matcher-actioner)
- [AT Protocol](https://atproto.com/)
- [Bluesky](https://bsky.app/) 