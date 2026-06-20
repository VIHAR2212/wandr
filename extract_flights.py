import csv
import json
import os

def run_extractor():
    print("Initializing OpenFlights data extraction pipeline...")
    
    # 1. Check if the raw data file exists
    source_file = 'routes.txt'
    if not os.path.exists(source_file):
        print(f"Error: {source_file} not found in the root directory.")
        return

    # 2. Target sectors matching the demo locations in Wandr
    target_sectors = ["BOM-COK", "DEL-JAI", "DEL-IXL", "CCU-IXZ", "BOM-LIS", "DEL-KIX"]
    
    # 3. Dynamic layout structures for realistic flight generation
    route_meta = {
        "BOM-COK": {"plane": "Airbus A320neo", "time": "1h 55m", "price": 5400},
        "DEL-JAI": {"plane": "ATR 72-600", "time": "0h 55m", "price": 4200},
        "DEL-IXL": {"plane": "Airbus A320neo", "time": "1h 25m", "price": 8900},
        "CCU-IXZ": {"plane": "Airbus A321", "time": "2h 15m", "price": 7200},
        "BOM-LIS": {"plane": "Boeing 777-300ER", "time": "13h 45m (1-stop)", "price": 68000},
        "DEL-KIX": {"plane": "Boeing 787-9 Dreamliner", "time": "7h 45m", "price": 54000}
    }
    
    airline_names = {
        "6E": "IndiGo", "AI": "Air India", "SG": "SpiceJet", 
        "9I": "Alliance Air", "EK": "Emirates", "JL": "Japan Airlines"
    }

    compiled_db = {sector: [] for sector in target_sectors}

    # 4. Stream and parse the file line-by-line
    with open(source_file, mode='r', encoding='utf-8') as f:
        reader = csv.reader(f)
        for row in reader:
            if not row or len(row) < 5:
                continue
                
            airline_code = row[0].strip()
            origin = row[2].strip()
            destination = row[4].strip()
            route_key = f"{origin}-{destination}"
            
            if route_key in target_sectors:
                meta = route_meta[route_key]
                carrier = airline_names.get(airline_code, f"Airline ({airline_code})")
                
                # Check to prevent duplicate airlines on the same route sector
                if any(f['airline'] == carrier for f in compiled_db[route_key]):
                    continue
                    
                flight_node = {
                    "airline": carrier,
                    "flightNo": f"{airline_code}-{300 + len(compiled_db[route_key]) * 15}",
                    "aircraft": meta["plane"],
                    "duration": meta["time"],
                    "avgPrice": meta["price"]
                }
                
                # Keep up to 2 clean options per sector
                if len(compiled_db[route_key]) < 2:
                    compiled_db[route_key].append(flight_node)

    # 5. Save the output directly to the Next.js library folder
    os.makedirs('src/lib', exist_ok=True)
    with open('src/lib/flightDatabase.json', 'w', encoding='utf-8') as out:
        json.dump(compiled_db, out, indent=2)
        
    print("Success! Data compiled into src/lib/flightDatabase.json")

if __name__ == '__main__':
    run_extractor()

