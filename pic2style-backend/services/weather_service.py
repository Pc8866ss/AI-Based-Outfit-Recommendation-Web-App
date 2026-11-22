import time
import json
import urllib.parse
import urllib.request
from config import Config

WEATHER_CACHE = {}

def get_weather_data(city: str = None, lat: float = None, lon: float = None) -> dict:
    """
    Fetches real-time weather from Open-Meteo or wttr.in,
    caches responses, and generates climate-specific fabric and layering rules.
    """
    cache_key = f"{city}_{lat}_{lon}".strip().lower()
    if cache_key in WEATHER_CACHE:
        cached_time, cached_val = WEATHER_CACHE[cache_key]
        if time.time() - cached_time < Config.WEATHER_CACHE_TTL:
            return cached_val

    resolved_city = city or "Current Location"
    target_lat = lat
    target_lon = lon

    # 1. Geocode city if lat/lon not provided
    if (target_lat is None or target_lon is None) and city:
        try:
            geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={urllib.parse.quote(city.strip())}&count=1&language=en&format=json"
            req = urllib.request.Request(geo_url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
            with urllib.request.urlopen(req, timeout=4) as response:
                geo_data = json.loads(response.read().decode('utf-8'))
                if geo_data.get("results") and len(geo_data["results"]) > 0:
                    first = geo_data["results"][0]
                    target_lat = first["latitude"]
                    target_lon = first["longitude"]
                    country = first.get("country", "")
                    resolved_city = f"{first['name']}, {country}" if country else first['name']
        except Exception as e:
            print(f"Geocoding error for '{city}': {e}")

    # Fallback to wttr.in if lat/lon still unknown but city is provided
    if (target_lat is None or target_lon is None) and city:
        try:
            wttr_url = f"https://wttr.in/{urllib.parse.quote(city.strip())}?format=j1"
            req = urllib.request.Request(wttr_url, headers={"User-Agent": "curl/7.68.0"})
            with urllib.request.urlopen(req, timeout=4) as response:
                wttr_data = json.loads(response.read().decode('utf-8'))
                curr = wttr_data['current_condition'][0]
                temp = float(curr.get('temp_C', 24))
                desc = curr.get('weatherDesc', [{}])[0].get('value', 'Pleasant')
                humidity = int(curr.get('humidity', 50))
                area = wttr_data.get('nearest_area', [{}])[0]
                loc_name = area.get('areaName', [{}])[0].get('value', city)
                loc_country = area.get('country', [{}])[0].get('value', '')
                disp_city = f"{loc_name}, {loc_country}" if loc_country else loc_name

                is_rain = any(w in desc.lower() for w in ['rain', 'drizzle', 'shower', 'thunder'])
                if is_rain:
                    icon = "🌧️"
                    fabric = "Rain Alert: Darker bottoms to avoid water marks, water-resistant outer jacket, water-safe footwear (avoid suede!)."
                elif temp >= 32:
                    icon = "☀️"
                    fabric = "High Heat: Pure linen, seersucker, or airy slub cotton. Relaxed fits for ventilation; avoid heavy denim and dark heat-absorbing layers."
                elif temp >= 24:
                    icon = "⛅"
                    fabric = f"Warm & Sunny ({humidity}% humidity): Breathable cotton poplin, light knit polos, and chinos. Clean sneakers or loafers."
                elif temp >= 16:
                    icon = "🌤️"
                    fabric = "Mild & Pleasant: Ideal for smart layering! Overshirts, light denim jackets, or fine-gauge knit cardigans over tees."
                elif temp >= 8:
                    icon = "🧥"
                    fabric = "Chilly Weather: Medium-weight knitwear, flannel overshirts, bomber/harrington jackets, and structured leather boots."
                else:
                    icon = "❄️"
                    fabric = "Cold Winter: Heavyweight wool overcoats, thermal base layers, chunky merino sweaters, and insulated footwear."

                result = {
                    "location": disp_city,
                    "temperature": round(temp, 1),
                    "condition": desc,
                    "humidity": humidity,
                    "icon": icon,
                    "fabric_advice": fabric,
                    "is_raining": is_rain
                }
                WEATHER_CACHE[cache_key] = (time.time(), result)
                return result
        except Exception as e:
            print(f"wttr.in fallback error for '{city}': {e}")
            return None

    if target_lat is None or target_lon is None:
        return None

    # Reverse geocode city name if coords were passed directly
    if resolved_city == "Current Location" and target_lat and target_lon:
        try:
            rev_url = f"https://api.bigdatacloud.net/data/reverse-geocode-client?latitude={target_lat}&longitude={target_lon}"
            req_rev = urllib.request.Request(rev_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req_rev, timeout=3) as r_resp:
                r_json = json.loads(r_resp.read().decode('utf-8'))
                city_name = r_json.get("city") or r_json.get("locality") or r_json.get("principalSubdivision")
                c_name = r_json.get("countryName", "")
                if city_name:
                    resolved_city = f"{city_name}, {c_name}" if c_name else city_name
        except Exception as e:
            print(f"Reverse geocode error: {e}")

    # Query Open-Meteo Forecast
    try:
        weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={target_lat}&longitude={target_lon}&current_weather=true"
        req = urllib.request.Request(weather_url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
        with urllib.request.urlopen(req, timeout=4) as response:
            w_data = json.loads(response.read().decode('utf-8'))
            current = w_data.get("current_weather", {})
            temp = float(current.get("temperature", 24))
            code = int(current.get("weathercode", 0))
            wind = current.get("windspeed", 0)

            WMO_CODES = {
                0: ("Clear Sky", "☀️"),
                1: ("Mainly Clear", "🌤️"),
                2: ("Partly Cloudy", "⛅"),
                3: ("Overcast", "☁️"),
                45: ("Foggy", "🌫️"),
                48: ("Rime Fog", "🌫️"),
                51: ("Light Drizzle", "🌦️"),
                53: ("Moderate Drizzle", "🌦️"),
                55: ("Dense Drizzle", "🌧️"),
                61: ("Slight Rain", "🌧️"),
                63: ("Moderate Rain", "🌧️"),
                65: ("Heavy Rain", "🌧️"),
                71: ("Slight Snow", "❄️"),
                73: ("Moderate Snow", "❄️"),
                75: ("Heavy Snow", "❄️"),
                80: ("Rain Showers", "🌧️"),
                81: ("Heavy Showers", "🌧️"),
                82: ("Violent Showers", "🌧️"),
                95: ("Thunderstorm", "⛈️"),
                96: ("Thunderstorm with Hail", "⛈️"),
                99: ("Heavy Thunderstorm", "⛈️")
            }
            cond_text, icon = WMO_CODES.get(code, ("Pleasant Weather", "🌤️"))
            is_rain = code in [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99]

            if is_rain:
                fabric = "Rain Alert: Darker bottoms to avoid water marks, water-resistant outer jacket, water-safe footwear (avoid suede!)."
            elif temp >= 32:
                fabric = "High Heat: Pure linen, seersucker, or airy slub cotton. Relaxed fits for ventilation; avoid heavy denim and dark heat-absorbing layers."
            elif temp >= 24:
                fabric = "Warm & Sunny: Breathable cotton poplin, light knit polos, and chinos. Clean sneakers or loafers."
            elif temp >= 16:
                fabric = "Mild & Pleasant: Ideal for smart layering! Overshirts, light denim jackets, or fine-gauge knit cardigans over tees."
            elif temp >= 8:
                fabric = "Chilly Weather: Medium-weight knitwear, flannel overshirts, bomber/harrington jackets, and structured leather boots."
            else:
                fabric = "Cold Winter: Heavyweight wool overcoats, thermal base layers, chunky merino sweaters, and insulated footwear."

            result = {
                "location": resolved_city,
                "latitude": target_lat,
                "longitude": target_lon,
                "temperature": round(temp, 1),
                "condition": cond_text,
                "icon": icon,
                "windspeed": wind,
                "fabric_advice": fabric,
                "is_raining": is_rain
            }
            WEATHER_CACHE[cache_key] = (time.time(), result)
            return result
    except Exception as e:
        print(f"Open-Meteo weather fetch error: {e}")
        return None
