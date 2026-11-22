import re
import json
from groq import Groq
from config import Config

client = Groq(api_key=Config.GROQ_API_KEY) if Config.GROQ_API_KEY else None

def call_groq_json(system_prompt: str, user_prompt: str, temperature: float = 0.7) -> dict:
    """
    Calls Groq using candidate models sequentially with json_object enforcement.
    Cleans markdown formatting and parses JSON safely.
    """
    if not client:
        return None

    for model_name in Config.CANDIDATE_MODELS:
        try:
            completion = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"},
                temperature=temperature,
            )
            ai_response = completion.choices[0].message.content
            cleaned = re.sub(r"^```(?:json)?\s*", "", ai_response.strip())
            cleaned = re.sub(r"\s*```$", "", cleaned)
            return json.loads(cleaned)
        except Exception as err:
            print(f"Error calling model {model_name}: {err}")
            continue

    return None


def call_groq_text(system_prompt: str, user_prompt: str, max_tokens: int = 300) -> str:
    """
    Calls Groq for natural language responses (such as the stylist chatbot).
    """
    if not client:
        return None

    for model_name in Config.CANDIDATE_MODELS:
        try:
            completion = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7,
                max_tokens=max_tokens
            )
            return completion.choices[0].message.content.strip()
        except Exception as e:
            print(f"Chat error with {model_name}: {e}")
            continue

    return None


def get_fallback_outfits(skin_tone: str, undertone: str, occasion: str) -> dict:
    """Rule-based 3-look fallback when AI service is unreachable."""
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
                "name": f"Textured Olive & Amber {occasion}",
                "dress_code": "Smart Casual",
                "color_palette": look2_colors,
                "shirt_details": {"color": "Deep Olive Green", "type": "Heavyweight Cotton Overshirt"},
                "pant_details": {"color": "Espresso Brown", "type": "Straight-Leg Corduroy Trousers"},
                "shoes_details": {"color": "Cognac Brown", "type": "Suede Chelsea Boots"},
                "accessories": {"item": "Antique Brass Minimalist Ring & Watch"},
                "fragrance": {
                    "scent_family": "Warm Spicy & Amber",
                    "notes": "Cardamom, Bourbon, Smoked Cedar",
                    "perfume_name": "Zara Man Gold"
                },
                "styling_tip": "Layer the olive overshirt unbuttoned over a cream or ecru crew-neck tee."
            },
            {
                "id": 3,
                "vibe_label": "Statement Night",
                "name": f"Burgundy Midnight Luxe {occasion}",
                "dress_code": "Statement / Night Out",
                "color_palette": look3_colors,
                "shirt_details": {"color": "Rich Burgundy", "type": "Camp Collar Silk-Blend Shirt"},
                "pant_details": {"color": "Jet Black", "type": "Tailored Cropped Trousers"},
                "shoes_details": {"color": "Polished Black", "type": "Leather Horsebit Loafers"},
                "accessories": {"item": "Gold Chain & Vintage Square Watch"},
                "fragrance": {
                    "scent_family": "Woody Leather & Tobacco",
                    "notes": "Black Pepper, Leather, Dark Vanilla",
                    "perfume_name": "Titan Skinn Steele"
                },
                "styling_tip": "Tuck the shirt cleanly into high-waisted black trousers to create a strong silhouette."
            }
        ]
    else:
        look1_colors = ["#1E3A8A", "#64748B", "#F8FAFC", "#0284C7"]
        look2_colors = ["#334155", "#0F172A", "#E2E8F0", "#38BDF8"]
        look3_colors = ["#000000", "#475569", "#2563EB", "#FFFFFF"]
        avoid_colors = ["Muddy Mustard Yellow", "Dusty Orange"]
        outfits = [
            {
                "id": 1,
                "vibe_label": "Minimalist Everyday",
                "name": f"Crisp Atlantic Cool {occasion}",
                "dress_code": "Casual / Campus",
                "color_palette": look1_colors,
                "shirt_details": {"color": "Ice Blue", "type": "Relaxed Oxford Cotton Shirt"},
                "pant_details": {"color": "Navy Blue", "type": "Pleated Tapered Chinos"},
                "shoes_details": {"color": "Crisp White", "type": "Minimalist Leather Sneakers"},
                "accessories": {"item": "Brushed Steel Minimalist Watch"},
                "fragrance": {
                    "scent_family": "Aromatic Aquatic",
                    "notes": "Sea Salt, Grapefruit, Driftwood",
                    "perfume_name": "Zara Silver"
                },
                "styling_tip": "Leave the top two buttons open and cuff the chinos right at the ankle."
            },
            {
                "id": 2,
                "vibe_label": "Smart Layered",
                "name": f"Slate & Charcoal Layer {occasion}",
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

    return {
        "colors_to_avoid": avoid_colors,
        "why_it_works": f"These structured looks enhance your natural {skin_tone} by using balanced color temperature and tailored silhouettes.",
        "outfits": outfits
    }


def get_fallback_duel(occasion: str, palette_a: list, palette_b: list) -> dict:
    """Rule-based fallback for A/B Fit Duel."""
    return {
        "winner": "Fit A",
        "matchup_title": f"Tailored Modern vs Relaxed {occasion}",
        "fit_a": {
            "title": "Fit A: Tailored Focus",
            "overall_score": 8.8,
            "color_harmony_score": 9.0,
            "occasion_match_score": 8.7,
            "versatility_score": 8.5,
            "summary": f"Strong visual hierarchy and crisp lines tailored for {occasion}.",
            "pros": ["Harmonious contrast with your complexion", "Sharper structural proportions"],
            "cons": ["Footwear choice could be slightly elevated"],
            "palette": palette_a
        },
        "fit_b": {
            "title": "Fit B: Casual Cohesion",
            "overall_score": 8.0,
            "color_harmony_score": 8.2,
            "occasion_match_score": 7.9,
            "versatility_score": 8.0,
            "summary": "Great comfort and approachable color rhythm.",
            "pros": ["Tonal depth in the midtones", "Effortless versatility"],
            "cons": ["Lower contrast between upper and lower pieces"],
            "palette": palette_b
        },
        "stylist_verdict": f"Fit A takes the win for {occasion}! The intentional contrast creates a sharper visual frame that highlights your natural skin tone and gives the outfit greater presence.",
        "quick_upgrades": [
            "Fit A Upgrade: Add a minimalist leather watch to tie the entire look together.",
            "Fit B Upgrade: Add a structured outer layer like a tailored overshirt to balance the silhouette."
        ]
    }
