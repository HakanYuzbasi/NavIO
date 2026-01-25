"""Database models for floor plan data"""

from dataclasses import dataclass
from typing import List
from datetime import datetime
import json


@dataclass
class FloorAnalysis:
    """Stored floor plan analysis"""
    floor_id: str
    image_path: str
    poi_count: int
    walkable_percent: float
    booth_percent: float
    wall_percent: float
    navigation_path_length: int
    analysis_timestamp: str

    def to_json(self) -> str:
        return json.dumps(self.__dict__)


class AnalysisRepository:
    """Store and retrieve floor analyses"""

    def __init__(self, db_path: str = 'data/analyses.json'):
        self.db_path = db_path
        self.analyses: List[FloorAnalysis] = []
        self._load()

    def _load(self):
        """Load analyses from storage"""
        try:
            with open(self.db_path, 'r') as f:
                data = json.load(f)
                self.analyses = [FloorAnalysis(**item) for item in data]
        except FileNotFoundError:
            self.analyses = []

    def save(self, analysis: FloorAnalysis):
        """Save analysis"""
        self.analyses.append(analysis)
        self._persist()

    def _persist(self):
        """Write to storage"""
        with open(self.db_path, 'w') as f:
            json.dump([a.__dict__ for a in self.analyses], f, indent=2)
