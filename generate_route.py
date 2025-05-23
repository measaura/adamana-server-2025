# save as generate_route.py
import requests
import json
import time
import sys
import os

# You'll need a Google Maps API key with Directions API enabled
API_KEY = "YOUR_GOOGLE_MAPS_API_KEY"  

def generate_route(origin, destination, output_file, waypoints=None):
    url = "https://maps.googleapis.com/maps/api/directions/json"
    
    params = {
        "origin": origin,
        "destination": destination,
        "key": API_KEY
    }
    
    if waypoints:
        params["waypoints"] = "|".join(waypoints)
    
    response = requests.get(url, params=params)
    directions = response.json()
    
    if directions["status"] != "OK":
        print(f"Error: {directions['status']}")
        return
    
    # Extract route points
    route_points = []
    now = int(time.time() * 1000)
    time_increment = 30000  # 30 seconds between points
    
    for leg in directions["routes"][0]["legs"]:
        for step in leg["steps"]:
            start_point = {
                "lat": step["start_location"]["lat"],
                "lng": step["start_location"]["lng"],
                "timestamp": now
            }
            route_points.append(start_point)
            now += time_increment
            
            # For more detailed routes, you can also include points along each step
            # by using the polyline encoder/decoder
            
            end_point = {
                "lat": step["end_location"]["lat"],
                "lng": step["end_location"]["lng"],
                "timestamp": now
            }
            route_points.append(end_point)
            now += time_increment
    
    # Write to file
    with open(output_file, 'w') as f:
        json.dump(route_points, f, indent=2)
    
    print(f"Generated route with {len(route_points)} points from {origin} to {destination}")
    print(f"Saved to {output_file}")

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python generate_route.py 'origin' 'destination' output_file [waypoint1 waypoint2 ...]")
        sys.exit(1)
    
    origin = sys.argv[1]
    destination = sys.argv[2]
    output_file = sys.argv[3]
    waypoints = sys.argv[4:] if len(sys.argv) > 4 else None
    
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    generate_route(origin, destination, output_file, waypoints)