import os
from flask import Flask, jsonify
from flask_cors import CORS
from config import Config

# Import Route Blueprints
from routes.analysis_routes import analysis_bp
from routes.duel_routes import duel_bp
from routes.chat_routes import chat_bp
from routes.weather_routes import weather_bp

def create_app():
    """Application factory for StyleAI 2.0 backend."""
    app = Flask(__name__)
    CORS(app)

    # Ensure uploads directory exists
    os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)

    # Register Blueprints
    app.register_blueprint(analysis_bp)
    app.register_blueprint(duel_bp)
    app.register_blueprint(chat_bp)
    app.register_blueprint(weather_bp)

    # Health Check / Home Route
    @app.route("/")
    def home():
        return jsonify({
            "status": "online",
            "service": "StyleAI 2.0 Backend",
            "modules": ["analysis", "duel", "chat", "weather"],
            "groq_connected": bool(Config.GROQ_API_KEY)
        })

    return app

app = create_app()

if __name__ == "__main__":
    print(f"Starting StyleAI 2.0 server with Groq Connected: {bool(Config.GROQ_API_KEY)}")
    app.run(port=5000, debug=True)
