import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from PIL import Image
import numpy as np
from groq import Groq
from werkzeug.utils import secure_filename

# ----------------------------
# Load environment variables
# ----------------------------
load_dotenv()

print("Groq API Key:", os.getenv("GROQ_API_KEY"))

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
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# ----------------------------
# Helper: Detect Average RGB
# ----------------------------
def detect_skin_tone(image_path):
    img = Image.open(image_path).convert("RGB")
    img = img.resize((100, 100))
    pixels = np.array(img)

    avg_color = pixels.mean(axis=(0, 1))
    r, g, b = map(int, avg_color)

    if r > 200 and g > 170:
        tone = "Fair"
    elif r > 150:
        tone = "Medium"
    elif r > 100:
        tone = "Wheatish"
    else:
        tone = "Dark"

    return tone, [r, g, b]


# ----------------------------
# Home Route
# ----------------------------
@app.route("/")
def home():
    return "Flask server is running successfully"


# ----------------------------
# Analyze Route
# ----------------------------
@app.route("/analyze", methods=["POST"])
def analyze():

    try:
        if "image" not in request.files:
            return jsonify({"error": "No image uploaded"}), 400

        image = request.files["image"]
        gender = request.form.get("gender", "Unknown")
        age = request.form.get("age", "Unknown")

        filename = secure_filename(image.filename)
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        image.save(filepath)

        print("Image saved:", filepath)

        # Detect skin tone
        skin_tone, rgb = detect_skin_tone(filepath)

        # ----------------------------
        # Groq Prompt
        # ----------------------------
        prompt = f"""
        A person with:
        Skin tone: {skin_tone}
        Gender: {gender}
        Age: {age}

        Generate fashion recommendations in JSON format ONLY:

        {{
          "suggested_outfit": "",
          "dress_codes": [],
          "shirt_details": {{
            "color": "",
            "type": ""
          }},
          "pant_details": {{
            "color": "",
            "type": ""
          }},
          "shoes_details": {{
            "color": "",
            "type": ""
          }},
          "shopping_links": {{
            "shirt": "https://amazon.in",
            "pants": "https://myntra.com",
            "shoes": "https://zara.com"
          }},
          "why_it_works": ""
        }}
        """

        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
        )

        ai_response = completion.choices[0].message.content

        print("RAW AI RESPONSE:", ai_response)

        # ----------------------------
        # Safe JSON parsing
        # ----------------------------
        try:
            recommendations = json.loads(ai_response)
        except Exception:
            print("AI response not valid JSON. Using fallback.")
            recommendations = {
                "suggested_outfit": "Smart Casual Look",
                "dress_codes": ["Casual", "Smart Casual"],
                "shirt_details": {"color": "Navy Blue", "type": "Cotton Shirt"},
                "pant_details": {"color": "Beige", "type": "Chinos"},
                "shoes_details": {"color": "Brown", "type": "Loafers"},
                "shopping_links": {
                    "shirt": "https://amazon.in",
                    "pants": "https://myntra.com",
                    "shoes": "https://zara.com"
                },
                "why_it_works": "These colors complement the detected skin tone well."
            }

        return jsonify({
            "skin_tone": skin_tone,
            "rgb": rgb,
            "recommendations": recommendations
        })

    except Exception as e:
        print("ERROR:", e)
        return jsonify({"error": str(e)}), 500


# ----------------------------
# Run Server
# ----------------------------
if __name__ == "__main__":
    app.run(port=5000, debug=True)