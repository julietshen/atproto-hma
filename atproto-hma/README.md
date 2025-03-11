# AT Protocol + HMA Integration Proof of Concept

This is a simple proof of concept demonstrating how the hasher-matcher-actioner (HMA) content moderation pipeline can be integrated with AT Protocol content from the PerchPics application.

## Overview

The AT Protocol (Authenticated Transfer Protocol) is a decentralized social networking protocol that stores content in user repositories. PerchPics is a photo-sharing application built on AT Protocol.

The hasher-matcher-actioner (HMA) is a content moderation pipeline that:
1. Generates perceptual hashes of images (Hasher)
2. Compares these hashes against known databases of problematic content (Matcher)
3. Takes appropriate actions based on match results (Actioner)

This proof of concept demonstrates how content from AT Protocol can be processed through the HMA pipeline for content moderation.

## How It Works

The proof of concept script (`poc-test.js`) simulates the following workflow:

1. Login to PerchPics (simulated)
2. Process an existing image from PerchPics
3. Process the image through the HMA pipeline (simulated)
4. Take action based on match results (simulated)

## Running the Proof of Concept

To run the proof of concept:

```bash
npm install
npm test
```

## Next Steps

This proof of concept demonstrates the basic integration flow. In a production implementation, you would:

1. Connect to a real AT Protocol firehose to monitor content in real-time
2. Implement actual API calls to the HMA service
3. Store match results in a database
4. Implement proper error handling and retry logic
5. Add monitoring and alerting

## Requirements

- Node.js 14+
- Access to PerchPics application
- Access to HMA service (for a real implementation) 