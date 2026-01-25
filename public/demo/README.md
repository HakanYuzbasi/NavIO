# Demo Floor Plan Image

## Instructions

Place the food hall floor plan image here as: `food-hall-floorplan.png`

### Image Requirements

- **Format**: PNG or JPG
- **Recommended Size**: 780x560 pixels (or similar aspect ratio)
- **File Name**: `food-hall-floorplan.png`

### The Image Should Show

The food hall layout with:
- **31 numbered booths** arranged around the perimeter
- **Booth labels** visible (1, 1A, 2, 3, ... 31)
- **Walkways/corridors** between booths
- **Seating areas** in the center
- **Entrances** marked (Ludlow Street entrance on top)

### How to Add the Image

1. **Save your floor plan image**
2. **Rename it to**: `food-hall-floorplan.png`
3. **Place it in this directory**: `/backend/public/demo/`
4. **Restart the backend**: `docker-compose restart backend`

### Alternative: Upload via API

You can also upload the image through the API:

```bash
curl -X POST "http://localhost:8000/api/v1/floor-plans/{floor_plan_id}/upload" \
  -F "file=@/path/to/food-hall-floorplan.png"
```

### Temporary Placeholder

If you don't have the image yet, the system will work without it. The navigation graph and pathfinding will still function - you just won't see the visual floor plan overlay.

### Using a Different Image

If you want to use a different floor plan image:

1. Place your image here with any name
2. Update the `image_url` in `seed_food_hall.py`:
   ```python
   floor_plan = FloorPlan(
       image_url="/demo/your-image-name.png",  # Update this
       ...
   )
   ```
3. Adjust the booth coordinates in the seed script to match your image
4. Re-run the seed script

---

**Note**: The coordinates in the seed script (x, y positions) are based on a 780x560 pixel image. If your image has different dimensions, you'll need to scale the coordinates accordingly.
