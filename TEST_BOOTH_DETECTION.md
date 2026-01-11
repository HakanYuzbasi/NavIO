# Test Booth Detection - Updated for Your Floor Plans

## What Changed

I've updated the booth detection to work with **WHITE booths on COLORED backgrounds** (your red, blue, and gold floor plans).

### Key Changes:
1. ✅ Changed threshold from `THRESH_BINARY_INV` to `THRESH_BINARY` (detects white areas)
2. ✅ Lowered min booth area from 1000 to 300 pixels
3. ✅ Increased max booth area from 50,000 to 100,000 pixels
4. ✅ More lenient aspect ratios (0.2-5.0 instead of 0.3-3.0)
5. ✅ Added comprehensive logging to help debug
6. ✅ Added morphological cleanup (removes noise, fills gaps)

---

## Step 1: Pull Latest Changes

```bash
cd /home/user/NavIO
git pull origin claude/find-fix-bug-mk8q0kzwa4qgeaju-dO0nZ
```

---

## Step 2: Install OpenCV Headless (if not done yet)

```bash
docker exec navio_backend pip uninstall -y opencv-python
docker exec navio_backend pip install opencv-python-headless==4.8.1.78
```

Verify:
```bash
docker exec navio_backend python -c "import cv2; print('✅ OpenCV version:', cv2.__version__)"
```

---

## Step 3: Run Debug Analysis (Optional but Recommended)

This helps us understand what size parameters work best for your floor plans:

```bash
docker exec navio_backend python test_booth_detection.py
```

This will analyze all three floor plans and show:
- Image dimensions
- Brightness levels
- Contour counts
- Size distribution
- **Recommended parameters**

---

## Step 4: Test Booth Detection

```bash
# Get floor plan ID
FLOOR_PLAN_ID=$(curl -s http://localhost:8000/api/v1/floor-plans | jq -r '.[0].id')
echo "Testing floor plan: $FLOOR_PLAN_ID"

# Clear existing POIs (optional)
curl -X DELETE "http://localhost:8000/api/v1/floor-plans/$FLOOR_PLAN_ID/clear-pois"

# Run booth detection
curl -X POST "http://localhost:8000/api/v1/floor-plans/$FLOOR_PLAN_ID/detect-booths?method=smart&auto_create=true" | jq
```

---

## Step 5: Check Backend Logs

The logs will now show detailed information:

```bash
docker-compose logs backend | tail -50
```

Look for lines like:
```
Found 245 total contours in image
Detection complete: 47 booths, 198 filtered by size, 0 filtered by aspect ratio
```

This tells you:
- **245 contours**: Total white shapes found
- **47 booths**: Accepted as valid booths
- **198 filtered by size**: Too small or too large
- **0 filtered by aspect ratio**: Wrong shape

---

## Troubleshooting

### Issue: Still detecting 0 booths

**Possible causes:**
1. Size thresholds too restrictive
2. Image not being read correctly
3. Wrong color space interpretation

**Solutions:**

#### A) Check what the debug script recommends:
```bash
docker exec navio_backend python test_booth_detection.py
```

Look for the "Recommended booth detection parameters" section.

#### B) Try with very permissive parameters:

Edit `backend/app/api/routes.py` line 512 to use custom parameters:

```python
# Instead of:
booths = auto_detect_booths(image_path, method=method)

# Try:
from app.services.booth_detection import BoothDetector
detector = BoothDetector(min_booth_area=100, max_booth_area=200000)
booths = detector.detect_booths(image_path) if method == 'basic' else detector.detect_with_smart_categorization(image_path)
```

#### C) Check the logs for clues:

```bash
docker-compose logs backend | grep -A 5 -B 5 "booth"
```

### Issue: Detecting too many booths

If it's picking up noise or small details:

Increase `min_booth_area`:
```bash
# In a Python script or API endpoint, use:
detector = BoothDetector(min_booth_area=500, max_booth_area=50000)
```

### Issue: Missing some booths

If it's not finding all booths:

1. Lower `min_booth_area`
2. Check if those booths are a different color/brightness
3. Try the `basic` or `grid` method instead of `smart`

---

## Testing All Floor Plans

```bash
#!/bin/bash
for id in $(curl -s http://localhost:8000/api/v1/floor-plans | jq -r '.[].id'); do
    echo "Testing floor plan: $id"
    curl -s -X POST "http://localhost:8000/api/v1/floor-plans/$id/detect-booths?method=smart&auto_create=true" | jq '.booths_detected'
    echo ""
done
```

---

## Expected Results

For your three floor plans, you should see:

**Red floor plan** (maroon background):
- Expected: 50-70 booths
- The grid layout with white booth spaces

**Blue floor plan** (light blue background):
- Expected: 60-80 booths
- Multiple rows of vendor spaces

**Gold floor plan** (golden background):
- Expected: 40-60 booths
- Mixed layout with different sized spaces

---

## If It Still Doesn't Work

Share the output of:

1. **Debug script**:
```bash
docker exec navio_backend python test_booth_detection.py
```

2. **Backend logs**:
```bash
docker-compose logs backend | grep -i "booth\|contour\|detected"
```

3. **Image info**:
```bash
docker exec navio_backend python -c "
import cv2
img = cv2.imread('./public/demo/food-hall-floorplan_2.png')
print(f'Dimensions: {img.shape}')
print(f'Average brightness: {img.mean():.1f}')
"
```

This will help us tune the parameters perfectly for your specific floor plans! 🎯
