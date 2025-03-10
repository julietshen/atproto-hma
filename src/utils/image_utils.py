"""
AT Protocol HMA Integration - Image Utilities
"""

import io
from typing import Optional
from PIL import Image
from loguru import logger

def process_image(image_data: bytes) -> bytes:
    """
    Process an image for hashing.
    
    Args:
        image_data: Raw image data
        
    Returns:
        bytes: Processed image data
    """
    try:
        # Open the image
        img = Image.open(io.BytesIO(image_data))
        
        # Convert to RGB if needed
        if img.mode != "RGB":
            img = img.convert("RGB")
        
        # Resize to a standard size for consistent hashing
        # Note: PDQ works best with images around 1000px, but we'll use a smaller size for efficiency
        max_size = 1000
        if max(img.size) > max_size:
            # Maintain aspect ratio
            if img.width > img.height:
                new_width = max_size
                new_height = int(img.height * (max_size / img.width))
            else:
                new_height = max_size
                new_width = int(img.width * (max_size / img.height))
            
            img = img.resize((new_width, new_height), Image.LANCZOS)
        
        # Save the processed image to bytes
        output = io.BytesIO()
        img.save(output, format="JPEG", quality=95)
        processed_data = output.getvalue()
        
        return processed_data
        
    except Exception as e:
        logger.error(f"Error processing image: {str(e)}")
        # Return the original image data if processing fails
        return image_data

def is_valid_image(image_data: bytes) -> bool:
    """
    Check if the data is a valid image.
    
    Args:
        image_data: Raw image data
        
    Returns:
        bool: True if the data is a valid image, False otherwise
    """
    try:
        # Try to open the image
        img = Image.open(io.BytesIO(image_data))
        img.verify()
        return True
        
    except Exception as e:
        logger.error(f"Invalid image: {str(e)}")
        return False

def get_image_dimensions(image_data: bytes) -> Optional[tuple]:
    """
    Get the dimensions of an image.
    
    Args:
        image_data: Raw image data
        
    Returns:
        tuple: (width, height) of the image, or None if the data is not a valid image
    """
    try:
        # Open the image
        img = Image.open(io.BytesIO(image_data))
        
        # Return the dimensions
        return img.size
        
    except Exception as e:
        logger.error(f"Error getting image dimensions: {str(e)}")
        return None 