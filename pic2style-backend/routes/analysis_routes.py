import os
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from config import Config
from services.vision_service import detect_skin_tone
from services.weather_service import get_weather_data
from services.shopping_service import build_shopping_links
from services.groq_service import call_groq_json, get_fallback_outfits

analysis_bp = Blueprint("analysis_bp", __name__)

@analysis_bp.route("/analyze", methods=["POST"])
def analyze():
    try:
        if "image" not in request.files:
            return jsonify({"error": "No image uploaded"}), 400

        image = request.files["image"]
        gender = request.form.get("gender", "Unspecified")
        age = request.form.get("age", "20")
        occasion = request.form.get("occasion", "Casual / Everyday")
        city = request.form.get("city", "").strip()
        lat = request.form.get("latitude")
        lon = request.form.get("longitude")

        lat_val, lon_val = None, None
        try:
            if lat and lon:
                lat_val = float(lat)
                lon_val = float(lon)
        except ValueError:
            lat_val, lon_val = None, None

        weather_data = None
        if city or (lat_val is not None and lon_val is not None):
            weather_data = get_weather_data(city=city if city else None, lat=lat_val, lon=lon_val)
            if weather_data:
                print(f"Weather context applied: {weather_data['location']}, {weather_data['temperature']}°C, {weather_data['condition']}")

        os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
        filename = secure_filename(image.filename)
        filepath = os.path.join(Config.UPLOAD_FOLDER, filename)
        image.save(filepath)

        print("Image saved:", filepath)

        # Detect skin tone using OpenCV
        skin_tone, rgb, undertone, hex_color = detect_skin_tone(filepath)
        print(f"Skin tone: {skin_tone}, RGB: {rgb}, Hex: {hex_color}")

        # ----------------------------
        # AI Prompt: 3 Curated Looks + Fragrance + Weather Intelligence
        # ----------------------------
        weather_prompt_section = ""
        if weather_data:
            weather_prompt_section = f"""
- Real-Time Local Weather: {weather_data['temperature']}°C, {weather_data['condition']} in {weather_data['location']}
- Climate Styling & Fabric Directive: {weather_data['fabric_advice']}. Select fabrics (e.g. breathable linen/cotton vs warm knitwear/jackets), sleeve cuts, and footwear (rain-safe vs suede/canvas) specifically suited to this climate!"""

        system_prompt = "You are a professional fashion stylist and perfumer. You always respond in valid JSON format."
        prompt = f"""
You are a premier celebrity fashion stylist, color theory master, and perfumer.
Recommend a curated 3-LOOK COLLECTION tailored for:
- Skin Tone & Undertone: {skin_tone}
- Gender: {gender}
- Age: {age}
- Occasion: {occasion}{weather_prompt_section}

Return ONLY valid JSON matching this exact structure:
{{
  "colors_to_avoid": ["Color 1 to avoid", "Color 2 to avoid"],
  "why_it_works": "Deep color-theory and silhouette explanation of how these palettes and cuts flatter this specific skin depth and undertone.",
  "outfits": [
    {{
      "id": 1,
      "vibe_label": "Minimalist Everyday",
      "name": "Look 1 Title (e.g. Clean Linen Essential)",
      "dress_code": "Casual / Smart Casual",
      "color_palette": ["#Hex1", "#Hex2", "#Hex3", "#Hex4"],
      "shirt_details": {{
        "color": "Descriptive color name (NOT hex)",
        "type": "Specific topwear type (e.g. Relaxed Linen Shirt)"
      }},
      "pant_details": {{
        "color": "Descriptive color name (NOT hex)",
        "type": "Specific bottomwear type (e.g. Pleated Tapered Chinos)"
      }},
      "shoes_details": {{
        "color": "Descriptive color name (NOT hex)",
        "type": "Specific footwear type (e.g. Minimalist Leather Sneakers)"
      }},
      "accessories": {{
        "item": "Watch or glasses (e.g. Tan Leather Minimalist Watch)"
      }},
      "fragrance": {{
        "scent_family": "e.g. Fresh Citrus & Aquatic",
        "notes": "e.g. Bergamot, Sea Salt, Vetiver",
        "perfume_name": "e.g. Titan Skinn Raw / Zara Silver"
      }},
      "styling_tip": "Fit, roll, or tuck advice"
    }},
    {{
      "id": 2,
      "vibe_label": "Smart Layered",
      "name": "Look 2 Title (e.g. Textured Overshirt Elevation)",
      "dress_code": "Smart Casual / Elevated",
      "color_palette": ["#Hex1", "#Hex2", "#Hex3", "#Hex4"],
      "shirt_details": {{
        "color": "Descriptive color name (NOT hex)",
        "type": "Layered topwear type (e.g. Knit Polo with Overshirt)"
      }},
      "pant_details": {{
        "color": "Descriptive color name (NOT hex)",
        "type": "Specific bottomwear type (e.g. Tailored Wool Trousers)"
      }},
      "shoes_details": {{
        "color": "Descriptive color name (NOT hex)",
        "type": "Specific footwear type (e.g. Suede Penny Loafers)"
      }},
      "accessories": {{
        "item": "Statement watch or belt (e.g. Matte Silver Chronograph)"
      }},
      "fragrance": {{
        "scent_family": "e.g. Warm Spicy & Amber",
        "notes": "e.g. Cardamom, Cedarwood, Warm Amber",
        "perfume_name": "e.g. Zara Man Gold / Bella Vita CEO"
      }},
      "styling_tip": "Layering and silhouette balance advice"
    }},
    {{
      "id": 3,
      "vibe_label": "Statement Night",
      "name": "Look 3 Title (e.g. Monochromatic Midnight Luxe)",
      "dress_code": "Statement / Evening",
      "color_palette": ["#Hex1", "#Hex2", "#Hex3", "#Hex4"],
      "shirt_details": {{
        "color": "Descriptive color name (NOT hex)",
        "type": "Statement topwear type (e.g. Silk Blend Textured Shirt)"
      }},
      "pant_details": {{
        "color": "Descriptive color name (NOT hex)",
        "type": "Sharp bottomwear type (e.g. Slim Cropped Dark Chinos)"
      }},
      "shoes_details": {{
        "color": "Descriptive color name (NOT hex)",
        "type": "Evening footwear type (e.g. Chelsea Boots or Sleek Derbies)"
      }},
      "accessories": {{
        "item": "Jewelry, watch, or shades (e.g. Minimalist Chain & Leather Band Watch)"
      }},
      "fragrance": {{
        "scent_family": "e.g. Woody Leather & Vanilla",
        "notes": "e.g. Black Pepper, Leather, Bourbon Vanilla",
        "perfume_name": "e.g. Titan Skinn Steele / Zara Tobacco"
      }},
      "styling_tip": "High-contrast evening styling tip"
    }}
  ]
}}
"""

        recommendations = call_groq_json(system_prompt, prompt, temperature=0.7)

        # Intelligent 3-Look Fallback if offline
        if not recommendations or "outfits" not in recommendations or not recommendations["outfits"]:
            print("Using rule-based 3-look fallback.")
            recommendations = get_fallback_outfits(skin_tone, undertone, occasion)

        # ----------------------------
        # Attach Dynamic Shopping Links to Every Look
        # ----------------------------
        outfit_list = recommendations.get("outfits", [])
        for out in outfit_list:
            shirt_str = f"{out.get('shirt_details', {}).get('color', '')} {out.get('shirt_details', {}).get('type', 'shirt')}"
            pant_str = f"{out.get('pant_details', {}).get('color', '')} {out.get('pant_details', {}).get('type', 'pants')}"
            shoes_str = f"{out.get('shoes_details', {}).get('color', '')} {out.get('shoes_details', {}).get('type', 'shoes')}"
            acc_str = out.get('accessories', {}).get('item', 'fashion watch')
            perfume_str = f"{gender} {out.get('fragrance', {}).get('perfume_name', 'perfume')}"

            out["shopping_links"] = {
                "shirt": build_shopping_links(shirt_str, gender),
                "pants": build_shopping_links(pant_str, gender),
                "shoes": build_shopping_links(shoes_str, gender),
                "accessories": build_shopping_links(acc_str, gender),
                "fragrance": build_shopping_links(perfume_str, "Perfume")
            }

        # Backwards compatibility: populate top-level fields with Look 1
        if outfit_list:
            first = outfit_list[0]
            recommendations["suggested_outfit"] = first.get("name", "Curated Look")
            recommendations["dress_codes"] = [first.get("dress_code", "Smart Casual")]
            recommendations["color_palette"] = first.get("color_palette", [])
            recommendations["shirt_details"] = first.get("shirt_details", {})
            recommendations["pant_details"] = first.get("pant_details", {})
            recommendations["shoes_details"] = first.get("shoes_details", {})
            recommendations["accessories"] = first.get("accessories", {})
            recommendations["fragrance"] = first.get("fragrance", {})
            recommendations["styling_tip"] = first.get("styling_tip", "")
            recommendations["shopping_links"] = first.get("shopping_links", {})

        return jsonify({
            "skin_tone": skin_tone,
            "rgb": rgb,
            "hex_color": hex_color,
            "undertone": undertone,
            "recommendations": recommendations,
            "weather": weather_data
        })

    except Exception as e:
        print("ERROR in /analyze:", e)
        return jsonify({"error": str(e)}), 500
