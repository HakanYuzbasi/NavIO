"""
API Documentation enhancements for NavIO.

Provides detailed OpenAPI documentation with examples, descriptions,
and organized tags for all API endpoints.
"""

# API Tags with descriptions for OpenAPI grouping
TAGS_METADATA = [
    {
        "name": "authentication",
        "description": "User authentication and authorization operations. "
                       "Register new users, login to get JWT tokens, and manage user profiles.",
    },
    {
        "name": "floor-plans",
        "description": "Floor plan management operations. "
                       "Create, read, update, and delete floor plans with their associated images.",
    },
    {
        "name": "nodes",
        "description": "Navigation node operations. "
                       "Nodes are waypoints in the navigation graph used for pathfinding.",
    },
    {
        "name": "edges",
        "description": "Navigation edge operations. "
                       "Edges connect nodes and define walkable paths with weights and accessibility info.",
    },
    {
        "name": "pois",
        "description": "Points of Interest (POI) operations. "
                       "POIs are searchable destinations like booths, rooms, and facilities.",
    },
    {
        "name": "qr-anchors",
        "description": "QR code anchor operations. "
                       "QR anchors are physical markers that help users locate themselves on the map.",
    },
    {
        "name": "navigation",
        "description": "Navigation and pathfinding operations. "
                       "Calculate routes between nodes using A* algorithm with accessibility options.",
    },
    {
        "name": "detection",
        "description": "Automatic detection operations. "
                       "Use computer vision to detect booths and analyze floor plan images.",
    },
    {
        "name": "health",
        "description": "Service health and monitoring endpoints. "
                       "Check API status, database connectivity, and cache health.",
    },
]

# Example request/response bodies for documentation
EXAMPLES = {
    "floor_plan_create": {
        "summary": "Create a new floor plan",
        "description": "Create a floor plan for a food court venue",
        "value": {
            "name": "Food Court - Level 1",
            "description": "Main food court area with 24 vendor booths",
            "image_width": 1920,
            "image_height": 1080,
            "organization_id": None
        }
    },
    "floor_plan_response": {
        "summary": "Floor plan response",
        "value": {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "name": "Food Court - Level 1",
            "description": "Main food court area with 24 vendor booths",
            "image_url": "/uploads/floor_plans/food_court_l1.png",
            "image_width": 1920,
            "image_height": 1080,
            "organization_id": None,
            "created_at": "2024-01-15T10:30:00Z",
            "updated_at": "2024-01-15T10:30:00Z"
        }
    },
    "node_create": {
        "summary": "Create a navigation node",
        "description": "Create a waypoint node at specific coordinates",
        "value": {
            "floor_plan_id": "550e8400-e29b-41d4-a716-446655440000",
            "x": 150.5,
            "y": 200.0,
            "node_type": "waypoint",
            "name": "Corridor Junction A",
            "accessibility_level": "wheelchair_accessible"
        }
    },
    "edge_create": {
        "summary": "Create an edge between nodes",
        "description": "Connect two nodes with a walkable path",
        "value": {
            "floor_plan_id": "550e8400-e29b-41d4-a716-446655440000",
            "source_node_id": "550e8400-e29b-41d4-a716-446655440001",
            "target_node_id": "550e8400-e29b-41d4-a716-446655440002",
            "weight": None,
            "bidirectional": True,
            "accessible": True,
            "edge_type": "corridor"
        }
    },
    "poi_create": {
        "summary": "Create a Point of Interest",
        "description": "Add a searchable destination on the floor plan",
        "value": {
            "floor_plan_id": "550e8400-e29b-41d4-a716-446655440000",
            "node_id": "550e8400-e29b-41d4-a716-446655440001",
            "name": "Thai Kitchen",
            "description": "Authentic Thai cuisine - Pad Thai, Green Curry, Tom Yum",
            "category": "food",
            "x": 150.5,
            "y": 200.0,
            "icon": "restaurant",
            "searchable": True,
            "custom_metadata": {
                "cuisine": "Thai",
                "price_range": "$$",
                "hours": "10:00 AM - 9:00 PM"
            }
        }
    },
    "route_request": {
        "summary": "Calculate a route",
        "description": "Find the shortest path between two nodes",
        "value": {
            "floor_plan_id": "550e8400-e29b-41d4-a716-446655440000",
            "start_node_id": "550e8400-e29b-41d4-a716-446655440001",
            "end_node_id": "550e8400-e29b-41d4-a716-446655440005",
            "preferences": {
                "accessible_only": False,
                "avoid_stairs": False,
                "shortest_distance": True
            }
        }
    },
    "route_response": {
        "summary": "Successful route response",
        "value": {
            "success": True,
            "floor_plan_id": "550e8400-e29b-41d4-a716-446655440000",
            "start_node_id": "550e8400-e29b-41d4-a716-446655440001",
            "end_node_id": "550e8400-e29b-41d4-a716-446655440005",
            "path": [
                "550e8400-e29b-41d4-a716-446655440001",
                "550e8400-e29b-41d4-a716-446655440002",
                "550e8400-e29b-41d4-a716-446655440003",
                "550e8400-e29b-41d4-a716-446655440005"
            ],
            "total_distance": 245.5,
            "estimated_time_seconds": 175,
            "coordinates": [
                {"x": 100.0, "y": 100.0},
                {"x": 150.0, "y": 100.0},
                {"x": 150.0, "y": 200.0},
                {"x": 200.0, "y": 200.0}
            ],
            "instructions": [
                {"step": 1, "action": "Start at Entrance A", "distance": 0},
                {"step": 2, "action": "Walk straight for 50 units", "distance": 50.0},
                {"step": 3, "action": "Continue to Corridor B", "distance": 150.0},
                {"step": 4, "action": "Arrive at Thai Kitchen", "distance": 245.5}
            ]
        }
    },
    "qr_scan_request": {
        "summary": "Scan a QR code",
        "description": "Process a QR code scan to get location information",
        "value": {
            "qr_code": "NAV-FC1-001"
        }
    },
    "qr_scan_response": {
        "summary": "QR scan response with location",
        "value": {
            "success": True,
            "floor_plan": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "name": "Food Court - Level 1",
                "image_url": "/uploads/floor_plans/food_court_l1.png",
                "image_width": 1920,
                "image_height": 1080
            },
            "location": {
                "node_id": "550e8400-e29b-41d4-a716-446655440001",
                "x": 100.0,
                "y": 100.0,
                "name": "Entrance A"
            },
            "nearby_pois": [
                {"id": "poi-001", "name": "Thai Kitchen", "distance": 25.5, "category": "food"},
                {"id": "poi-002", "name": "Information Desk", "distance": 30.2, "category": "information"}
            ]
        }
    },
    "user_register": {
        "summary": "Register a new user",
        "value": {
            "email": "user@example.com",
            "password": "SecurePass123",
            "full_name": "John Doe"
        }
    },
    "login_request": {
        "summary": "Login to get access token",
        "value": {
            "email": "user@example.com",
            "password": "SecurePass123"
        }
    },
    "detect_booths_response": {
        "summary": "Booth detection results",
        "value": {
            "success": True,
            "floor_plan_id": "550e8400-e29b-41d4-a716-446655440000",
            "booths_detected": 24,
            "booths_created": 24,
            "method": "auto",
            "message": "Successfully detected 24 booths using auto method",
            "booths": [
                {
                    "x": 150,
                    "y": 200,
                    "width": 80,
                    "height": 60,
                    "area": 4800,
                    "confidence": 0.92,
                    "name": "Booth 1",
                    "category": "vendor",
                    "description": "Vendor booth"
                }
            ]
        }
    }
}

# Detailed endpoint descriptions
ENDPOINT_DESCRIPTIONS = {
    "create_floor_plan": """
Create a new floor plan for indoor navigation.

A floor plan represents a navigable space (building floor, venue, etc.) with:
- An associated image showing the layout
- Dimensions for coordinate mapping
- Optional organization for multi-tenancy

After creating a floor plan, you can:
1. Add nodes to create the navigation graph
2. Connect nodes with edges
3. Add POIs for searchable destinations
4. Use booth detection to auto-create POIs
""",

    "calculate_route": """
Calculate the optimal route between two nodes using the A* pathfinding algorithm.

The route calculation:
1. Builds a navigation graph from nodes and edges
2. Applies route preferences (accessibility, avoid stairs)
3. Uses A* with Euclidean distance heuristic
4. Returns step-by-step instructions

**Caching**: Navigation graphs are cached in Redis for improved performance.
Cache is automatically invalidated when nodes or edges are modified.

**Preferences**:
- `accessible_only`: Only use wheelchair-accessible paths
- `avoid_stairs`: Prefer elevators and ramps
- `shortest_distance`: Optimize for shortest path (default)
""",

    "detect_booths": """
Automatically detect booths and rooms in a floor plan image using computer vision.

**Detection Methods**:
- `auto`: Automatically selects the best method based on image analysis
- `adaptive`: Uses adaptive thresholding for uneven lighting
- `fixed`: Uses a fixed brightness threshold
- `otsu`: Uses Otsu's automatic thresholding

**How it works**:
1. Analyzes image histogram to determine optimal threshold
2. Identifies white/light colored rectangular areas (booths)
3. Detects internal grid lines to subdivide large areas
4. Calculates confidence scores based on shape and size

**Output**:
- Each detected booth includes confidence score (0.0-1.0)
- Booths are categorized as: vendor, kiosk, or room
- If `auto_create=true`, POIs are automatically created
""",

    "scan_qr": """
Process a QR code scan to determine the user's location.

When a user scans a QR anchor:
1. The QR code is looked up in the database
2. The associated node provides the exact location
3. Nearby POIs within 50 units are returned
4. The scan count is incremented for analytics

**Use Case**:
Place QR codes at key locations in the venue. When users scan them,
they can see their current location on the map and get navigation
instructions to their destination.
"""
}

# OpenAPI description for the API root
API_DESCRIPTION = """
# NavIO - Indoor Wayfinding API

NavIO is a comprehensive indoor navigation solution for venues like food courts,
malls, airports, and hospitals. This API provides all the backend functionality
for creating navigable floor plans, calculating routes, and enabling QR-based
indoor positioning.

## Features

### Navigation Graph
- **Nodes**: Waypoints forming the navigation network
- **Edges**: Connections between nodes with weights and accessibility info
- **A* Pathfinding**: Optimal route calculation with preferences

### Points of Interest (POIs)
- Searchable destinations (restaurants, shops, facilities)
- Category-based filtering
- Custom metadata support

### QR Code Localization
- QR anchors for indoor positioning
- Scan tracking for analytics
- Nearby POI discovery

### Computer Vision
- Automatic booth detection from floor plan images
- Confidence scoring for detections
- Multiple detection methods

## Authentication

Most write operations require authentication. The API uses JWT (JSON Web Tokens):

1. Register a new account: `POST /api/v1/auth/register`
2. Login to get token: `POST /api/v1/auth/login`
3. Include token in requests: `Authorization: Bearer <token>`

## Rate Limiting

API endpoints are rate-limited to prevent abuse:
- Default: 1000 requests per hour per IP
- Health endpoints: Unlimited

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Time until limit resets

## Error Handling

Errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "path": "/api/v1/endpoint",
    "method": "POST",
    "correlation_id": "abc-123"
  }
}
```

Use the `correlation_id` when reporting issues.

## Caching

Navigation graphs are cached in Redis for improved performance.
Cache headers indicate cache status:
- `X-Cache`: HIT or MISS
- `X-Cache-TTL`: Time remaining in cache

## Support

For issues and feature requests, visit:
https://github.com/HakanYuzbasi/NavIO/issues
"""
