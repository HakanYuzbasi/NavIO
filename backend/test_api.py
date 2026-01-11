#!/usr/bin/env python3
"""
Diagnostic script to test NavIO API and database connectivity.
Run this inside the Docker container: docker-compose exec backend python test_api.py
"""

import sys
import requests
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.models import FloorPlan, Node, Edge, POI, QRAnchor


def test_database_connection():
    """Test database connectivity."""
    print("\n" + "="*60)
    print("1. Testing Database Connection")
    print("="*60)

    try:
        engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            print("✅ Database connection successful")

            # Check PostgreSQL version
            result = connection.execute(text("SELECT version()"))
            version = result.fetchone()[0]
            print(f"   PostgreSQL version: {version.split(',')[0]}")

        return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False


def test_database_tables():
    """Test if all required tables exist."""
    print("\n" + "="*60)
    print("2. Testing Database Tables")
    print("="*60)

    try:
        engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()

        # Check for floor_plans
        floor_plan_count = db.query(FloorPlan).count()
        print(f"✅ floor_plans table: {floor_plan_count} records")

        # Check for nodes
        node_count = db.query(Node).count()
        print(f"✅ nodes table: {node_count} records")

        # Check for edges
        edge_count = db.query(Edge).count()
        print(f"✅ edges table: {edge_count} records")

        # Check for pois
        poi_count = db.query(POI).count()
        print(f"✅ pois table: {poi_count} records")

        # Check for qr_anchors
        qr_count = db.query(QRAnchor).count()
        print(f"✅ qr_anchors table: {qr_count} records")

        db.close()

        if floor_plan_count == 0:
            print("\n⚠️  WARNING: No floor plans found in database!")
            print("   Run: docker-compose exec backend python seed_dynamic_demo.py")
            return False

        return True
    except Exception as e:
        print(f"❌ Failed to query tables: {e}")
        return False


def test_floor_plan_data():
    """Test floor plan data structure."""
    print("\n" + "="*60)
    print("3. Testing Floor Plan Data")
    print("="*60)

    try:
        engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()

        floor_plans = db.query(FloorPlan).all()

        for fp in floor_plans:
            print(f"\n📍 Floor Plan: {fp.name}")
            print(f"   ID: {fp.id}")
            print(f"   Image URL: {fp.image_url}")
            print(f"   Dimensions: {fp.image_width}x{fp.image_height}")
            print(f"   Nodes: {len(fp.nodes)}")
            print(f"   Edges: {len(fp.edges)}")
            print(f"   POIs: {len(fp.pois)}")
            print(f"   QR Anchors: {len(fp.qr_anchors)}")

        db.close()
        return True
    except Exception as e:
        print(f"❌ Failed to load floor plan data: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_api_endpoint():
    """Test the API endpoint."""
    print("\n" + "="*60)
    print("4. Testing API Endpoints")
    print("="*60)

    try:
        # Test health endpoint
        response = requests.get("http://localhost:8000/health", timeout=5)
        if response.status_code == 200:
            print(f"✅ Health endpoint: {response.json()}")
        else:
            print(f"❌ Health endpoint failed: {response.status_code}")
            return False

        # Test floor plans endpoint
        response = requests.get("http://localhost:8000/api/v1/floor-plans", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Floor plans endpoint: {len(data)} floor plans")

            if len(data) > 0:
                print(f"\n   First floor plan:")
                fp = data[0]
                print(f"   - ID: {fp.get('id')}")
                print(f"   - Name: {fp.get('name')}")
                print(f"   - Image URL: {fp.get('image_url')}")
                print(f"   - Dimensions: {fp.get('image_width')}x{fp.get('image_height')}")
        else:
            print(f"❌ Floor plans endpoint failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False

        return True
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to API - is the backend running?")
        return False
    except Exception as e:
        print(f"❌ API test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_cors_headers():
    """Test CORS headers."""
    print("\n" + "="*60)
    print("5. Testing CORS Configuration")
    print("="*60)

    try:
        response = requests.get(
            "http://localhost:8000/api/v1/floor-plans",
            headers={"Origin": "http://localhost:3000"},
            timeout=5
        )

        cors_header = response.headers.get("Access-Control-Allow-Origin")
        if cors_header:
            print(f"✅ CORS header present: {cors_header}")
        else:
            print("❌ CORS header missing!")
            print("   This will cause frontend to fail!")
            return False

        return True
    except Exception as e:
        print(f"❌ CORS test failed: {e}")
        return False


def main():
    """Run all tests."""
    print("\n" + "🔍 NavIO API Diagnostic Tool " + "\n")

    results = []

    # Run tests
    results.append(("Database Connection", test_database_connection()))
    results.append(("Database Tables", test_database_tables()))
    results.append(("Floor Plan Data", test_floor_plan_data()))
    results.append(("API Endpoints", test_api_endpoint()))
    results.append(("CORS Configuration", test_cors_headers()))

    # Print summary
    print("\n" + "="*60)
    print("📊 Test Summary")
    print("="*60)

    for test_name, passed in results:
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{status}: {test_name}")

    all_passed = all(result[1] for result in results)

    if all_passed:
        print("\n" + "="*60)
        print("🎉 All tests passed! Your NavIO setup is working correctly.")
        print("="*60)
        print("\nNext steps:")
        print("1. Open http://localhost:3000 in your browser")
        print("2. You should see the floor plan selector")
        print("3. Select a floor plan and start navigating!")
    else:
        print("\n" + "="*60)
        print("⚠️  Some tests failed. Please review the errors above.")
        print("="*60)
        print("\nCommon fixes:")
        print("1. Ensure all containers are running: docker-compose ps")
        print("2. Check logs: docker-compose logs backend")
        print("3. Restart containers: docker-compose restart")
        print("4. Reseed database: docker-compose exec backend python seed_dynamic_demo.py")

    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
