"""
Rectangle Detection Script for Floor Plans
Detects all rectangles (including small ones) in floor plan images and marks them with red dots.
"""

from PIL import Image, ImageDraw
import numpy as np
from scipy import ndimage


def detect_all_rectangles_including_small(img, name):
    """
    Detect ALL rectangles including very small ones in a floor plan image

    Parameters:
    -----------
    img : PIL.Image
        Input floor plan image
    name : str
        Name/description of the image

    Returns:
    --------
    rectangles : list
        List of dictionaries containing rectangle information
    annotated : PIL.Image
        Annotated image with red dots marking rectangle centers
    """
    img_array = np.array(img.convert('L'))  # Convert to grayscale

    # Binary threshold - walls are dark, rooms/rectangles are white
    # Lower threshold (180) to catch more subtle rectangles
    white_regions = (img_array > 180).astype(np.uint8)

    # Label all connected white regions
    labeled, num_features = ndimage.label(white_regions)

    # Create annotated copy of original image
    annotated = img.copy()
    draw = ImageDraw.Draw(annotated)

    rectangles = []

    # Analyze each labeled region
    for region_id in range(1, num_features + 1):
        mask = (labeled == region_id)

        # Get coordinates of all pixels in this region
        coords = np.argwhere(mask)
        if len(coords) < 10:  # Skip extremely tiny regions (less than 10 pixels total)
            continue

        # Calculate bounding box
        min_y, min_x = coords.min(axis=0)
        max_y, max_x = coords.max(axis=0)

        width = max_x - min_x + 1
        height = max_y - min_y + 1

        # Filter criteria
        # Only skip if extremely tiny (less than 5 pixels in any dimension)
        if width < 5 or height < 5:
            continue

        # Skip only if it's the entire image background (more than 95% of image size)
        if width > img.width * 0.95 or height > img.height * 0.95:
            continue

        # Calculate rectangularity (how well the region fills its bounding box)
        area = len(coords)
        bbox_area = width * height
        fill_ratio = area / bbox_area if bbox_area > 0 else 0

        # Very lenient criteria - accept shapes that are at least 30% rectangular
        # This includes small subdivisions and irregular rectangular shapes
        if fill_ratio > 0.3:
            center_x = (min_x + max_x) // 2
            center_y = (min_y + max_y) // 2

            rectangles.append({
                'center': (center_x, center_y),
                'bbox': (min_x, min_y, max_x, max_y),
                'size': (width, height),
                'area': area,
                'fill_ratio': fill_ratio
            })

            # Draw red dot at center
            # Use smaller dots for small rectangles to avoid overcrowding
            if width < 20 or height < 20:
                radius = 2  # Smaller dot for small rectangles
            else:
                radius = 3  # Regular dot for medium/large rectangles

            draw.ellipse([center_x - radius, center_y - radius,
                         center_x + radius, center_y + radius],
                        fill='red', outline='red')

    return rectangles, annotated


def main():
    """Main function to process floor plan images"""

    # Load your floor plan images
    # Replace these filenames with your actual image files
    img1 = Image.open('food-hall-floorplan_3.jpg')
    img2 = Image.open('food-hall-floorplan.jpg')
    img3 = Image.open('food-hall-floorplan_2.jpg')

    images = [img1, img2, img3]
    image_names = ['Image 1 (Maroon/Red)', 'Image 2 (Gold/Tan)', 'Image 3 (Blue)']

    print("Rectangle Detection Results:")
    print("=" * 70)

    all_results = []

    # Process each image
    for idx, (img, name) in enumerate(zip(images, image_names), 1):
        rects, annotated_img = detect_all_rectangles_including_small(img, name)
        count = len(rects)

        # Save annotated image
        output_filename = f'annotated_floorplan_{idx}.png'
        annotated_img.save(output_filename)

        # Categorize rectangles by size
        small = sum(1 for r in rects if r['size'][0] < 30 or r['size'][1] < 30)
        medium = sum(1 for r in rects if 30 <= min(r['size']) and max(r['size']) < 100)
        large = sum(1 for r in rects if min(r['size']) >= 100)

        all_results.append((name, count, small, medium, large))

        # Print results for this image
        print(f"\n{name}:")
        print(f"  Total rectangles: {count}")
        print(f"    - Small (< 30px): {small}")
        print(f"    - Medium (30-100px): {medium}")
        print(f"    - Large (> 100px): {large}")
        print(f"  Saved as: {output_filename}")

    # Print summary
    print("\n" + "=" * 70)
    total = sum(count for _, count, _, _, _ in all_results)
    print(f"TOTAL RECTANGLES: {total}")
    print("\nDetection includes:")
    print("- Individual rooms and stalls")
    print("- Small subdivisions and partitions")
    print("- Tiny rectangular elements within larger spaces")


if __name__ == "__main__":
    main()
