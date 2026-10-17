# 👕 AI Outfit Recommendation Web App

🚀 An AI-powered web application that recommends the best clothing styles based on your **photo, age, and gender** — helping users choose outfits that match their **skin tone and appearance**.

---

## 🌟 Features

- 📸 Upload your image for analysis  
- 🧠 AI-powered outfit recommendations  
- 👔 Suggests:
  - Shirts
  - Pants
  - Shoes  
- 🎯 Personalized suggestions based on:
  - Skin tone
  - Age
  - Gender  
- 🔗 Direct product links to shopping platforms  
- ⚡ Fast and simple user interface  

---

## 🧠 How It Works

1. User uploads an image  
2. The system analyzes facial/skin tone features  
3. AI (via **Groq API**) processes the input  
4. Generates outfit recommendations  
5. Displays categorized results with shopping links  

---

## 🛠️ Tech Stack

- **Frontend:** HTML, CSS, JavaScript  
- **Backend:** Python  
- **AI Integration:** Groq API  
- **Version Control:** Git & GitHub  

---

## 📸 Screenshots

> *(Add your screenshots here — very important for recruiters)*  

- Upload Interface  
- Recommendation Results  
- Product Links Section  

---

## 🚀 Installation & Setup

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/your-username/repo-name.git
cd repo-name
2️⃣ Install Dependencies
pip install -r requirements.txt
3️⃣ Run the Application
python app.py
4️⃣ Open in Browser
http://127.0.0.1:5000
# Pic2Style – AI-Powered Personal Fashion Stylist 👗✨

**Pic2Style** is an intelligent fashion recommendation platform that analyzes a portrait photo to determine skin depth and undertone, then curates personalized, occasion-specific outfit recommendations complete with direct shopping links across major e-commerce platforms.

---

## 🚀 Key Features

- **Computer Vision Skin Analysis:** Uses OpenCV face detection to isolate facial skin (cheeks and nose bridge), avoiding background and clothing color bias.
- **Undertone & Contrast Detection:** Calculates both skin depth (Fair, Medium, Wheatish/Olive, Deep) and undertone (Warm, Cool, Neutral).
- **AI Fashion Stylist:** Powered by Groq's high-speed inference (`qwen/qwen3.8-27b`) with strict JSON schema compliance.
- **Dynamic Multi-Store Shopping Engine:** Generates real-time, deep-search shopping links for **Amazon India, Myntra, Ajio, and Flipkart** for each recommended clothing piece.
- **Occasion-Aware Styling:** Filters recommendations for *Casual, College / Campus, Office / Formal, Date Night, Party / Night Out, and Wedding / Festive*.
- **Color Palette & Avoidance Swatches:** Displays visual color chips for flattering tones and flags colors to avoid.

---

## 📁 Project Structure

```
hackathon/
├── pic2style-backend/
│   ├── app.py               # Flask REST API with OpenCV & Groq integration
│   ├── requirements.txt     # Python dependencies
│   ├── .env                 # Environment variables (GROQ_API_KEY)
│   ├── uploads/             # Temporary uploaded images
│   └── env/                 # Virtual environment
│
└── styleai-frontend/
    ├── structure.html       # Modernized semantic HTML5 markup
    ├── Sundar.css           # Luxury styling, marquee animations & responsive layout
    ├── logic.js             # Drag & drop upload, validation, async fetch & UI rendering
    └── photos/              # Fashion assets & model showcases
```

---

## 🛠️ Getting Started

### 1. Start the Flask Backend
Open a terminal in `pic2style-backend`:
```powershell
# Navigate to the backend directory
cd C:\Users\PRIYANSH\Documents\hackathon\pic2style-backend

# Activate the virtual environment
.\env\Scripts\activate

# Run the Flask server
python app.py
```
The server will start on `http://127.0.0.1:5000`.

### 2. Launch the Frontend
Simply open `styleai-frontend/structure.html` in your web browser (or use VS Code Live Server).

---

## 👥 Team
- **Priyansh Chaturvedi**
- **Rishabh Srivastava**
- **Vansh Choudhary**
- **Adarsh Kumar Srivastav**
*(B.Tech 1st Year)*
