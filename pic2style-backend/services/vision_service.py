import cv2
import numpy as np

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


def extract_dominant_colors(image_path: str, k: int = 3) -> list:
    """
    Extracts the top-k dominant clothing colors from an outfit photograph,
    automatically segmenting below the face if portrait, or sampling the central torso.
    """
    img = cv2.imdecode(np.fromfile(image_path, dtype=np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        return ["#2D3748", "#E2E8F0", "#4A5568"]

    h, w, _ = img.shape
    cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = cascade.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=4,
        minSize=(int(min(h, w) * 0.08), int(min(h, w) * 0.08))
    )

    if len(faces) > 0:
        fx, fy, fw, fh = sorted(faces, key=lambda f: f[2]*f[3], reverse=True)[0]
        torso_y1 = min(int(fy + fh * 1.2), h - 10)
        torso_y2 = min(int(fy + fh * 3.6), h)
        torso_x1 = max(int(fx - fw * 0.5), 0)
        torso_x2 = min(int(fx + fw * 1.5), w)
        sample = img[torso_y1:torso_y2, torso_x1:torso_x2]
        if sample.size == 0 or sample.shape[0] < 20 or sample.shape[1] < 20:
            sample = img[int(h * 0.25):int(h * 0.85), int(w * 0.15):int(w * 0.85)]
    else:
        sample = img[int(h * 0.20):int(h * 0.85), int(w * 0.15):int(w * 0.85)]

    if sample.size == 0:
        sample = img

    small = cv2.resize(sample, (64, 64), interpolation=cv2.INTER_AREA)
    pixels = small.reshape(-1, 3).astype(np.float32)

    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 15, 0.2)
    _, labels, centers = cv2.kmeans(pixels, k, None, criteria, 5, cv2.KMEANS_RANDOM_CENTERS)

    counts = np.bincount(labels.flatten())
    sorted_indices = np.argsort(counts)[::-1]

    hex_colors = []
    for idx in sorted_indices:
        b, g, r = centers[idx].astype(int)
        hex_colors.append(f"#{r:02x}{g:02x}{b:02x}")

    return hex_colors
