document.addEventListener("DOMContentLoaded", () => {

  // =========================
  // ELEMENTS
  // =========================
  const form = document.getElementById("upload-form");
  const fileInput = document.getElementById("file-input");
  const dropZone = document.getElementById("drop-zone");
  const genderSelect = document.getElementById("gender-select");
  const loading = document.getElementById("loading");
  const resultsDiv = document.getElementById("results");
  const recommendations = document.getElementById("recommendations");
  const skinToneSpan = document.getElementById("skin-tone");
  const rgbSpan = document.getElementById("rgb");
  const tryAgainBtn = document.getElementById("try-again");
  const dropContent = dropZone.querySelector(".drop-content");

  // =========================
  // CONFIG
  // =========================
  const BACKEND_URL = "http://127.0.0.1:5000/analyze";
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

  // =========================
  // PREVENT DEFAULT DRAG
  // =========================
  ["dragenter", "dragover", "dragleave", "drop"].forEach(event => {
    document.addEventListener(event, e => {
      e.preventDefault();
      e.stopPropagation();
    });
  });

  // =========================
  // HELPERS
  // =========================
  function validateFile(file) {
    if (!file) return "No file selected";
    if (!ALLOWED_TYPES.includes(file.type))
      return "Invalid file type. JPG, PNG, GIF, WebP only.";
    if (file.size > MAX_FILE_SIZE)
      return "File too large. Max 10MB.";
    return null;
  }

  function previewImage(file) {
    const reader = new FileReader();
    reader.onload = () => {
      dropContent.innerHTML = `
        <img src="${reader.result}"
             style="max-width:200px; max-height:200px; border-radius:10px; margin-bottom:10px;">
        <p>${file.name}</p>
      `;
    };
    reader.readAsDataURL(file);
  }

  function resetDropZone() {
    dropContent.innerHTML = `
      <i class="fas fa-cloud-upload-alt fa-3x"></i>
      <p>
        Drag & drop your photo here<br>
        or <span class="highlight">click to browse</span>
      </p>
      <small>Supported: JPG, PNG, WebP (max 10MB)</small>
    `;
  }

  // =========================
  // CLICK DROP ZONE
  // =========================
  dropZone.addEventListener("click", () => {
    fileInput.click();
  });

  // =========================
  // DRAG EVENTS
  // =========================
  dropZone.addEventListener("dragover", () => {
    dropZone.classList.add("dragover");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });

  dropZone.addEventListener("drop", (e) => {
    dropZone.classList.remove("dragover");

    const file = e.dataTransfer.files[0];
    const error = validateFile(file);

    if (error) {
      alert(error);
      return;
    }

    fileInput.files = e.dataTransfer.files;
    previewImage(file);
  });

  // =========================
  // FILE INPUT CHANGE
  // =========================
  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    const error = validateFile(file);

    if (error) {
      alert(error);
      fileInput.value = "";
      return;
    }

    previewImage(file);
  });

  // =========================
  // FORM SUBMIT
  // =========================
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!fileInput.files.length) {
      alert("Please upload an image.");
      return;
    }

    loading.style.display = "block";
    resultsDiv.style.display = "none";

    try {

      const formData = new FormData(form);

      const response = await fetch(BACKEND_URL, {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        throw new Error("Server error");
      }

      const data = await response.json();
      document.getElementById("results").style.display = "block";

      document.getElementById("skin-tone").innerText = data.skin_tone;
      document.getElementById("rgb").innerText = data.rgb.join(", ");
      
      document.getElementById("outfit").innerText =
      data.recommendations.suggested_outfit;
      
      document.getElementById("dress-codes").innerText =
      data.recommendations.dress_codes.join(", ");
      
      document.getElementById("shirt").innerText =
      data.recommendations.shirt_details.color + " " +
      data.recommendations.shirt_details.type;
      
      document.getElementById("pants").innerText =
      data.recommendations.pant_details.color + " " +
      data.recommendations.pant_details.type;
      
      document.getElementById("shoes").innerText =
      data.recommendations.shoes_details.color + " " +
      data.recommendations.shoes_details.type;
      
      document.getElementById("why").innerText =
      data.recommendations.why_it_works;

      // =========================
      // DISPLAY RESULTS
      // =========================
      skinToneSpan.textContent = data.skin_tone;
      rgbSpan.textContent = data.rgb.join(", ");

      const rec = data.recommendations;

      recommendations.innerHTML = `
        <div class="recommendation-card">
          <h3>Suggested Outfit</h3>
          <p>${rec.suggested_outfit}</p>
        </div>

        <div class="recommendation-card">
          <h3>Dress Codes</h3>
          <ul>
            ${rec.dress_codes.map(d => `<li>${d}</li>`).join("")}
          </ul>
        </div>

        <div class="recommendation-card">
          <h3>Shirt</h3>
          <p>${rec.shirt_details.color} • ${rec.shirt_details.type}</p>
          <a href="${rec.shopping_links.shirt}" target="_blank">Buy</a>
        </div>

        <div class="recommendation-card">
          <h3>Pants</h3>
          <p>${rec.pant_details.color} • ${rec.pant_details.type}</p>
          <a href="${rec.shopping_links.pants}" target="_blank">Buy</a>
        </div>

        <div class="recommendation-card">
          <h3>Shoes</h3>
          <p>${rec.shoes_details.color} • ${rec.shoes_details.type}</p>
          <a href="${rec.shopping_links.shoes}" target="_blank">Buy</a>
        </div>

        <div class="recommendation-card full-width">
          <h3>Why It Works</h3>
          <p>${rec.why_it_works}</p>
        </div>
      `;

      resultsDiv.style.display = "block";
      resultsDiv.scrollIntoView({ behavior: "smooth" });

    } catch (err) {
      console.error(err);
      alert("Error analyzing image.");
    } finally {
      loading.style.display = "none";
    }
  });

  // =========================
  // TRY AGAIN BUTTON
  // =========================
  tryAgainBtn.addEventListener("click", () => {
    form.reset();
    genderSelect.value = "";
    fileInput.value = "";
    resetDropZone();
    resultsDiv.style.display = "none";
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

});