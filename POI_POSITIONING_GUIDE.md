# POI Positioning Guide - Fixing Incorrect Booth Locations

## Problem

The POI (booth/room) locations in your database don't match the actual positions on the floor plan image. This is because they were initially seeded with estimated ratio-based coordinates rather than accurate pixel positions.

## Solution

Use the **Visual POI Editor** to visually drag each POI to its correct location on the floor plan.

---

## Step-by-Step Instructions

### Step 1: Pull Latest Code

```bash
cd /home/user/NavIO
git pull origin claude/find-fix-bug-mk8q0kzwa4qgeaju-dO0nZ
```

### Step 2: Rebuild Frontend

```bash
docker-compose up -d --build frontend
```

Wait about 30 seconds for the frontend to rebuild.

### Step 3: Open the Application

Open your browser and go to:
```
http://localhost:3000
```

### Step 4: Open Admin Panel

Click the **"⚙️ Admin Panel"** button in the top-right corner of the header.

### Step 5: Open Visual POI Editor

1. In the Admin Panel, make sure you're on the **"POIs"** tab (should be selected by default)
2. Click the **"🎯 Visual Editor"** button (purple button, top-right of the POIs section)

### Step 6: Fix POI Positions

The Visual POI Editor will open with:
- **Left sidebar**: List of all POIs with their current positions
- **Right side**: Interactive map with the floor plan and POI markers

**For each POI:**

1. **Find the POI** in the list on the left
   - Example: "Sushi Bar", "Mediterranean Grill", etc.

2. **Click on the POI** in the list to select it
   - It will highlight in blue

3. **Locate the POI marker** on the map
   - Red pin with the POI name label

4. **Drag the marker** to the correct position on the floor plan
   - Click and hold on the marker
   - Drag it to where it should actually be
   - Release the mouse button

5. **Position saves automatically**
   - You'll see a green message: "Updated POI position to (x, y)"

6. **Repeat** for all POIs

---

## Visual Editor Features

### Mode Selection

**Select Mode** (default):
- Click POIs in the list to select them
- Drag POIs on the map to reposition
- Get coordinates by clicking on the map

**Place Mode**:
- Select a POI from the list
- Click on the map to instantly move it there
- Faster for rough positioning

### Tips

1. **Zoom the Map**:
   - Use mouse scroll wheel to zoom in/out
   - Get closer for precise placement

2. **Pan the Map**:
   - Click and drag the map background to move around

3. **See Coordinates**:
   - Click anywhere on the map to see coordinates in the message box
   - Useful for checking positions

4. **Verify Changes**:
   - The updated position shows immediately
   - Message displays the new coordinates
   - List updates with new position

---

## Recommended Workflow

### Phase 1: Rough Positioning (5-10 minutes)

1. Open Visual POI Editor
2. Switch to **"Place" mode**
3. For each POI in the list:
   - Click the POI name
   - Click approximately where it should be on the map
   - Move to next POI
4. This gets all POIs roughly in the right area

### Phase 2: Fine-Tuning (10-15 minutes)

1. Switch back to **"Select" mode**
2. Zoom in on the map (scroll wheel)
3. For each POI:
   - Drag it to the exact position
   - Match it to the actual booth/room on the floor plan
   - Verify the name matches the location

### Phase 3: Verification (5 minutes)

1. Close the Visual POI Editor
2. Back in the main NavIO view:
   - Select different floor plans
   - Check that labels appear in correct positions
   - Test navigation between a few locations

---

## Floor Plan Reference

Based on your screenshot, here's what you should see:

### Food Hall - Level 2 (1322 × 574 pixels)

**Top Row (from left to right)**:
1. **Sushi Bar** - Top-left corner area
2. **Mediterranean Grill** - Upper middle-left
3. **French Bistro** - Upper middle-right
4. **Indian Curry House** - Top-right area

**Middle Row**:
5. **Juice & Smoothies** - Middle-left
6. **Salad Bar** - Center-left area
7. **Bubble Tea** - Center-right area
8. **Dessert Bar** - Middle-right

**Bottom Row**:
9. **Korean BBQ** - Bottom-left area
10. **Pasta Station** - Bottom-center
11. **Burger Joint** - Bottom-right area

---

## Coordinate System Reference

### Understanding Coordinates

- **Origin (0, 0)**: Bottom-left corner of the floor plan
- **X-axis**: Left to right (0 to 1322 for Level 2)
- **Y-axis**: Bottom to top (0 to 574 for Level 2)

### Example Positions for Food Hall Level 2

Approximate correct positions:

```
Sushi Bar:           (200, 500)   # Top-left
Mediterranean Grill: (400, 450)   # Upper-middle-left
French Bistro:       (800, 480)   # Upper-middle-right
Indian Curry House:  (1100, 490)  # Top-right

Juice & Smoothies:   (180, 330)   # Middle-left
Salad Bar:           (500, 320)   # Center-left
Bubble Tea:          (900, 310)   # Center-right
Dessert Bar:         (1150, 340)  # Middle-right

Korean BBQ:          (350, 150)   # Bottom-left
Pasta Station:       (650, 120)   # Bottom-center
Burger Joint:        (1050, 140)  # Bottom-right
```

**Note**: These are estimates. Use the Visual POI Editor to drag them to the exact visual positions on your floor plan.

---

## Common Issues

### Issue 1: POI Not Moving

**Cause**: Map is in read-only mode

**Solution**: Make sure you're in the Visual POI Editor (purple button), not just viewing the main map

### Issue 2: Can't Find a POI on the Map

**Cause**: POI is far off-screen due to incorrect initial position

**Solution**:
1. Use **"Place" mode**
2. Click the POI in the list
3. Click on the visible part of the map
4. The POI will jump to that location
5. Then fine-tune with dragging

### Issue 3: Changes Not Saving

**Cause**: Network error or backend not responding

**Solution**:
1. Check backend is running: `curl http://localhost:8000/health`
2. Check browser console (F12) for errors
3. Restart backend: `docker-compose restart backend`

### Issue 4: Labels Overlapping

**Cause**: POIs placed too close together

**Solution**:
1. Zoom in on the map
2. Drag POIs apart to match actual floor plan spacing
3. Consider adjusting label styles if needed

---

## After Fixing Positions

### Test Navigation

1. Close Visual POI Editor
2. Close Admin Panel
3. In the main NavIO interface:
   - Select a start location (e.g., "Sushi Bar")
   - Select an end location (e.g., "Burger Joint")
   - Click "Calculate Route"
   - Verify the route makes sense visually

### Verify on All Floor Plans

Repeat the POI positioning process for all three floor plans:

1. **Food Hall - Main Floor** (784 × 794 px)
   - 21 POIs to position

2. **Food Hall - Level 2** (1322 × 574 px)
   - 11 POIs to position

3. **Food Hall - Event Space** (1892 × 712 px)
   - 6 POIs to position

---

## Advanced: Batch Position Update via Database

If you need to update many POIs at once programmatically:

```bash
# Access database
docker-compose exec -T backend python << 'EOF'
from app.core.database import SessionLocal
from app.models import POI

db = SessionLocal()

# Example: Update Sushi Bar position
sushi_bar = db.query(POI).filter(POI.name == "Sushi Bar").first()
if sushi_bar:
    sushi_bar.x = 200
    sushi_bar.y = 500
    db.commit()
    print(f"Updated {sushi_bar.name} to ({sushi_bar.x}, {sushi_bar.y})")

db.close()
EOF
```

**Note**: The Visual POI Editor is much easier and more accurate!

---

## Production Deployment Recommendations

After fixing all POI positions:

### 1. Export Current Positions

```bash
# Create a backup of correct positions
docker-compose exec -T backend python << 'EOF'
from app.core.database import SessionLocal
from app.models import POI, FloorPlan
import json

db = SessionLocal()

# Export all POIs with positions
floor_plans = db.query(FloorPlan).all()
export_data = []

for fp in floor_plans:
    fp_data = {
        "floor_plan": fp.name,
        "image_size": f"{fp.image_width}x{fp.image_height}",
        "pois": []
    }

    for poi in fp.pois:
        fp_data["pois"].append({
            "name": poi.name,
            "category": poi.category,
            "x": poi.x,
            "y": poi.y,
            "description": poi.description
        })

    export_data.append(fp_data)

print(json.dumps(export_data, indent=2))

db.close()
EOF
```

Save this output to a file for future reference.

### 2. Create Import Script

Use the exported data to create a seed script with correct positions for future deployments.

### 3. Document POI Naming Convention

Create a guide for how to name new POIs:
- Format: `[Type] [Name]` (e.g., "Sushi Bar", "Korean BBQ")
- Category: Use consistent categories (food, beverages, dessert, etc.)
- Description: Include useful info (cuisine type, specialties, etc.)

---

## Summary

**Quick Steps:**
1. Pull latest code
2. Rebuild frontend
3. Open http://localhost:3000
4. Click "⚙️ Admin Panel"
5. Click "🎯 Visual Editor"
6. Drag each POI to its correct position
7. Close and verify

**Time Estimate:**
- Food Hall Level 2 (11 POIs): ~10-15 minutes
- Food Hall Main Floor (21 POIs): ~20-25 minutes
- Food Hall Event Space (6 POIs): ~5-10 minutes
- **Total**: ~35-50 minutes for all three floor plans

**Result:**
- All booth labels appear in correct positions
- Navigation routes are accurate
- Professional, demo-ready appearance
- Ready for institutional-level sales presentations

---

## Support

If you encounter any issues:

1. **Check logs**:
   ```bash
   docker-compose logs frontend --tail=50
   docker-compose logs backend --tail=50
   ```

2. **Restart services**:
   ```bash
   docker-compose restart frontend backend
   ```

3. **Run diagnostics**:
   ```bash
   ./quick-fix.sh
   ```

4. **Test API directly**:
   - Open http://localhost:8000/docs
   - Test PUT /api/v1/pois/{poi_id} endpoint manually

---

**You now have institutional-level tools to create pixel-perfect floor plan layouts for sales demos!** 🎯
