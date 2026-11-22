import os
import time
import json
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from config import Config
from services.vision_service import extract_dominant_colors, detect_skin_tone
from services.weather_service import get_weather_data
from services.groq_service import call_groq_json, get_fallback_duel

duel_bp = Blueprint("duel_bp", __name__)

@duel_bp.route("/duel", methods=["POST"])
def duel():
    try:
        if "image_a" not in request.files or "image_b" not in request.files:
            return jsonify({"error": "Please upload both Outfit A and Outfit B images for the duel"}), 400

        file_a = request.files["image_a"]
        file_b = request.files["image_b"]
        gender = request.form.get("gender", "Unspecified")
        occasion = request.form.get("occasion", "Date Night")
        skin_tone = request.form.get("skin_tone", "").strip()
        city = request.form.get("city", "").strip()
        notes_a = request.form.get("notes_a", "").strip()
        notes_b = request.form.get("notes_b", "").strip()

        os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)

        # Save both files
        fn_a = f"duel_a_{int(time.time())}_{secure_filename(file_a.filename)}"
        fn_b = f"duel_b_{int(time.time())}_{secure_filename(file_b.filename)}"
        path_a = os.path.join(Config.UPLOAD_FOLDER, fn_a)
        path_b = os.path.join(Config.UPLOAD_FOLDER, fn_b)
        file_a.save(path_a)
        file_b.save(path_b)

        # Extract dominant color palettes with OpenCV
        palette_a = extract_dominant_colors(path_a, k=3)
        palette_b = extract_dominant_colors(path_b, k=3)

        # Detect skin tone if not provided
        if not skin_tone:
            st_a, _, _, _ = detect_skin_tone(path_a)
            st_b, _, _, _ = detect_skin_tone(path_b)
            skin_tone = st_a if "Medium" not in st_a else st_b

        # Weather context
        weather_info = ""
        if city:
            w_data = get_weather_data(city=city)
            if w_data:
                weather_info = f", Climate: {w_data['temperature']}°C ({w_data['condition']})"

        # Construct Groq Duel Judge Prompt
        system_prompt = "You are a professional fashion judge. Return ONLY valid JSON."
        duel_prompt = f"""
You are an elite celebrity fashion judge, runway critic, and master personal stylist.
Judge this head-to-head OUTFIT DUEL for:
- Occasion: {occasion}
- Gender: {gender}
- User Skin Tone: {skin_tone}{weather_info}

Outfit A:
- Dominant Palette: {', '.join(palette_a)}
- User Description: {notes_a if notes_a else 'Visual outfit composition A'}

Outfit B:
- Dominant Palette: {', '.join(palette_b)}
- User Description: {notes_b if notes_b else 'Visual outfit composition B'}

Evaluate both outfits rigorously based on Color Harmony with skin tone, Silhouette Balance, Occasion Appropriateness, and Visual Punch.

Return ONLY valid JSON matching this exact structure:
{{
  "winner": "Fit A",
  "matchup_title": "Catchy 3-6 word title (e.g. Crisp Minimalist vs Warm Earthy Elegance)",
  "fit_a": {{
    "title": "Creative Title for Fit A",
    "overall_score": 8.7,
    "color_harmony_score": 9.0,
    "occasion_match_score": 8.5,
    "versatility_score": 8.2,
    "summary": "1 concise sentence capturing Fit A's core vibe and execution.",
    "pros": ["Crisp contrast against warm skin tone", "Balanced silhouette line"],
    "cons": ["Could use subtle textural contrast"],
    "palette": {json.dumps(palette_a)}
  }},
  "fit_b": {{
    "title": "Creative Title for Fit B",
    "overall_score": 7.9,
    "color_harmony_score": 8.0,
    "occasion_match_score": 7.8,
    "versatility_score": 8.0,
    "summary": "1 concise sentence capturing Fit B's core vibe and execution.",
    "pros": ["Warm tonal cohesion", "Approachable relaxed mood"],
    "cons": ["Lacks high-contrast anchor in dim evening lighting"],
    "palette": {json.dumps(palette_b)}
  }},
  "stylist_verdict": "Detailed editorial-level explanation of why the winner was chosen over the runner-up based on color theory and occasion fit.",
  "quick_upgrades": [
    "Fit A Polish: Specific actionable styling tip (e.g., roll cuffs once, add a cognac belt)",
    "Fit B Polish: Specific actionable styling tip (e.g., layer an overshirt to add structure)"
  ]
}}
"""

        duel_result = call_groq_json(system_prompt, duel_prompt, temperature=0.6)

        # Fallback if API offline
        if not duel_result or "winner" not in duel_result:
            duel_result = get_fallback_duel(occasion, palette_a, palette_b)

        return jsonify(duel_result)

    except Exception as e:
        print("ERROR in /duel:", e)
        return jsonify({"error": str(e)}), 500
