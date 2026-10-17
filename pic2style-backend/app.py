import os
import re
import json
import urllib.parse
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import numpy as np
import cv2
from groq import Groq
from werkzeug.utils import secure_filename

# ----------------------------
# Load environment variables
# ----------------------------
load_dotenv()
if not os.getenv("GROQ_API_KEY") and os.path.exists(os.path.join("env", ".env")):
    load_dotenv(os.path.join("env", ".env"))

groq_api_key = os.getenv("GROQ_API_KEY")
print("Groq API Key detected:", bool(groq_api_key))

# ----------------------------
# Initialize Flask
# ----------------------------
app = Flask(__name__)
CORS(app)

# ----------------------------
# Configure upload folder
# ----------------------------
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ----------------------------
# Initialize Groq client
# ----------------------------
client = Groq(api_key=groq_api_key) if groq_api_key else None


# ----------------------------
# Helper: Dynamic Shopping Links Generator
# ----------------------------
def build_shopping_links(item_name: str, gender: str = "") -> dict:
    """Builds direct, functional search links across major e-commerce platforms."""
    clean_item = re.sub(r'#[a-fA-F0-9]{3,6}', '', item_name).strip()
    clean_item = re.sub(r'\s+', ' ', clean_item)
    query = f"{gender} {clean_item}".strip()
    encoded_query = urllib.parse.quote_plus(query)
    clean_dash = re.sub(r'[^a-zA-Z0-9\s-]', '', query).strip().replace(" ", "-").lower()
    clean_dash = re.sub(r'-+', '-', clean_dash)
    encoded_dash = urllib.parse.quote(clean_dash)

    return {
        "amazon": f"https://www.amazon.in/s?k={encoded_query}",
        "myntra": f"https://www.myntra.com/{encoded_dash}",
        "ajio": f"https://www.ajio.com/search/?text={encoded_query}",
        "flipkart": f"https://www.flipkart.com/search?q={encoded_query}"
    }


# ----------------------------
# Helper: Advanced OpenCV Skin Tone & Undertone Detection
# ----------------------------
def detect_skin_tone(image_path: str):
    """
    Detects face bounding box, samples forehead/cheeks to exclude background, hair, and clothing,
    and calculates both skin depth (Fair, Medium, etc.) and undertone (Warm, Cool, Neutral).
    """
    img = cv2.imdecode(np.fromfile(image_path, dtype=np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        return "Medium (Warm Undertone)", [175, 140, 115], "Warm", "#AF8C73"

    h, w, _ = img.shape
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

    faces = cascade.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=4,
        minSize=(int(min(h, w) * 0.08), int(min(h, w) * 0.08))
    )

    if len(faces) > 0:
        faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
        fx, fy, fw, fh = faces[0]
        sy1 = int(fy + fh * 0.35)
        sy2 = int(fy + fh * 0.65)
        sx1 = int(fx + fw * 0.30)
        sx2 = int(fx + fw * 0.70)
        sample = img[sy1:sy2, sx1:sx2]
    else:
        sample = img[int(h * 0.25):int(h * 0.55), int(w * 0.30):int(w * 0.70)]

    if sample.size == 0:
        sample = img

    sample_rgb = cv2.cvtColor(sample, cv2.COLOR_BGR2RGB)
    r, g, b = [int(val) for val in sample_rgb.mean(axis=(0, 1))]
    hex_color = f"#{r:02x}{g:02x}{b:02x}"

    luminance = 0.299 * r + 0.587 * g + 0.114 * b

    if luminance > 185:
        depth = "Fair"
    elif luminance > 145:
        depth = "Medium-Fair"
    elif luminance > 110:
        depth = "Wheatish / Olive"
    elif luminance > 80:
        depth = "Medium-Tan"
    else:
        depth = "Deep / Dark"

    rb_diff = r - b
    gb_diff = g - b

    if rb_diff > 30 and gb_diff > 10:
        undertone = "Warm"
    elif rb_diff < 18:
        undertone = "Cool"
    else:
        undertone = "Neutral"

    full_tone = f"{depth} ({undertone} Undertone)"
    return full_tone, [r, g, b], undertone, hex_color


# ----------------------------
# Home Route
# ----------------------------
@app.route("/")
def home():
    return "StyleAI 2.0 backend is running successfully!"


# ----------------------------
# Analyze Route
# ----------------------------
@app.route("/analyze", methods=["POST"])
def analyze():
    try:
        if "image" not in request.files:
            return jsonify({"error": "No image uploaded"}), 400

        image = request.files["image"]
        gender = request.form.get("gender", "Unspecified")
        age = request.form.get("age", "20")
        occasion = request.form.get("occasion", "Casual / Everyday")

        filename = secure_filename(image.filename)
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        image.save(filepath)

        print("Image saved:", filepath)

        # Detect skin tone using OpenCV
        skin_tone, rgb, undertone, hex_color = detect_skin_tone(filepath)
        print(f"Skin tone: {skin_tone}, RGB: {rgb}, Hex: {hex_color}")

        # ----------------------------
        # AI Prompt: 3 Curated Looks + Fragrance
        # ----------------------------
        prompt = f"""
You are a premier celebrity fashion stylist, color theory master, and perfumer.
Recommend a curated 3-LOOK COLLECTION tailored for:
- Skin Tone & Undertone: {skin_tone}
- Gender: {gender}
- Age: {age}
- Occasion: {occasion}

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

        recommendations = None

        if client:
            candidate_models = ["qwen/qwen3.8-27b", "openai/gpt-oss-20b", "allam-2-7b"]
            for model_name in candidate_models:
                try:
                    completion = client.chat.completions.create(
                        model=model_name,
                        messages=[
                            {"role": "system", "content": "You are a professional fashion stylist and perfumer. You always respond in valid JSON format."},
                            {"role": "user", "content": prompt}
                        ],
                        response_format={"type": "json_object"},
                        temperature=0.7,
                    )
                    ai_response = completion.choices[0].message.content
                    print(f"Groq ({model_name}) Raw response received:", ai_response[:150])

                    cleaned = re.sub(r"^```(?:json)?\s*", "", ai_response.strip())
                    cleaned = re.sub(r"\s*```$", "", cleaned)
                    recommendations = json.loads(cleaned)
                    break
                except Exception as model_err:
                    print(f"Error calling model {model_name}: {model_err}")
                    continue

        # Intelligent 3-Look Fallback if offline
        if not recommendations or "outfits" not in recommendations or not recommendations["outfits"]:
            print("Using rule-based 3-look fallback.")
            if undertone == "Warm":
                look1_colors = ["#78350F", "#D97706", "#065F46", "#FDE68A"]
                look2_colors = ["#B45309", "#451A03", "#FEF3C7", "#1E293B"]
                look3_colors = ["#991B1B", "#18181B", "#F59E0B", "#F4F4F5"]
                avoid_colors = ["Icy Pastel Blue", "Silver / Cool Ash Gray"]
                outfits = [
                    {
                        "id": 1,
                        "vibe_label": "Minimalist Everyday",
                        "name": f"Relaxed Warm Earth {occasion}",
                        "dress_code": "Casual / Campus",
                        "color_palette": look1_colors,
                        "shirt_details": {"color": "Terracotta Rust", "type": "Textured Linen-Cotton Shirt"},
                        "pant_details": {"color": "Warm Sand Beige", "type": "Relaxed Tapered Chinos"},
                        "shoes_details": {"color": "Clean White", "type": "Minimalist Leather Court Sneakers"},
                        "accessories": {"item": "Tan Leather Strap Watch"},
                        "fragrance": {
                            "scent_family": "Fresh Citrus & Aquatic",
                            "notes": "Bergamot, Marine Accord, Cedarwood",
                            "perfume_name": "Titan Skinn Raw"
                        },
                        "styling_tip": "Keep the collar relaxed with sleeves rolled up twice."
                    },
                    {
                        "id": 2,
                        "vibe_label": "Smart Layered",
                        "name": f"Structured Smart {occasion}",
                        "dress_code": "Smart Casual",
                        "color_palette": look2_colors,
                        "shirt_details": {"color": "Olive Green", "type": "Cotton Overshirt over Cream Tee"},
                        "pant_details": {"color": "Charcoal Black", "type": "Pleated Straight-fit Trousers"},
                        "shoes_details": {"color": "Rich Dark Brown", "type": "Suede Penny Loafers"},
                        "accessories": {"item": "Minimalist Silver Chronograph Watch"},
                        "fragrance": {
                            "scent_family": "Warm Spicy & Amber",
                            "notes": "Cardamom, Nutmeg, Warm Amber",
                            "perfume_name": "Zara Man Gold"
                        },
                        "styling_tip": "Keep the overshirt unbuttoned for vertical slimming proportions."
                    },
                    {
                        "id": 3,
                        "vibe_label": "Statement Night",
                        "name": f"Monochrome Statement {occasion}",
                        "dress_code": "Evening / Statement",
                        "color_palette": look3_colors,
                        "shirt_details": {"color": "Deep Burgundy", "type": "Silk-Blend Knitted Polo"},
                        "pant_details": {"color": "Midnight Black", "type": "Tailored Ankle-Length Chinos"},
                        "shoes_details": {"color": "Polished Black", "type": "Leather Chelsea Boots"},
                        "accessories": {"item": "Matte Black Watch & Metal Frame Glasses"},
                        "fragrance": {
                            "scent_family": "Woody Leather & Bourbon Vanilla",
                            "notes": "Black Pepper, Tobacco Leaf, Vanilla",
                            "perfume_name": "Bella Vita CEO Man"
                        },
                        "styling_tip": "Pair the knit polo with ankle-length dark trousers for sharp contrast."
                    }
                ]
            else:
                look1_colors = ["#1E3A8A", "#3B82F6", "#0F172A", "#F8FAFC"]
                look2_colors = ["#4338CA", "#1E1B4B", "#64748B", "#E2E8F0"]
                look3_colors = ["#0284C7", "#09090B", "#94A3B8", "#FFFFFF"]
                avoid_colors = ["Mustard Yellow", "Muddy Rust Orange"]
                outfits = [
                    {
                        "id": 1,
                        "vibe_label": "Minimalist Everyday",
                        "name": f"Crisp Cool Minimalist {occasion}",
                        "dress_code": "Casual / Everyday",
                        "color_palette": look1_colors,
                        "shirt_details": {"color": "Navy Blue", "type": "Oxford Cotton Button-Down"},
                        "pant_details": {"color": "Heather Gray", "type": "Tapered Chino Pants"},
                        "shoes_details": {"color": "Crisp White", "type": "Classic Leather Sneakers"},
                        "accessories": {"item": "Silver Mesh Strap Watch"},
                        "fragrance": {
                            "scent_family": "Crisp Aromatic & Marine",
                            "notes": "Grapefruit, Mint, Ambroxan",
                            "perfume_name": "Zara Silver"
                        },
                        "styling_tip": "Button all the way except top button for a clean European cut."
                    },
                    {
                        "id": 2,
                        "vibe_label": "Smart Layered",
                        "name": f"Refined Indigo Layer {occasion}",
                        "dress_code": "Smart Casual",
                        "color_palette": look2_colors,
                        "shirt_details": {"color": "Slate Blue", "type": "Fine-Gauge Knit Sweater"},
                        "pant_details": {"color": "Charcoal Trousers", "type": "Slim Stretch Chinos"},
                        "shoes_details": {"color": "Burnished Tan", "type": "Leather Brogues"},
                        "accessories": {"item": "Navy Minimalist Dial Watch"},
                        "fragrance": {
                            "scent_family": "Aromatic Woody",
                            "notes": "Lavender, Sage, Tonka Bean",
                            "perfume_name": "Titan Skinn Verge"
                        },
                        "styling_tip": "Layer the knit sweater over a clean white crew collar."
                    },
                    {
                        "id": 3,
                        "vibe_label": "Statement Night",
                        "name": f"Electric Night Contrast {occasion}",
                        "dress_code": "Statement / Night Out",
                        "color_palette": look3_colors,
                        "shirt_details": {"color": "Cobalt Blue", "type": "Fitted Camp Collar Shirt"},
                        "pant_details": {"color": "Jet Black", "type": "Pleated Dress Trousers"},
                        "shoes_details": {"color": "Gloss Black", "type": "Monk Strap Leather Shoes"},
                        "accessories": {"item": "Silver Cuff & Minimalist Watch"},
                        "fragrance": {
                            "scent_family": "Oriental Woody",
                            "notes": "Incense, Tonka, Smoked Oud",
                            "perfume_name": "Titan Skinn Steele"
                        },
                        "styling_tip": "Tuck the camp collar shirt into high-waisted black pleated trousers."
                    }
                ]

            recommendations = {
                "colors_to_avoid": avoid_colors,
                "why_it_works": f"These structured looks enhance your natural {skin_tone} by using balanced color temperature and tailored silhouettes.",
                "outfits": outfits
            }

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
            "recommendations": recommendations
        })

    except Exception as e:
        print("ERROR in /analyze:", e)
        return jsonify({"error": str(e)}), 500


# ----------------------------
# Run Server
# ----------------------------
if __name__ == "__main__":
    app.run(port=5000, debug=True)