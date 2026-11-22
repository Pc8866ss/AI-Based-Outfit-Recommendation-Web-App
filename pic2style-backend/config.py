import os
from dotenv import load_dotenv

# Load .env reliably from the backend directory
_backend_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv()
if not os.getenv("GROQ_API_KEY"):
    load_dotenv(os.path.join(_backend_dir, ".env"))
if not os.getenv("GROQ_API_KEY") and os.path.exists(os.path.join(_backend_dir, "env", ".env")):
    load_dotenv(os.path.join(_backend_dir, "env", ".env"))

class Config:
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    UPLOAD_FOLDER = os.path.join(_backend_dir, "uploads")
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max upload
    CANDIDATE_MODELS = [
        "qwen/qwen3.8-27b",
        "openai/gpt-oss-20b",
        "allam-2-7b"
    ]
    WEATHER_CACHE_TTL = 3600  # 1 hour
