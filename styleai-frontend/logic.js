document.addEventListener("DOMContentLoaded", () => {

  // =========================
  // DOM ELEMENTS
  // =========================
  const form = document.getElementById("upload-form");
  const fileInput = document.getElementById("file-input");
  const dropZone = document.getElementById("drop-zone");
  const previewImg = document.getElementById("preview");
  const previewText = document.getElementById("preview-text");
  const dropContent = dropZone.querySelector(".drop-content");
  const genderSelect = document.getElementById("gender-select");
  const occasionSelect = document.getElementById("occasion-select");
  const ageRange = document.getElementById("ageRange");
  const ageValue = document.getElementById("ageValue");

  const loading = document.getElementById("loading");
  const resultsDiv = document.getElementById("results");

  // Results elements
  const skinToneSpan = document.getElementById("skin-tone");
  const rgbBadge = document.getElementById("rgb-badge");
  const skinColorSwatch = document.getElementById("skin-color-swatch");
  const paletteChips = document.getElementById("palette-chips");
  const avoidTags = document.getElementById("avoid-tags");
  const looksTabBar = document.getElementById("looks-tab-bar");
  const vibeBadge = document.getElementById("vibe-badge");
  const outfitName = document.getElementById("outfit-name");
  const dressCodeBadges = document.getElementById("dress-code-badges");
  const recommendationsGrid = document.getElementById("recommendations");
  const stylingTipBox = document.getElementById("styling-tip-box");
  const stylingTipText = document.getElementById("styling-tip-text");
  const whyItWorksText = document.getElementById("why-it-works-text");
  const tryAgainBtn = document.getElementById("try-again");

  // State
  let currentOutfits = [];

  // =========================
  // CONFIG
  // =========================
  const BACKEND_URL = "http://127.0.0.1:5000/analyze";
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

  // =========================
  // PREVENT DEFAULT DRAG BEHAVIORS
  // =========================
  ["dragenter", "dragover", "dragleave", "drop"].forEach(event => {
    document.addEventListener(event, e => {
      e.preventDefault();
      e.stopPropagation();
    });
  });

  // =========================
  // FILE PREVIEW & VALIDATION
  // =========================
  function validateFile(file) {
    if (!file) return "No file selected";
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Invalid file type. Supported formats: JPG, PNG, GIF, WebP.";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "File is too large. Maximum size is 10MB.";
    }
    return null;
  }

  function previewImage(file) {
    const reader = new FileReader();
    reader.onload = () => {
      if (previewImg) {
        previewImg.src = reader.result;
        previewImg.style.display = "block";
      }
      if (previewText) {
        previewText.textContent = `Selected: ${file.name}`;
        previewText.style.display = "block";
      }
      if (dropContent) {
        dropContent.style.display = "none";
      }
    };
    reader.readAsDataURL(file);
  }

  function resetDropZone() {
    if (previewImg) {
      previewImg.src = "";
      previewImg.style.display = "none";
    }
    if (previewText) {
      previewText.textContent = "";
      previewText.style.display = "none";
    }
    if (dropContent) {
      dropContent.style.display = "block";
    }
  }

  // =========================
  // DRAG & DROP EVENTS
  // =========================
  dropZone.addEventListener("click", () => {
    fileInput.click();
  });

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

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    const error = validateFile(file);

    if (error) {
      alert(error);
      fileInput.value = "";
      resetDropZone();
      return;
    }

    if (file) {
      previewImage(file);
    }
  });

  // =========================
  // STORE BUTTON RENDERER
  // =========================
  function renderStoreButtons(storeLinks) {
    if (!storeLinks) return "";
    return `
      <div class="store-links">
        ${storeLinks.amazon ? `
          <a href="${storeLinks.amazon}" target="_blank" rel="noopener" class="store-btn amazon">
            <i class="fab fa-amazon"></i> Amazon
          </a>` : ""
        }
        ${storeLinks.myntra ? `
          <a href="${storeLinks.myntra}" target="_blank" rel="noopener" class="store-btn myntra">
            Myntra
          </a>` : ""
        }
        ${storeLinks.ajio ? `
          <a href="${storeLinks.ajio}" target="_blank" rel="noopener" class="store-btn ajio">
            Ajio
          </a>` : ""
        }
        ${storeLinks.flipkart ? `
          <a href="${storeLinks.flipkart}" target="_blank" rel="noopener" class="store-btn flipkart">
            Flipkart
          </a>` : ""
        }
      </div>
    `;
  }

  // =========================
  // RENDER ACTIVE OUTFIT LOOK
  // =========================
  function renderActiveOutfit(outfit) {
    if (!outfit) return;

    // 1. Header & Badges
    if (vibeBadge) vibeBadge.textContent = outfit.vibe_label || `Look ${outfit.id || 1}`;
    if (outfitName) outfitName.textContent = outfit.name || "Curated Look";
    if (dressCodeBadges) {
      const code = outfit.dress_code || "Smart Casual";
      dressCodeBadges.innerHTML = `<span class="badge dress-badge">${code}</span>`;
    }

    // 2. Palette chips for this specific look
    if (paletteChips) {
      const colors = outfit.color_palette || ["#1E3A8A", "#D97706", "#065F46", "#F3F4F6"];
      paletteChips.innerHTML = colors.map(hex => `
        <div class="palette-chip-wrapper" title="${hex}">
          <span class="palette-chip" style="background-color: ${hex};"></span>
          <small class="palette-hex">${hex}</small>
        </div>
      `).join("");
    }

    // 3. 5 Piece Cards: Topwear, Bottomwear, Footwear, Accessories, Fragrance
    if (recommendationsGrid) {
      const links = outfit.shopping_links || {};
      const frag = outfit.fragrance || {};

      const pieces = [
        {
          type: "standard",
          icon: "fas fa-tshirt",
          title: "Topwear",
          desc: `${outfit.shirt_details?.color || ""} ${outfit.shirt_details?.type || "Shirt"}`,
          storeLinks: links.shirt
        },
        {
          type: "standard",
          icon: "fas fa-user-tag",
          title: "Bottomwear",
          desc: `${outfit.pant_details?.color || ""} ${outfit.pant_details?.type || "Trousers"}`,
          storeLinks: links.pants
        },
        {
          type: "standard",
          icon: "fas fa-shoe-prints",
          title: "Footwear",
          desc: `${outfit.shoes_details?.color || ""} ${outfit.shoes_details?.type || "Shoes"}`,
          storeLinks: links.shoes
        },
        {
          type: "standard",
          icon: "fas fa-clock",
          title: "Accessories",
          desc: outfit.accessories?.item || "Minimalist Watch",
          storeLinks: links.accessories
        },
        {
          type: "fragrance",
          icon: "fas fa-spray-can",
          title: "Matching Fragrance",
          desc: frag.perfume_name || "Zara Silver / Titan Skinn",
          family: frag.scent_family || "Fresh Citrus & Woody",
          notes: frag.notes || "Bergamot, Vetiver, Cedarwood",
          storeLinks: links.fragrance
        }
      ];

      recommendationsGrid.innerHTML = pieces.map(p => {
        if (p.type === "fragrance") {
          return `
            <div class="recommendation-card piece-card fragrance-card">
              <div class="piece-header">
                <i class="${p.icon} piece-icon" style="color: #d97706;"></i>
                <h3>${p.title}</h3>
              </div>
              <span class="fragrance-badge"><i class="fas fa-wind"></i> ${p.family}</span>
              <p class="piece-desc">${p.desc}</p>
              <p class="scent-notes">Notes: ${p.notes}</p>
              ${renderStoreButtons(p.storeLinks)}
            </div>
          `;
        }

        return `
          <div class="recommendation-card piece-card">
            <div class="piece-header">
              <i class="${p.icon} piece-icon"></i>
              <h3>${p.title}</h3>
            </div>
            <p class="piece-desc">${p.desc}</p>
            ${renderStoreButtons(p.storeLinks)}
          </div>
        `;
      }).join("");
    }

    // 4. Styling Tip
    if (stylingTipBox && stylingTipText) {
      if (outfit.styling_tip) {
        stylingTipText.textContent = outfit.styling_tip;
        stylingTipBox.style.display = "block";
      } else {
        stylingTipBox.style.display = "none";
      }
    }
  }

  // =========================
  // FORM SUBMISSION
  // =========================
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!fileInput.files || !fileInput.files.length) {
      alert("Please upload a clear portrait photo first.");
      return;
    }

    loading.style.display = "block";
    resultsDiv.style.display = "none";
    loading.scrollIntoView({ behavior: "smooth", block: "center" });

    try {
      const formData = new FormData(form);

      const response = await fetch(BACKEND_URL, {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();
      const rec = data.recommendations;

      // 1. Skin Tone & Color Swatch
      if (skinToneSpan) skinToneSpan.textContent = data.skin_tone || "Detected Tone";
      if (rgbBadge) rgbBadge.textContent = `RGB(${data.rgb ? data.rgb.join(", ") : "N/A"})`;
      if (skinColorSwatch && data.hex_color) {
        skinColorSwatch.style.backgroundColor = data.hex_color;
      }

      // 2. Colors to Avoid
      if (avoidTags) {
        const avoidList = rec.colors_to_avoid || [];
        if (avoidList.length > 0) {
          avoidTags.innerHTML = avoidList.map(c => `
            <span class="avoid-tag"><i class="fas fa-times-circle"></i> ${c}</span>
          `).join("");
        } else {
          avoidTags.innerHTML = `<span class="avoid-tag">None identified</span>`;
        }
      }

      // 3. Why it works
      if (whyItWorksText) {
        whyItWorksText.textContent = rec.why_it_works || "These colors and cuts enhance your natural features.";
      }

      // 4. Set up 3 Outfits List
      currentOutfits = rec.outfits || [];
      if (currentOutfits.length === 0) {
        currentOutfits = [{
          id: 1,
          vibe_label: "Minimalist Everyday",
          name: rec.suggested_outfit || "Curated Look",
          dress_code: rec.dress_codes?.[0] || "Smart Casual",
          color_palette: rec.color_palette || [],
          shirt_details: rec.shirt_details || {},
          pant_details: rec.pant_details || {},
          shoes_details: rec.shoes_details || {},
          accessories: rec.accessories || {},
          fragrance: rec.fragrance || null,
          styling_tip: rec.styling_tip || "",
          shopping_links: rec.shopping_links || {}
        }];
      }

      // 5. Render Look Switcher Tabs
      if (looksTabBar) {
        looksTabBar.innerHTML = currentOutfits.map((out, idx) => `
          <button type="button" class="look-tab-btn ${idx === 0 ? 'active' : ''}" data-index="${idx}">
            <span class="tab-badge">Look ${idx + 1}</span>
            <span class="tab-title">${out.vibe_label || out.name}</span>
          </button>
        `).join("");

        looksTabBar.querySelectorAll(".look-tab-btn").forEach(btn => {
          btn.addEventListener("click", () => {
            looksTabBar.querySelectorAll(".look-tab-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            const idx = parseInt(btn.getAttribute("data-index"), 10);
            renderActiveOutfit(currentOutfits[idx]);
          });
        });
      }

      // 6. Display first outfit initially
      renderActiveOutfit(currentOutfits[0]);

      // Reveal results and smoothly scroll
      resultsDiv.style.display = "block";
      resultsDiv.scrollIntoView({ behavior: "smooth", block: "start" });

    } catch (err) {
      console.error("Analysis Error:", err);
      alert(`Error analyzing image: ${err.message || "Please ensure the Flask backend server is running on http://127.0.0.1:5000"}`);
    } finally {
      loading.style.display = "none";
    }
  });

  // =========================
  // TRY AGAIN BUTTON
  // =========================
  tryAgainBtn.addEventListener("click", () => {
    form.reset();
    if (genderSelect) genderSelect.value = "";
    if (occasionSelect) occasionSelect.value = "Casual / Everyday";
    if (ageRange && ageValue) {
      ageRange.value = 18;
      ageValue.innerText = "18";
    }
    fileInput.value = "";
    resetDropZone();
    resultsDiv.style.display = "none";
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  });

});