"""Unit tests for floor plan analyzer"""

import unittest
import os
from src.floor_plan_analyzer import FloorPlanAnalyzer


class TestFloorPlanAnalyzer(unittest.TestCase):

    def setUp(self):
        """Setup test fixtures"""
        self.test_image = 'test_data/floor_plan.jpg'

    def test_poi_detection(self):
        """Test POI detection"""
        if not os.path.exists(self.test_image):
            self.skipTest("Test image not available")

        analyzer = FloorPlanAnalyzer(self.test_image, 'test_floor')
        pois = analyzer.detect_pois()

        self.assertGreater(len(pois), 0)
        self.assertIsNotNone(pois.center_x)
        self.assertIsNotNone(pois.center_y)

    def test_walkable_detection(self):
        """Test walkable area detection"""
        if not os.path.exists(self.test_image):
            self.skipTest("Test image not available")

        analyzer = FloorPlanAnalyzer(self.test_image, 'test_floor')
        analyzer.detect_pois()
        walkable = analyzer.detect_walkable_areas()

        self.assertGreater(walkable.walkable_percent, 0)
        self.assertLess(walkable.walkable_percent, 100)

    def test_visualization(self):
        """Test POI visualization export"""
        if not os.path.exists(self.test_image):
            self.skipTest("Test image not available")

        analyzer = FloorPlanAnalyzer(self.test_image, 'test_floor')
        analyzer.detect_pois()

        output = 'test_output_pois.png'
        viz = analyzer.visualize_pois(output)

        self.assertTrue(os.path.exists(output))
        os.remove(output)


if __name__ == '__main__':
    unittest.main()
