import os
import json
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

# --- Configuration ---
DATA_FILE = 'live_results.json'
# Define the initial structure if the data file doesn't exist
INITIAL_STRUCTURE = {
    "Berat":       { "totalSeats": 7,  "winner": None, "seatsWon": {} },
    "Dibër":       { "totalSeats": 5,  "winner": None, "seatsWon": {} },
    "Durrës":      { "totalSeats": 14, "winner": None, "seatsWon": {} },
    "Elbasan":     { "totalSeats": 14, "winner": None, "seatsWon": {} },
    "Fier":        { "totalSeats": 16, "winner": None, "seatsWon": {} },
    "Gjirokastër": { "totalSeats": 4,  "winner": None, "seatsWon": {} },
    "Korçë":       { "totalSeats": 10, "winner": None, "seatsWon": {} },
    "Kukës":       { "totalSeats": 3,  "winner": None, "seatsWon": {} },
    "Lezhë":       { "totalSeats": 7,  "winner": None, "seatsWon": {} },
    "Shkodër":     { "totalSeats": 11, "winner": None, "seatsWon": {} },
    "Tiranë":      { "totalSeats": 37, "winner": None, "seatsWon": {} }, 
    "Vlorë":       { "totalSeats": 12, "winner": None, "seatsWon": {} }
}

# Load password from environment variable
# IMPORTANT: Set this environment variable where you deploy the app!
ENTRY_PASSWORD = os.environ.get("ELECTION_MAP_PASSWORD", "default_password") 
# Use a strong default only for local testing if ENV var is not set
if ENTRY_PASSWORD == "default_password":
    print("WARNING: Using default password. Set ELECTION_MAP_PASSWORD environment variable for security.", flush=True)

# --- Flask App Setup ---
app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app) # Enable CORS for all routes

# --- API Route --- 
@app.route('/api/results', methods=['GET', 'POST']) 
def handle_results():
    # --- Handle GET requests ---
    if request.method == 'GET':
        try:
            if os.path.exists(DATA_FILE):
                with open(DATA_FILE, 'r', encoding='utf-8') as f:
                    try:
                        data = json.load(f)
                        return jsonify(data)
                    except json.JSONDecodeError:
                        print(f"Error: {DATA_FILE} contains invalid JSON.")
                        return jsonify({"status": "error", "message": "Data file contains invalid JSON."}), 500
            else:
                # File doesn't exist, return initial structure
                print(f"Info: {DATA_FILE} not found, returning initial structure.")
                return jsonify(INITIAL_STRUCTURE)
        except Exception as e:
            print(f"Error reading data file: {e}")
            return jsonify({"status": "error", "message": "Error reading data file."}), 500

    # --- Handle POST requests ---
    if request.method == 'POST':
        # SECURITY NOTE: This endpoint should ideally verify authentication
        # (e.g., check a session cookie or token set during login)
        # For this basic example, we are not adding that complexity here.
        try:
            # Get data from request body
            new_data = request.get_json()
            if not isinstance(new_data, dict):
                raise ValueError("Invalid JSON data received. Expected an object.")

            # !! IMPORTANT: Add more validation here if needed !!
            # - Check structure, region names, seat types/values, totals per region
            # - Add Authentication/Authorization checks here!

            # Write data to file
            try:
                with open(DATA_FILE, 'w', encoding='utf-8') as f:
                    json.dump(new_data, f, indent=4, ensure_ascii=False)
                print("Info: Data saved successfully.")
                return jsonify({"status": "success", "message": "Data saved successfully."}) 
            except IOError as e:
                print(f"Error writing to data file: {e}")
                return jsonify({"status": "error", "message": "Failed to write data file. Check permissions."}), 500
                
        except Exception as e:
            print(f"Error processing POST request: {e}")
            return jsonify({"status": "error", "message": f"Error processing request: {e}"}), 400
            
# --- Serve Static Files (HTML, JS, CSS, GeoJSON) ---
# Serve index.html from the root
@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

# Serve other static files like JS, CSS, GeoJSON
@app.route('/<path:path>')
def serve_static(path):
    # Security: Basic check to prevent accessing files outside current directory
    if ".." in path:
        return "Not Found", 404 
    # Allow serving known essential file types
    if path.endswith( ( '.html', '.js', '.css', '.geojson', '.json' ) ):
         return send_from_directory('.', path)
    else:
         # Optionally return specific files or a 404 for anything else
         # For simplicity, let's return 404 for unknown paths
         return "Not Found", 404

# API endpoint for login verification
@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        if not data or 'password' not in data:
            return jsonify({"authenticated": False, "error": "Password missing"}), 400
        
        submitted_password = data['password']
        
        if submitted_password == ENTRY_PASSWORD:
            print("Login successful", flush=True)
            return jsonify({"authenticated": True}), 200
        else:
            print("Login failed: Incorrect password", flush=True)
            return jsonify({"authenticated": False}), 401 # Unauthorized
            
    except Exception as e:
        print(f"Login error: {e}", flush=True)
        return jsonify({"authenticated": False, "error": "Server error during login"}), 500

# --- Run the App ---
if __name__ == '__main__':
    # Use 0.0.0.0 to make it accessible on your network if needed
    # Use debug=True for development (shows errors, auto-reloads)
    app.run(host='0.0.0.0', port=8000, debug=True) 