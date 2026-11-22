import re
import urllib.parse

def build_shopping_links(item_name: str, gender: str = "") -> dict:
    """
    Builds direct, functional search URLs across major Indian e-commerce platforms
    (Amazon India, Myntra, Ajio, Flipkart) without raw hex codes.
    """
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
