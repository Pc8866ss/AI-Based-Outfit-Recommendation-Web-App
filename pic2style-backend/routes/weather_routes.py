from flask import Blueprint, request, jsonify
from services.weather_service import get_weather_data

weather_bp = Blueprint("weather_bp", __name__)

@weather_bp.route("/weather", methods=["GET"])
def weather():
    city = request.args.get("city", "").strip()
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    lat_val, lon_val = None, None
    try:
        if lat and lon:
            lat_val = float(lat)
            lon_val = float(lon)
    except ValueError:
        lat_val, lon_val = None, None

    if not city and (lat_val is None or lon_val is None):
        return jsonify({"error": "Please provide a city name or latitude/longitude"}), 400

    data = get_weather_data(city=city if city else None, lat=lat_val, lon=lon_val)
    if data:
        return jsonify(data)
    return jsonify({"error": "Unable to fetch real-time weather"}), 404
