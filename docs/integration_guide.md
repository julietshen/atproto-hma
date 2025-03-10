# AT Protocol HMA Integration Guide

This guide explains how to integrate the AT Protocol HMA service with your AT Protocol application (PDS or AppView).

## Overview

The AT Protocol HMA Integration provides a bridge between Meta's Hasher-Matcher-Actioner (HMA) system and AT Protocol applications. It allows you to:

1. Hash images during upload using PDQ and other algorithms
2. Match hashes against known databases (like NCMEC)
3. Take appropriate actions based on matches
4. Maintain compliance logs for legal requirements

## Integration Options

There are two main ways to integrate with AT Protocol applications:

### 1. Webhook Integration

This is the simplest approach and requires minimal changes to your AT Protocol application.

1. Configure your AT Protocol application to send webhooks to the AT Protocol HMA service when images are uploaded
2. The AT Protocol HMA service will process the images, match against databases, and take appropriate actions
3. The AT Protocol HMA service will call back to your AT Protocol application to take actions (e.g., takedown content)

#### Example Webhook Configuration

```json
{
  "webhook_url": "https://your-atproto-hma-service.example.com/api/v1/webhook/atproto-callback",
  "events": ["image_upload", "moderation_action"],
  "secret": "your_webhook_secret"
}
```

### 2. Direct API Integration

For more control, you can directly call the AT Protocol HMA service API from your AT Protocol application.

1. When an image is uploaded to your AT Protocol application, call the AT Protocol HMA service API to hash and match the image
2. Based on the response, take appropriate actions in your AT Protocol application

#### Example API Call

```python
import requests

# Hash an image
response = requests.post(
    "https://your-atproto-hma-service.example.com/api/v1/hash",
    files={"file": open("image.jpg", "rb")},
)
hash_results = response.json()

# Match a hash
response = requests.post(
    "https://your-atproto-hma-service.example.com/api/v1/match",
    json={
        "hash_value": hash_results["hashes"][0]["hash_value"],
        "hash_type": hash_results["hashes"][0]["algorithm"],
        "threshold": 0.9
    },
)
match_results = response.json()

# Take action if there are matches
if match_results["match_count"] > 0:
    requests.post(
        "https://your-atproto-hma-service.example.com/api/v1/action",
        json={
            "action_id": "123",
            "action_type": "takedown",
            "content_id": "content_123",
            "match_info": match_results["matches"][0]
        },
    )
```

## Integration Points in AT Protocol

### For PDS Operators

The main integration points in a PDS are:

1. **Image Upload**: When a user uploads an image (e.g., for a post or profile picture)
2. **Image Serving**: When serving images to users
3. **Moderation Actions**: When taking moderation actions based on matches

#### Example PDS Integration (pseudocode)

```python
# In your image upload handler
async def handle_image_upload(image_data, user_id):
    # Save the image to your storage
    image_path = save_image(image_data)
    
    # Call the AT Protocol HMA service to hash and match the image
    hash_response = await hma_client.hash_image(image_path)
    match_response = await hma_client.match_hash(
        hash_response.hashes[0].hash_value,
        hash_response.hashes[0].algorithm
    )
    
    # If there are matches, take appropriate action
    if match_response.match_count > 0:
        if match_response.matches[0].bank_name == "NCMEC":
            # Report to NCMEC
            await hma_client.take_action(
                action_type="report_ncmec",
                content_id=image_path,
                match_info=match_response.matches[0]
            )
            
            # Take down the content
            await take_down_content(image_path, user_id, "Matched NCMEC database")
            
            # Log the action
            await log_moderation_action(
                user_id=user_id,
                content_id=image_path,
                action="takedown",
                reason="Matched NCMEC database"
            )
            
            return {"error": "Content policy violation"}
    
    # If no matches or no action taken, return success
    return {"success": True, "image_path": image_path}
```

### For AppView Operators

AppView operators can integrate at these points:

1. **Image Display**: When displaying images to users
2. **Moderation UI**: When providing moderation tools to moderators
3. **User Reporting**: When users report content

#### Example AppView Integration (pseudocode)

```javascript
// In your image display component
async function displayImage(imageUrl, contentId) {
  try {
    // Check if the image has been previously matched
    const matchStatus = await checkMatchStatus(contentId);
    
    if (matchStatus.isMatched) {
      // If the image has been matched, don't display it
      return renderPlaceholder("This image has been removed for policy violations");
    }
    
    // If the image hasn't been matched, display it
    return renderImage(imageUrl);
  } catch (error) {
    console.error("Error checking match status:", error);
    // If there's an error, display the image but log the error
    return renderImage(imageUrl);
  }
}

// In your user reporting handler
async function handleUserReport(contentId, reportReason) {
  try {
    // Get the image URL from the content ID
    const imageUrl = await getImageUrl(contentId);
    
    // Call the AT Protocol HMA service to hash and match the image
    const response = await fetch("/api/hma/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentId, imageUrl, reportReason }),
    });
    
    const result = await response.json();
    
    // Show appropriate UI based on the result
    if (result.action === "takedown") {
      return showNotification("Content has been removed");
    } else if (result.action === "review") {
      return showNotification("Content has been queued for review");
    } else {
      return showNotification("Thank you for your report");
    }
  } catch (error) {
    console.error("Error reporting content:", error);
    return showNotification("Error reporting content");
  }
}
```

## Best Practices

1. **Performance**: Hash and match images asynchronously to avoid blocking the user experience
2. **Error Handling**: Implement robust error handling to gracefully handle service downtime
3. **Logging**: Maintain detailed logs of all matches and actions for compliance purposes
4. **Privacy**: Only store the minimum necessary information about users and content
5. **Transparency**: Be transparent with users about content moderation practices

## Troubleshooting

### Common Issues

1. **Service Unavailable**: If the HMA service is unavailable, implement a fallback mechanism to allow content to be uploaded and processed later
2. **False Positives**: If you encounter false positives, adjust the matching threshold or implement a human review process
3. **Performance Issues**: If performance is a concern, consider batching requests or implementing a queue system

### Logging and Monitoring

Monitor the following metrics:

1. **Request Volume**: Number of hash and match requests
2. **Match Rate**: Percentage of content that matches known databases
3. **Action Rate**: Percentage of matches that result in actions
4. **Response Time**: Time taken to hash and match content
5. **Error Rate**: Percentage of requests that result in errors

## Support

If you encounter issues with the AT Protocol HMA integration, please:

1. Check the logs for error messages
2. Verify your configuration settings
3. Ensure the HMA service is running and accessible
4. Contact support at support@example.com 