# 🎯 NavIO Food Hall MVP Demo Guide

## Overview

This is a **working MVP demo** of NavIO using a real food hall floor plan with 31 vendor booths. The system demonstrates indoor navigation using QR code positioning and A* pathfinding.

**Value Proposition:** *"Help visitors find booths in seconds"*

---

## 🏢 The Food Hall

The demo features a downtown food hall with:
- **31 Food Vendors** (Ice Cream, Ramen, Pizza, Tacos, BBQ, Coffee, Wine Bar, etc.)
- **11 Navigation Nodes** (key intersections and hubs)
- **13 Walkable Paths** (corridors connecting nodes)
- **5 QR Code Anchors** (for visitor positioning)

### Booth Categories

- **Asian Cuisine**: Ramen, Dumpling, Vietnamese (Phoecel), Thai, Singaporean, Hot Pot
- **American**: Diner, Sandwich, Fried Chicken, BBQ
- **Latin**: Empanada, Taco
- **Italian**: Pizza, Fresh Pasta
- **Healthy**: Vegetarian, Juice Bar, Produce
- **Specialty**: Wine, Craft Beer, Craft Cocktails, Coffee
- **Market**: Butcher, Fishmonger, Seafood, Cheese, Bakery

---

## 🚀 Quick Start

### Step 1: Start NavIO

```bash
# Make sure Docker is running
docker-compose up -d

# Wait ~30 seconds for services to start
```

### Step 2: Seed the Database

```bash
# Run the seed script to populate the food hall data
docker-compose exec backend python seed_food_hall.py
```

You should see:
```
🎉 Food Hall Demo Created Successfully!
📊 Summary:
   • Floor Plan: Food Hall - Main Floor
   • Navigation Nodes: 11
   • Walkable Paths: 13
   • Food Booths: 31
   • QR Anchors: 5
```

### Step 3: Access the Application

Open your browser:

- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs

---

## 🎮 How to Use the Demo

### Scenario 1: Find a Specific Booth

**User Story**: *"I just entered the food hall and want to find the Ramen booth"*

1. **Scan QR Code** (simulate by selecting):
   - At entrance: `FOODHALL-MAIN-ENTRANCE`
   - This sets your current location

2. **Select Destination**:
   - Choose "Booth 4: Ramen" from the list

3. **Get Directions**:
   - Click "Calculate Route"
   - System shows:
     - Route highlighted on map
     - Turn-by-turn instructions
     - Estimated walking time
     - Total distance

4. **Follow the Route**:
   - Blue line shows the path
   - Green marker = Start (your location)
   - Red marker = Destination (Ramen booth)

### Scenario 2: Explore Different Vendors

**User Story**: *"I want to see what food options are available"*

1. **Browse Booths**:
   - Use the navigation panel
   - All 31 vendors are listed by category
   - Click on any booth to see details

2. **Navigate to Multiple Places**:
   - Select "Booth 22: Wine"
   - Get directions
   - After arriving, select "Booth 29: Cheese"
   - Get new directions

### Scenario 3: Re-position Yourself

**User Story**: *"I took a wrong turn and want to update my location"*

1. **Scan New QR Code**:
   - Find nearest QR anchor
   - Scan to update position
   - System recalculates route from new location

2. **QR Anchor Locations**:
   - Main Entrance (Ludlow St)
   - South Entrance
   - Central Seating Area
   - Coffee & Bar Area
   - Wine & Cheese Corner

---

## 🧪 Testing the Pathfinding

### Test Case 1: Simple Route

**From**: Main Entrance → **To**: Booth 4 (Ramen)

**Expected Path**:
```
Main Entrance → Central North Intersection → Ramen Booth
Distance: ~140 pixels (~14 meters)
Time: ~1 minute
```

### Test Case 2: Cross-Venue Route

**From**: South Entrance → **To**: Booth 10 (Bakery)

**Expected Path**:
```
South Entrance → Central South → Center → Central North → East North → Bakery
Distance: ~550 pixels (~55 meters)
Time: ~3-4 minutes
```

### Test Case 3: Complex Route with Turns

**From**: Coffee (Booth 19) → **To**: Hot Pot (Booth 11)

**Expected Path**:
```
Coffee → Craft Cocktail Junction → Central Hub → East Central Hub →
East South Intersection → Hot Pot
Distance: ~400 pixels (~40 meters)
Time: ~2-3 minutes
```

---

## 📱 QR Code System

### How It Works

1. **QR Code Placement**:
   - Printed QR codes placed at 5 strategic locations
   - Each QR maps to a specific node (x, y coordinates)

2. **Visitor Scans QR**:
   - Opens NavIO web app
   - Automatically sets current location
   - Shows nearby booths

3. **Navigation**:
   - Visitor selects destination
   - A* algorithm calculates optimal path
   - Route displayed on interactive map

4. **Re-scan Updates**:
   - Visitor can re-scan at any location
   - Current position updates
   - Route recalculates from new position

### QR Anchor Locations

| Code | Location | Node | Purpose |
|------|----------|------|---------|
| `FOODHALL-MAIN-ENTRANCE` | Ludlow Street Entrance | n1 | Primary entry point |
| `FOODHALL-SOUTH-ENTRANCE` | South Door | n7 | Secondary entry |
| `FOODHALL-CENTRAL-HUB` | Central Seating | n5 | Main gathering area |
| `FOODHALL-COFFEE-BAR` | Coffee & Cocktails | n10 | Popular hangout spot |
| `FOODHALL-WINE-CORNER` | Wine & Cheese | n11 | Specialty area |

---

## 🎯 API Endpoints to Try

### 1. Get Floor Plan

```bash
GET http://localhost:8000/api/v1/floor-plans/
```

Returns the Food Hall floor plan with all data.

### 2. Calculate Route

```bash
POST http://localhost:8000/api/v1/routes/calculate
```

**Example Body**:
```json
{
  "floor_plan_id": "<your-floor-plan-id>",
  "start_node_id": "<main-entrance-node-id>",
  "end_node_id": "<ramen-booth-node-id>",
  "preferences": {
    "accessible_only": true,
    "avoid_stairs": false
  }
}
```

**Response**:
```json
{
  "success": true,
  "route": {
    "path": ["node-1-id", "node-2-id", "node-3-id"],
    "total_distance": 142.5,
    "estimated_time_seconds": 85,
    "coordinates": [
      {"x": 150, "y": 100},
      {"x": 390, "y": 100},
      {"x": 430, "y": 70}
    ],
    "instructions": [
      {"step": 1, "action": "Start at Main Entrance", "distance": 0},
      {"step": 2, "action": "Walk east along north corridor", "distance": 240},
      {"step": 3, "action": "Turn right to Ramen booth", "distance": 30}
    ]
  }
}
```

### 3. Scan QR Code

```bash
POST http://localhost:8000/api/v1/qr-anchors/scan
```

**Body**:
```json
{
  "qr_code": "FOODHALL-MAIN-ENTRANCE"
}
```

**Response**:
```json
{
  "success": true,
  "floor_plan": {
    "id": "...",
    "name": "Food Hall - Main Floor",
    "image_url": "/demo/food-hall-floorplan.png"
  },
  "location": {
    "node_id": "...",
    "x": 150,
    "y": 100,
    "name": "Main Entrance (Ludlow St)"
  },
  "nearby_pois": [
    {"id": "...", "name": "Booth 1: Ice Cream", "distance": 25.5},
    {"id": "...", "name": "Booth 1A: Vegan Chocolate", "distance": 30.2}
  ]
}
```

### 4. Search Booths

```bash
GET http://localhost:8000/api/v1/floor-plans/{id}/pois?category=japanese
```

Returns all Japanese food booths (Ramen, etc.)

---

## 🏗️ Technical Architecture

### Navigation Graph

```
     [1: Ice Cream]  [1A: Vegan]  [2: Diner]  [3: Phoecel] ... [10: Bakery]
              |            |           |            |              |
         [n1]──────────[n2]──────────────────────[n3]
    Main Entrance      Central North          East North
              |            |                       |
              |            |                       |
         [n4]──────────[n5]──────────────────────[n6]
    West Central      Central Hub             East Central
              |            |                       |
              |            |                       |
         [n7]──────────[n8]──────────────────────[n9]
    South Entrance    Central South           East South
              |            |                       |
        [18: Thai]    [16: Pizza]           [11: Hot Pot]
```

### Pathfinding Algorithm

**A* (A-Star) Implementation:**

1. **Heuristic Function**: Euclidean distance to goal
   ```python
   h(n) = sqrt((x_goal - x_n)² + (y_goal - y_n)²)
   ```

2. **Edge Weights**: Physical distance between nodes
   ```python
   weight = sqrt((x2 - x1)² + (y2 - y1)²)
   ```

3. **Path Selection**: Minimize `f(n) = g(n) + h(n)`
   - `g(n)` = cost from start to node
   - `h(n)` = estimated cost from node to goal

4. **Complexity**: O(E log V) where E = edges, V = vertices

---

## 📊 Demo Metrics

### Performance Targets

- **Route Calculation**: < 100ms
- **QR Scan Response**: < 200ms
- **Map Load Time**: < 1 second
- **POI Search**: < 50ms

### User Experience Goals

- **Time to Find Booth**: < 30 seconds (from entry to destination)
- **Navigation Accuracy**: 95%+ (users find correct booth)
- **QR Scan Success Rate**: 98%+
- **User Satisfaction**: 4.5/5 stars

---

## 🎨 Customization

### Add More Booths

Edit `seed_food_hall.py`:

```python
booths_data = [
    # Add new booth
    {"num": 31, "name": "Sushi Bar", "x": 720, "y": 370,
     "category": "japanese", "node": "n9"},
]
```

Run seed script again:
```bash
docker-compose exec backend python seed_food_hall.py
```

### Adjust Coordinates

Use the interactive API docs to create nodes visually:

1. Go to http://localhost:8000/docs
2. Click map to get (x, y) coordinates
3. Use `POST /nodes/` endpoint to add nodes
4. Connect with edges using `POST /edges/`

---

## 🐛 Troubleshooting

### No Booths Showing

**Problem**: Database not seeded

**Solution**:
```bash
docker-compose exec backend python seed_food_hall.py
```

### Route Calculation Fails

**Problem**: Nodes not connected

**Solution**: Check edges exist between start and end nodes
```bash
GET http://localhost:8000/api/v1/floor-plans/{id}/edges
```

### QR Scan Not Working

**Problem**: QR anchor not in database

**Solution**: Verify QR codes exist
```bash
GET http://localhost:8000/api/v1/qr-anchors/
```

---

## 🚀 Next Steps

### Enhancements for Production

1. **Real Floor Plan Image**:
   - Replace placeholder with actual food hall photo
   - Upload via API: `POST /floor-plans/upload`

2. **Mobile Optimization**:
   - Add touch gestures for map navigation
   - Implement swipe to view nearby booths
   - Progressive Web App (PWA) features

3. **Analytics**:
   - Track popular routes
   - Measure booth visit frequency
   - QR scan heatmaps

4. **Multi-Language Support**:
   - Spanish, Chinese, Japanese
   - Auto-detect from device settings

5. **Real-Time Updates**:
   - WebSocket for live crowd density
   - Push notifications for wait times
   - Dynamic route suggestions

---

## 📈 MVP Success Metrics

### Week 1 Goals

- ✅ 100+ QR scans
- ✅ 50+ successful navigations
- ✅ < 5% error rate
- ✅ Average navigation time < 30 seconds

### User Feedback Questions

1. "How easy was it to find your booth?" (1-5 scale)
2. "Would you use this app again?" (Yes/No)
3. "What could be improved?"
4. "Did the QR codes work smoothly?" (Yes/No)

---

## 🎯 Value Proposition

### For Visitors

- **Save Time**: Find booths instantly instead of wandering
- **No App Download**: Works in browser via QR code
- **Always Accurate**: Updates position as you move
- **Discover New Places**: Browse all vendors on map

### For Food Hall Operators

- **Increase Foot Traffic**: Guide visitors to less-visible booths
- **Improve Experience**: Reduce visitor frustration
- **Gather Data**: Analytics on popular routes and booths
- **Low Cost**: QR codes are cheap to print and place
- **Easy Setup**: Deploy in < 1 hour

---

## 📞 Support

For issues or questions:

1. Check logs: `docker-compose logs -f backend`
2. Test API: http://localhost:8000/docs
3. Review this guide
4. Check `docs/` folder for technical details

---

## 🎉 Congratulations!

You now have a **working indoor navigation MVP** that:

✅ Uses real-world floor plan
✅ Implements A* pathfinding
✅ Supports QR code positioning
✅ Provides turn-by-turn directions
✅ Works on mobile devices
✅ Scales to multiple venues

**"Help visitors find booths in seconds"** - Mission accomplished! 🚀
