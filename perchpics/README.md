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