"""Data processing pipeline for floor plan analysis"""

import os
import json
from pathlib import Path
from typing import Dict, List
from floor_plan_analyzer import FloorPlanAnalyzer
from pathfinding import NavigationGraph


class FloorPlanPipeline:
    """Complete pipeline for processing floor plans"""

    def __init__(self, input_dir: str, output_dir: str = 'data/exports'):
        """
        Initialize pipeline

        Args:
            input_dir: Directory containing floor plan images
            output_dir: Directory for outputs
        """
        self.input_dir = input_dir
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def process_floor(self, image_path: str, floor_id: str) -> Dict:
        """
        Process single floor plan

        Returns:
            Dictionary with analysis results
        """
        analyzer = FloorPlanAnalyzer(image_path, floor_id)

        # Detect POIs and walkable areas
        pois = analyzer.detect_pois()
        walkable = analyzer.detect_walkable_areas()

        # Visualize
        analyzer.visualize_pois(
            f"{self.output_dir}/{floor_id}_pois.png"
        )
        analyzer.visualize_walkable_areas(
            f"{self.output_dir}/{floor_id}_walkable.png"
        )

        # Export data
        analyzer.export_pois_json(
            f"{self.output_dir}/{floor_id}_pois.json"
        )
        analyzer.export_walkable_json(
            f"{self.output_dir}/{floor_id}_walkable.json"
        )

        return {
            'floor_id': floor_id,
            'poi_count': len(pois),
            'walkable_percent': walkable.walkable_percent
        }

    def process_all_floors(self) -> Dict:
        """Process all floor plans in directory"""
        results = {}

        for filename in os.listdir(self.input_dir):
            if filename.lower().endswith(('.jpg', '.png')):
                image_path = os.path.join(self.input_dir, filename)
                floor_id = Path(filename).stem

                results[floor_id] = self.process_floor(image_path, floor_id)

        return results


# Usage example
if __name__ == "__main__":
    pipeline = FloorPlanPipeline('data/floor_plans')
    results = pipeline.process_all_floors()

    # Save results
    with open('data/exports/pipeline_results.json', 'w') as f:
        json.dump(results, f, indent=2)
