"""REST API wrapper for floor plan analysis"""

from flask import Flask, request, jsonify
from floor_plan_analyzer import FloorPlanAnalyzer
import os

app = Flask(__name__)

@app.route('/analyze', methods=['POST'])
def analyze_floor_plan():
    """Analyze uploaded floor plan"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    floor_id = request.form.get('floor_id', 'default')

    # Save temporarily
    temp_path = f'/tmp/{file.filename}'
    file.save(temp_path)

    try:
        # Analyze
        analyzer = FloorPlanAnalyzer(temp_path, floor_id)
        pois = analyzer.detect_pois()
        walkable = analyzer.detect_walkable_areas()

        result = {
            'floor_id': floor_id,
            'poi_count': len(pois),
            'poi_breakdown': {
                'small': sum(1 for p in pois if p.width < 30 or p.height < 30),
                'medium': sum(1 for p in pois if 30 <= min(p.width, p.height) < 100),
                'large': sum(1 for p in pois if min(p.width, p.height) >= 100)
            },
            'walkable_area': {
                'walkable_percent': round(walkable.walkable_percent, 1),
                'booth_percent': round(walkable.booth_percent, 1),
                'wall_percent': round(walkable.wall_percent, 1)
            }
        }

        return jsonify(result)

    finally:
        os.remove(temp_path)

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
