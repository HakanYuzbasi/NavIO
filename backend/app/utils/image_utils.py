"""
Image utilities for floor plan processing.
"""
from PIL import Image
import os
from typing import Tuple


def get_image_dimensions(image_path: str) -> Tuple[int, int]:
    """
    Get image dimensions (width, height) from an image file.

    Args:
        image_path: Path to the image file

    Returns:
        Tuple of (width, height)

    Raises:
        FileNotFoundError: If image file doesn't exist
        Exception: If image cannot be processed
    """
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found: {image_path}")

    try:
        with Image.open(image_path) as img:
            return img.size  # Returns (width, height)
    except Exception as e:
        raise Exception(f"Failed to read image dimensions: {e}")


def validate_image(image_path: str, max_size_mb: int = 10) -> bool:
    """
    Validate an image file.

    Args:
        image_path: Path to the image file
        max_size_mb: Maximum file size in megabytes

    Returns:
        True if valid, False otherwise
    """
    if not os.path.exists(image_path):
        return False

    # Check file size
    file_size_mb = os.path.getsize(image_path) / (1024 * 1024)
    if file_size_mb > max_size_mb:
        return False

    # Try to open and validate
    try:
        with Image.open(image_path) as img:
            # Verify it's a valid image
            img.verify()
            return True
    except Exception:
        return False


def get_supported_formats() -> list:
    """Get list of supported image formats."""
    return ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp']
