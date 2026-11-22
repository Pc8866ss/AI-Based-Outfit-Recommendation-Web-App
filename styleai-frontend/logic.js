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

  // Location & Weather Form Elements
  const cityInput = document.getElementById("city-input");
  const detectLocBtn = document.getElementById("detect-loc-btn");
  const latInput = document.getElementById("lat-input");
  const lonInput = document.getElementById("lon-input");
  const liveWeatherPreview = document.getElementById("live-weather-preview");
  const previewWeatherIcon = document.getElementById("preview-weather-icon");
  const previewWeatherText = document.getElementById("preview-weather-text");

  const loading = document.getElementById("loading");
  const resultsDiv = document.getElementById("results");

  // Results elements
  const skinToneSpan = document.getElementById("skin-tone");
  const rgbBadge = document.getElementById("rgb-badge");
  const skinColorSwatch = document.getElementById("skin-color-swatch");
  const paletteChips = document.getElementById("palette-chips");
  const avoidTags = document.getElementById("avoid-tags");

  // Weather Card Elements
  const weatherCard = document.getElementById("weather-card");
  const resWeatherIcon = document.getElementById("res-weather-icon");
  const resWeatherLocation = document.getElementById("res-weather-location");
  const resWeatherTemp = document.getElementById("res-weather-temp");
  const resWeatherCond = document.getElementById("res-weather-cond");
  const resWeatherFabric = document.getElementById("res-weather-fabric");

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
  let weatherDebounceTimer = null;

  // =========================
  // CONFIG
  // =========================
  const BACKEND_URL = "http://127.0.0.1:5000/analyze";
  const WEATHER_URL = "http://127.0.0.1:5000/weather";
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
  // REAL-TIME WEATHER HELPERS
  // =========================
  async function fetchAndShowWeather(queryParam) {
    if (!liveWeatherPreview) return null;
    try {
      liveWeatherPreview.style.display = "inline-flex";
      previewWeatherIcon.textContent = "⏳";
      previewWeatherText.textContent = "Checking climate...";

      const res = await fetch(`${WEATHER_URL}?${queryParam}`);
      if (!res.ok) throw new Error("Weather not available");
      const wData = await res.json();

      previewWeatherIcon.textContent = wData.icon || "🌤️";
      previewWeatherText.textContent = `${wData.location}: ${wData.temperature}°C, ${wData.condition}`;
      liveWeatherPreview.style.display = "inline-flex";

      if (wData.latitude && wData.longitude) {
        if (latInput) latInput.value = wData.latitude;
        if (lonInput) lonInput.value = wData.longitude;
      }
      return wData;
    } catch (err) {
      console.warn("Weather check:", err.message);
      if (liveWeatherPreview) {
        liveWeatherPreview.style.display = "none";
      }
      return null;
    }
  }

  // City input debounced search
  if (cityInput) {
    cityInput.addEventListener("input", () => {
      clearTimeout(weatherDebounceTimer);
      const val = cityInput.value.trim();
      if (val.length < 3) {
        if (liveWeatherPreview) liveWeatherPreview.style.display = "none";
        if (latInput) latInput.value = "";
        if (lonInput) lonInput.value = "";
        return;
      }
      weatherDebounceTimer = setTimeout(() => {
        fetchAndShowWeather(`city=${encodeURIComponent(val)}`);
      }, 600);
    });
  }

  // Geolocation Auto-Detect Button
  if (detectLocBtn) {
    detectLocBtn.addEventListener("click", () => {
      if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser. Please type your city name.");
        return;
      }
      detectLocBtn.disabled = true;
      detectLocBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span>Locating...</span>`;

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          if (latInput) latInput.value = lat;
          if (lonInput) lonInput.value = lon;

          const wData = await fetchAndShowWeather(`lat=${lat}&lon=${lon}`);
          if (wData && wData.location && cityInput) {
            cityInput.value = wData.location;
          }
          detectLocBtn.disabled = false;
          detectLocBtn.innerHTML = `<i class="fas fa-check"></i> <span>Detected</span>`;
          setTimeout(() => {
            detectLocBtn.innerHTML = `<i class="fas fa-location-arrow"></i> <span>Detect</span>`;
          }, 3000);
        },
        (error) => {
          console.warn("Geolocation error:", error);
          alert("Location access denied or unavailable. You can type your city name manually!");
          detectLocBtn.disabled = false;
          detectLocBtn.innerHTML = `<i class="fas fa-location-arrow"></i> <span>Detect</span>`;
        },
        { timeout: 8000 }
      );
    });
  }

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

      // 3.5. Render Real-Time Weather & Fabric Card
      if (weatherCard) {
        if (data.weather) {
          const w = data.weather;
          if (resWeatherIcon) resWeatherIcon.textContent = w.icon || "🌤️";
          if (resWeatherLocation) resWeatherLocation.textContent = w.location || "Local Climate";
          if (resWeatherTemp) resWeatherTemp.textContent = `${w.temperature}°C`;
          if (resWeatherCond) resWeatherCond.textContent = `${w.condition}${w.humidity ? ` (${w.humidity}% humidity)` : ''}`;
          if (resWeatherFabric) resWeatherFabric.textContent = w.fabric_advice || "Optimal fabrics for your climate.";
          weatherCard.style.display = "block";
        } else {
          weatherCard.style.display = "none";
        }
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
    if (cityInput) cityInput.value = "";
    if (latInput) latInput.value = "";
    if (lonInput) lonInput.value = "";
    if (liveWeatherPreview) liveWeatherPreview.style.display = "none";
    if (weatherCard) weatherCard.style.display = "none";
    if (ageRange && ageValue) {
      ageRange.value = 18;
      ageValue.innerText = "18";
    }
    fileInput.value = "";
    resetDropZone();
    resultsDiv.style.display = "none";
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // =========================================================
  // STUDIO MODE SWITCHER (STYLIST vs DUEL vs DUPE vs CAPSULE)
  // =========================================================
  const tabBtnStylist = document.getElementById("tab-btn-stylist");
  const tabBtnDuel = document.getElementById("tab-btn-duel");
  const tabBtnDupe = document.getElementById("tab-btn-dupe");
  const tabBtnCapsule = document.getElementById("tab-btn-capsule");
  const stylistSection = document.getElementById("stylist-section");
  const duelSection = document.getElementById("duel-section");
  const dupeSection = document.getElementById("dupe-section");
  const capsuleSection = document.getElementById("capsule-section");

  function switchStudioMode(mode) {
    if (tabBtnStylist) tabBtnStylist.classList.toggle("active", mode === "stylist");
    if (tabBtnDuel) tabBtnDuel.classList.toggle("active", mode === "duel");
    if (tabBtnDupe) tabBtnDupe.classList.toggle("active", mode === "dupe");
    if (tabBtnCapsule) tabBtnCapsule.classList.toggle("active", mode === "capsule");

    if (stylistSection) stylistSection.style.display = (mode === "stylist" ? "block" : "none");
    if (duelSection) duelSection.style.display = (mode === "duel" ? "block" : "none");
    if (dupeSection) dupeSection.style.display = (mode === "dupe" ? "block" : "none");
    if (capsuleSection) capsuleSection.style.display = (mode === "capsule" ? "block" : "none");

    const targetSection = mode === "stylist" ? stylistSection : (mode === "duel" ? duelSection : (mode === "dupe" ? dupeSection : capsuleSection));
    if (targetSection) targetSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (tabBtnStylist) {
    tabBtnStylist.addEventListener("click", () => switchStudioMode("stylist"));
  }
  if (tabBtnDuel) {
    tabBtnDuel.addEventListener("click", () => switchStudioMode("duel"));
  }
  if (tabBtnDupe) {
    tabBtnDupe.addEventListener("click", () => switchStudioMode("dupe"));
  }
  if (tabBtnCapsule) {
    tabBtnCapsule.addEventListener("click", () => switchStudioMode("capsule"));
  }

  // =========================================================
  // A/B FIT DUEL CONTROLLER
  // =========================================================
  const duelForm = document.getElementById("duel-form");
  const fileInputA = document.getElementById("file-input-a");
  const fileInputB = document.getElementById("file-input-b");
  const dropZoneA = document.getElementById("drop-zone-a");
  const dropZoneB = document.getElementById("drop-zone-b");
  const previewA = document.getElementById("preview-a");
  const previewB = document.getElementById("preview-b");
  const dropContentA = document.getElementById("drop-content-a");
  const dropContentB = document.getElementById("drop-content-b");
  const duelLoading = document.getElementById("duel-loading");
  const duelResults = document.getElementById("duel-results");
  const duelTryAgain = document.getElementById("duel-try-again");

  // Duel image preview helper
  function setupDuelDropZone(dropZone, fileInput, previewImg, dropContent) {
    if (!dropZone || !fileInput) return;

    dropZone.addEventListener("click", () => fileInput.click());

    ["dragenter", "dragover"].forEach(evt => {
      dropZone.addEventListener(evt, (e) => {
        e.preventDefault();
        dropZone.classList.add("dragover");
      });
    });

    ["dragleave", "drop"].forEach(evt => {
      dropZone.addEventListener(evt, (e) => {
        e.preventDefault();
        dropZone.classList.remove("dragover");
      });
    });

    dropZone.addEventListener("drop", (e) => {
      const file = e.dataTransfer.files[0];
      const err = validateFile(file);
      if (err) {
        alert(err);
        return;
      }
      fileInput.files = e.dataTransfer.files;
      showDuelPreview(file, previewImg, dropContent);
    });

    fileInput.addEventListener("change", () => {
      const file = fileInput.files[0];
      const err = validateFile(file);
      if (err) {
        alert(err);
        fileInput.value = "";
        return;
      }
      if (file) {
        showDuelPreview(file, previewImg, dropContent);
      }
    });
  }

  function showDuelPreview(file, previewImg, dropContent) {
    const reader = new FileReader();
    reader.onload = () => {
      if (previewImg) {
        previewImg.src = reader.result;
        previewImg.style.display = "block";
      }
      if (dropContent) {
        dropContent.style.display = "none";
      }
    };
    reader.readAsDataURL(file);
  }

  function resetDuelZone(previewImg, dropContent, fileInput) {
    if (previewImg) {
      previewImg.src = "";
      previewImg.style.display = "none";
    }
    if (dropContent) {
      dropContent.style.display = "block";
    }
    if (fileInput) {
      fileInput.value = "";
    }
  }

  setupDuelDropZone(dropZoneA, fileInputA, previewA, dropContentA);
  setupDuelDropZone(dropZoneB, fileInputB, previewB, dropContentB);

  // Helper: render mini chips
  function renderMiniChips(containerId, palette) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!palette || !palette.length) {
      el.innerHTML = '<small class="text-muted">None</small>';
      return;
    }
    el.innerHTML = palette.map(hex => `
      <span class="mini-chip" style="background-color: ${hex};" title="${hex}"></span>
    `).join("");
  }

  // Duel Form Submission
  if (duelForm) {
    duelForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!fileInputA.files.length || !fileInputB.files.length) {
        alert("Please upload images for both Outfit A and Outfit B to start the duel!");
        return;
      }

      if (duelLoading) duelLoading.style.display = "block";
      if (duelResults) duelResults.style.display = "none";
      duelLoading.scrollIntoView({ behavior: "smooth", block: "center" });

      try {
        const formData = new FormData(duelForm);
        // Inherit detected skin tone if available
        if (skinToneSpan && skinToneSpan.textContent) {
          formData.append("skin_tone", skinToneSpan.textContent);
        }

        const res = await fetch("http://127.0.0.1:5000/duel", {
          method: "POST",
          body: formData
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Server responded with status ${res.status}`);
        }

        const data = await res.json();
        latestDuelData = data;
        const winner = data.winner || "Fit A";
        const isAWinner = winner.toLowerCase().includes("a");

        // 1. Winner Banner
        const winTitle = isAWinner ? (data.fit_a?.title || "Outfit A") : (data.fit_b?.title || "Outfit B");
        const winnerAnn = document.getElementById("winner-announcement");
        const winnerHead = document.getElementById("winner-headline");
        if (winnerAnn) winnerAnn.textContent = `Winner: ${winner} — ${winTitle}`;
        if (winnerHead) winnerHead.textContent = data.matchup_title || "High Contrast vs Subtle Harmony";

        // 2. Scorecard A
        const cardA = document.getElementById("scorecard-a");
        if (cardA) {
          if (isAWinner) cardA.classList.add("is-winner");
          else cardA.classList.remove("is-winner");
        }
        const fitA = data.fit_a || {};
        document.getElementById("res-title-a").textContent = fitA.title || "Outfit A";
        document.getElementById("res-score-a").textContent = `${fitA.overall_score || 8.5}/10`;
        document.getElementById("meter-harmony-a").style.width = `${(fitA.color_harmony_score || 8.5) * 10}%`;
        document.getElementById("meter-val-harmony-a").textContent = fitA.color_harmony_score || 8.5;
        document.getElementById("meter-occasion-a").style.width = `${(fitA.occasion_match_score || 8.0) * 10}%`;
        document.getElementById("meter-val-occasion-a").textContent = fitA.occasion_match_score || 8.0;
        document.getElementById("meter-versatility-a").style.width = `${(fitA.versatility_score || 8.0) * 10}%`;
        document.getElementById("meter-val-versatility-a").textContent = fitA.versatility_score || 8.0;
        renderMiniChips("palette-chips-a", fitA.palette);
        document.getElementById("res-summary-a").textContent = fitA.summary || "";
        document.getElementById("pros-list-a").innerHTML = (fitA.pros || []).map(p => `<li>${p}</li>`).join("");
        document.getElementById("cons-list-a").innerHTML = (fitA.cons || []).map(c => `<li>${c}</li>`).join("");

        // 3. Scorecard B
        const cardB = document.getElementById("scorecard-b");
        if (cardB) {
          if (!isAWinner) cardB.classList.add("is-winner");
          else cardB.classList.remove("is-winner");
        }
        const fitB = data.fit_b || {};
        document.getElementById("res-title-b").textContent = fitB.title || "Outfit B";
        document.getElementById("res-score-b").textContent = `${fitB.overall_score || 8.0}/10`;
        document.getElementById("meter-harmony-b").style.width = `${(fitB.color_harmony_score || 8.0) * 10}%`;
        document.getElementById("meter-val-harmony-b").textContent = fitB.color_harmony_score || 8.0;
        document.getElementById("meter-occasion-b").style.width = `${(fitB.occasion_match_score || 7.5) * 10}%`;
        document.getElementById("meter-val-occasion-b").textContent = fitB.occasion_match_score || 7.5;
        document.getElementById("meter-versatility-b").style.width = `${(fitB.versatility_score || 7.8) * 10}%`;
        document.getElementById("meter-val-versatility-b").textContent = fitB.versatility_score || 7.8;
        renderMiniChips("palette-chips-b", fitB.palette);
        document.getElementById("res-summary-b").textContent = fitB.summary || "";
        document.getElementById("pros-list-b").innerHTML = (fitB.pros || []).map(p => `<li>${p}</li>`).join("");
        document.getElementById("cons-list-b").innerHTML = (fitB.cons || []).map(c => `<li>${c}</li>`).join("");

        // 4. Stylist Verdict & Polish
        const verdictText = document.getElementById("duel-verdict-text");
        if (verdictText) verdictText.textContent = data.stylist_verdict || "Both looks show merit, but the winning fit possesses superior tonal balance.";
        const upgradesList = document.getElementById("quick-upgrades-list");
        if (upgradesList) {
          upgradesList.innerHTML = (data.quick_upgrades || []).map(u => `<li>${u}</li>`).join("");
        }

        // Show results
        if (duelResults) {
          duelResults.style.display = "block";
          duelResults.scrollIntoView({ behavior: "smooth", block: "start" });
        }

      } catch (err) {
        console.error("Duel error:", err);
        alert(`Error judging duel: ${err.message || "Please ensure the backend is running."}`);
      } finally {
        if (duelLoading) duelLoading.style.display = "none";
      }
    });
  }

  // Duel Try Again
  if (duelTryAgain) {
    duelTryAgain.addEventListener("click", () => {
      duelForm.reset();
      resetDuelZone(previewA, dropContentA, fileInputA);
      resetDuelZone(previewB, dropContentB, fileInputB);
      if (duelResults) duelResults.style.display = "none";
      latestDuelData = null;
      duelForm.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // =========================================================
  // VIRAL SOCIAL SHARING & INSTAGRAM STORY CARD GENERATOR
  // =========================================================
  const btnDownloadStory = document.getElementById("btn-download-story");
  const btnOpenShareModal = document.getElementById("btn-open-share-modal");
  const btnShareWhatsapp = document.getElementById("btn-share-whatsapp");
  const btnShareTwitter = document.getElementById("btn-share-twitter");
  const btnCopyDuelLink = document.getElementById("btn-copy-duel-link");
  const duelShareToast = document.getElementById("duel-share-toast");
  const duelStoryCanvas = document.getElementById("duel-story-canvas");
  const duelShareModal = document.getElementById("duel-share-modal");
  const modalBackdrop = document.getElementById("modal-backdrop");
  const modalStoryPreview = document.getElementById("modal-story-preview");
  const shareCaptionText = document.getElementById("share-caption-text");
  const btnModalCopyCaption = document.getElementById("btn-modal-copy-caption");
  const btnModalDownload = document.getElementById("btn-modal-download");
  const btnCloseModal = document.getElementById("btn-close-modal");

  function getViralCaption() {
    if (!latestDuelData) {
      return "🔥 My outfits just battled head-to-head on Pic2Style AI Fit Duel! 👑 Compare your outfits too at: pic2style.ai ✨ #FitDuel #Pic2Style #OOTD";
    }
    const winner = latestDuelData.winner || "Fit A";
    const isAWinner = winner.toLowerCase().includes("a");
    const winObj = isAWinner ? (latestDuelData.fit_a || {}) : (latestDuelData.fit_b || {});
    const winTitle = winObj.title || "The Winning Look";
    const score = winObj.overall_score || "9.0";
    const matchup = latestDuelData.matchup_title || "Outfit Face-Off";

    return `🔥 My outfits just battled on Pic2Style AI Fit Duel! (${matchup})\n👑 Winner: ${winner} — ${winTitle} with a ${score}/10 rating!\n\nThink your fit can beat this? Battle yours free at: pic2style.ai ⚡\n\n#Pic2Style #FitDuel #StyleAI #OOTD #FashionAI`;
  }

  function showShareToast() {
    if (!duelShareToast) return;
    duelShareToast.style.display = "inline-flex";
    setTimeout(() => {
      duelShareToast.style.display = "none";
    }, 3500);
  }

  function copyShareCaption() {
    const text = getViralCaption();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        showShareToast();
      }).catch(() => {
        showShareToast();
      });
    } else {
      showShareToast();
    }
  }

  // Draw rounded rectangle helper
  function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  // Draw image with object-fit: cover inside rounded rectangle
  function drawCoverImage(ctx, img, x, y, w, h, radius) {
    ctx.save();
    drawRoundedRect(ctx, x, y, w, h, radius);
    ctx.clip();
    if (img && img.naturalWidth && img.naturalHeight) {
      const imgRatio = img.naturalWidth / img.naturalHeight;
      const boxRatio = w / h;
      let sWidth, sHeight, sx, sy;
      if (imgRatio > boxRatio) {
        sHeight = img.naturalHeight;
        sWidth = img.naturalHeight * boxRatio;
        sx = (img.naturalWidth - sWidth) / 2;
        sy = 0;
      } else {
        sWidth = img.naturalWidth;
        sHeight = img.naturalWidth / boxRatio;
        sx = 0;
        sy = (img.naturalHeight - sHeight) / 2;
      }
      ctx.drawImage(img, sx, sy, sWidth, sHeight, x, y, w, h);
    } else {
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(x, y, w, h);
    }
    ctx.restore();
  }

  // Text wrap helper
  function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 4) {
    const words = text.split(" ");
    let line = "";
    let linesDrawn = 0;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line.trim(), x, y);
        line = words[n] + " ";
        y += lineHeight;
        linesDrawn++;
        if (linesDrawn >= maxLines - 1 && n < words.length - 1) {
          ctx.fillText((line + "...").trim(), x, y);
          return;
        }
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), x, y);
  }

  // Generate 1080x1920 Instagram Story Battle Card
  function generateDuelStoryCard() {
    return new Promise((resolve) => {
      const canvas = duelStoryCanvas || document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext("2d");

      // 1. Sleek Gradient Background
      const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1920);
      bgGrad.addColorStop(0, "#080B14");
      bgGrad.addColorStop(0.3, "#0F172A");
      bgGrad.addColorStop(0.7, "#1E1B4B");
      bgGrad.addColorStop(1, "#0A0D18");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1080, 1920);

      // Decorative ambient glow
      const glow1 = ctx.createRadialGradient(250, 450, 50, 250, 450, 450);
      glow1.addColorStop(0, "rgba(245, 158, 11, 0.18)");
      glow1.addColorStop(1, "transparent");
      ctx.fillStyle = glow1;
      ctx.fillRect(0, 0, 1080, 1000);

      const glow2 = ctx.createRadialGradient(850, 750, 50, 850, 750, 450);
      glow2.addColorStop(0, "rgba(108, 99, 255, 0.22)");
      glow2.addColorStop(1, "transparent");
      ctx.fillStyle = glow2;
      ctx.fillRect(0, 0, 1080, 1200);

      // 2. Top Header Brand Pill
      ctx.textAlign = "center";
      const brandPillY = 120;
      drawRoundedRect(ctx, 310, brandPillY - 32, 460, 56, 28);
      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 215, 0, 0.5)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#FFD700";
      ctx.font = "bold 22px sans-serif";
      ctx.fillText("✨ PIC2STYLE • AI FASHION STYLIST", 540, brandPillY + 6);

      // Main Title
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "900 68px sans-serif";
      ctx.fillText("A/B FIT DUEL", 540, 240);

      // Matchup Headline
      const headline = latestDuelData?.matchup_title || "HEAD-TO-HEAD BATTLE";
      ctx.fillStyle = "#E2E8F0";
      ctx.font = "600 32px sans-serif";
      ctx.fillText(headline.toUpperCase(), 540, 295);

      // Determine Winner
      const winner = latestDuelData?.winner || "Fit A";
      const isAWinner = winner.toLowerCase().includes("a");
      const fitA = latestDuelData?.fit_a || {};
      const fitB = latestDuelData?.fit_b || {};

      // 3. Outfit Photos Side-by-Side (Cards: 460 x 720)
      const cardY = 360;
      const cardW = 460;
      const cardH = 720;
      const radius = 24;

      // Fit A (Left)
      drawCoverImage(ctx, previewA, 60, cardY, cardW, cardH, radius);
      drawRoundedRect(ctx, 60, cardY, cardW, cardH, radius);
      ctx.strokeStyle = isAWinner ? "#F59E0B" : "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = isAWinner ? 6 : 3;
      ctx.stroke();

      // Fit B (Right)
      drawCoverImage(ctx, previewB, 560, cardY, cardW, cardH, radius);
      drawRoundedRect(ctx, 560, cardY, cardW, cardH, radius);
      ctx.strokeStyle = !isAWinner ? "#F59E0B" : "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = !isAWinner ? 6 : 3;
      ctx.stroke();

      // Overlays on Photos (Dark gradients at bottom for scores)
      [60, 560].forEach((xPos) => {
        ctx.save();
        drawRoundedRect(ctx, xPos, cardY, cardW, cardH, radius);
        ctx.clip();
        const scGrad = ctx.createLinearGradient(0, cardY + cardH - 180, 0, cardY + cardH);
        scGrad.addColorStop(0, "transparent");
        scGrad.addColorStop(1, "rgba(0, 0, 0, 0.88)");
        ctx.fillStyle = scGrad;
        ctx.fillRect(xPos, cardY + cardH - 180, cardW, 180);
        ctx.restore();
      });

      // Tags & Scores
      // Fit A
      ctx.fillStyle = "#3B82F6";
      ctx.font = "bold 24px sans-serif";
      ctx.fillText("FIT A", 120, cardY + cardH - 90);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "900 48px sans-serif";
      ctx.fillText(`${fitA.overall_score || 8.5}/10`, 170, cardY + cardH - 35);

      // Fit B
      ctx.fillStyle = "#EC4899";
      ctx.font = "bold 24px sans-serif";
      ctx.fillText("FIT B", 620, cardY + cardH - 90);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "900 48px sans-serif";
      ctx.fillText(`${fitB.overall_score || 8.0}/10`, 670, cardY + cardH - 35);

      // VS Badge in Center
      const vsX = 540;
      const vsY = cardY + (cardH / 2);
      ctx.save();
      ctx.beginPath();
      ctx.arc(vsX, vsY, 52, 0, Math.PI * 2);
      const vsGrad = ctx.createLinearGradient(vsX - 50, vsY - 50, vsX + 50, vsY + 50);
      vsGrad.addColorStop(0, "#F59E0B");
      vsGrad.addColorStop(1, "#EF4444");
      ctx.fillStyle = vsGrad;
      ctx.shadowColor = "rgba(239, 68, 68, 0.7)";
      ctx.shadowBlur = 24;
      ctx.fill();
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "900 36px sans-serif";
      ctx.fillText("VS", vsX, vsY + 12);

      // Winner Crown & Banner
      const winX = isAWinner ? 60 : 560;
      drawRoundedRect(ctx, winX + 60, cardY - 28, 340, 56, 28);
      ctx.fillStyle = "#F59E0B";
      ctx.shadowColor = "rgba(245, 158, 11, 0.6)";
      ctx.shadowBlur = 18;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = "#000000";
      ctx.font = "900 24px sans-serif";
      ctx.fillText(`👑 CROWNED WINNER`, winX + 230, cardY + 9);

      // Titles below photos
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 28px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(fitA.title || "The Modern Minimalist", 290, cardY + cardH + 50);
      ctx.fillText(fitB.title || "The Rustic Charmer", 790, cardY + cardH + 50);

      // 4. Stylist Verdict Box (y=1190)
      const boxY = 1190;
      drawRoundedRect(ctx, 60, boxY, 960, 260, 24);
      ctx.fillStyle = "rgba(255, 255, 255, 0.07)";
      ctx.fill();
      ctx.strokeStyle = "#6C63FF";
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.textAlign = "left";
      ctx.fillStyle = "#FFD700";
      ctx.font = "bold 26px sans-serif";
      ctx.fillText("⚖️ STYLIST'S OFFICIAL VERDICT:", 100, boxY + 50);

      ctx.fillStyle = "#E2E8F0";
      ctx.font = "500 28px sans-serif";
      const verdict = latestDuelData?.stylist_verdict || "Both outfits display impressive style, but the winning look balances contrast, silhouette, and occasion dress code with supreme precision.";
      wrapText(ctx, verdict, 100, boxY + 105, 880, 42, 3);

      // 5. Viral Call to Action Footer (y=1500 to 1840)
      const footerY = 1500;
      drawRoundedRect(ctx, 60, footerY, 960, 320, 28);
      const ftGrad = ctx.createLinearGradient(60, footerY, 1020, footerY + 320);
      ftGrad.addColorStop(0, "#1E1B4B");
      ftGrad.addColorStop(1, "#312E81");
      ctx.fillStyle = ftGrad;
      ctx.fill();
      ctx.strokeStyle = "rgba(245, 158, 11, 0.4)";
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.textAlign = "center";
      ctx.fillStyle = "#FFD700";
      ctx.font = "900 38px sans-serif";
      ctx.fillText("🔥 THINK YOUR FIT CAN BEAT THIS?", 540, footerY + 70);

      ctx.fillStyle = "#CBD5E1";
      ctx.font = "500 28px sans-serif";
      ctx.fillText("Rate your outfit & get AI fashion recommendations free at:", 540, footerY + 125);

      // Website URL Pill
      drawRoundedRect(ctx, 240, footerY + 160, 600, 70, 35);
      ctx.fillStyle = "#FFD700";
      ctx.fill();

      ctx.fillStyle = "#1E1B4B";
      ctx.font = "900 36px sans-serif";
      ctx.fillText("👉  PIC2STYLE.AI  👈", 540, footerY + 208);

      ctx.fillStyle = "#94A3B8";
      ctx.font = "600 24px sans-serif";
      ctx.fillText("Tag @pic2style • Use #FitDuel #StyleAI #OOTD", 540, footerY + 280);

      resolve(canvas.toDataURL("image/png"));
    });
  }

  // Event: Download Story Card
  if (btnDownloadStory) {
    btnDownloadStory.addEventListener("click", async () => {
      btnDownloadStory.disabled = true;
      btnDownloadStory.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span>Generating Story Card...</span>`;

      try {
        const dataUrl = await generateDuelStoryCard();
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `Pic2Style_Fit_Duel_${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (err) {
        console.error("Story generation error:", err);
        alert("Could not generate story card. Please ensure images are loaded.");
      } finally {
        btnDownloadStory.disabled = false;
        btnDownloadStory.innerHTML = `<i class="fab fa-instagram"></i> <span>Download Instagram Story Card</span>`;
      }
    });
  }

  // Event: Open Share Modal
  if (btnOpenShareModal) {
    btnOpenShareModal.addEventListener("click", async () => {
      btnOpenShareModal.disabled = true;
      btnOpenShareModal.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span>Preparing Preview...</span>`;

      try {
        const dataUrl = await generateDuelStoryCard();
        if (modalStoryPreview) modalStoryPreview.src = dataUrl;
        if (shareCaptionText) shareCaptionText.value = getViralCaption();
        if (duelShareModal) duelShareModal.style.display = "flex";
      } catch (err) {
        console.error("Preview error:", err);
        alert("Could not generate card preview.");
      } finally {
        btnOpenShareModal.disabled = false;
        btnOpenShareModal.innerHTML = `<i class="fas fa-share-alt"></i> <span>Preview & Share Card</span>`;
      }
    });
  }

  // Event: Modal Close
  if (btnCloseModal && duelShareModal) {
    btnCloseModal.addEventListener("click", () => {
      duelShareModal.style.display = "none";
    });
  }

  if (modalBackdrop && duelShareModal) {
    modalBackdrop.addEventListener("click", () => {
      duelShareModal.style.display = "none";
    });
  }

  // Event: Modal Copy Caption
  if (btnModalCopyCaption) {
    btnModalCopyCaption.addEventListener("click", () => {
      copyShareCaption();
      btnModalCopyCaption.textContent = "Copied!";
      setTimeout(() => {
        btnModalCopyCaption.textContent = "Copy";
      }, 2000);
    });
  }

  // Event: Modal Download
  if (btnModalDownload) {
    btnModalDownload.addEventListener("click", () => {
      if (modalStoryPreview && modalStoryPreview.src) {
        const a = document.createElement("a");
        a.href = modalStoryPreview.src;
        a.download = `Pic2Style_Fit_Duel_${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    });
  }

  // Event: Copy Duel Link / Caption
  if (btnCopyDuelLink) {
    btnCopyDuelLink.addEventListener("click", () => {
      copyShareCaption();
    });
  }

  // Event: WhatsApp Share
  if (btnShareWhatsapp) {
    btnShareWhatsapp.addEventListener("click", () => {
      const caption = getViralCaption();
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(caption)}`, "_blank");
    });
  }

  // Event: X / Twitter Share
  if (btnShareTwitter) {
    btnShareTwitter.addEventListener("click", () => {
      const caption = getViralCaption();
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(caption)}`, "_blank");
    });
  }

  // =========================================================
  // FLOATING AI STYLIST CHATBOT ("ASK STYLEAI")
  // =========================================================
  const chatbotToggleBtn = document.getElementById("chatbot-toggle-btn");
  const chatbotDrawer = document.getElementById("chatbot-drawer");
  const chatbotCloseBtn = document.getElementById("chatbot-close-btn");
  const chatbotForm = document.getElementById("chatbot-form");
  const chatbotInput = document.getElementById("chatbot-input");
  const chatbotMessages = document.getElementById("chatbot-messages");

  if (chatbotToggleBtn && chatbotDrawer) {
    chatbotToggleBtn.addEventListener("click", () => {
      const isHidden = chatbotDrawer.style.display === "none" || !chatbotDrawer.style.display;
      chatbotDrawer.style.display = isHidden ? "flex" : "none";
      if (isHidden && chatbotInput) chatbotInput.focus();
    });
  }

  if (chatbotCloseBtn && chatbotDrawer) {
    chatbotCloseBtn.addEventListener("click", () => {
      chatbotDrawer.style.display = "none";
    });
  }

  // Quick prompt chips
  document.querySelectorAll(".chip-btn").forEach(chip => {
    chip.addEventListener("click", () => {
      const prompt = chip.getAttribute("data-prompt");
      if (prompt && chatbotInput) {
        chatbotInput.value = prompt;
        if (chatbotForm) chatbotForm.dispatchEvent(new Event("submit"));
      }
    });
  });

  // Append Chat Message Helper
  function appendChatMessage(text, sender = "ai") {
    if (!chatbotMessages) return null;
    const bubble = document.createElement("div");
    bubble.className = `chat-bubble ${sender === "user" ? "user-bubble" : "ai-bubble"}`;
    bubble.innerHTML = `<p>${text}</p>`;
    chatbotMessages.appendChild(bubble);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    return bubble;
  }

  // Chat Form Submission
  if (chatbotForm) {
    chatbotForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const msg = chatbotInput.value.trim();
      if (!msg) return;

      // 1. Add user bubble & clear input
      appendChatMessage(msg, "user");
      chatbotInput.value = "";

      // 2. Add typing indicator
      const typingBubble = appendChatMessage("<i>StyleAI is typing styling advice...</i>", "ai");
      typingBubble.classList.add("typing-bubble");

      try {
        // Collect current styling context
        const context = {
          skin_tone: skinToneSpan ? skinToneSpan.textContent : "Medium",
          undertone: rgbBadge ? rgbBadge.textContent : "Warm",
          occasion: occasionSelect ? occasionSelect.value : "Date Night",
          weather: resWeatherTemp ? `${resWeatherLocation?.textContent || 'City'}: ${resWeatherTemp.textContent}, ${resWeatherCond?.textContent || 'Pleasant'}` : "Pleasant 24°C",
          active_look: outfitName ? outfitName.textContent : ""
        };

        const res = await fetch("http://127.0.0.1:5000/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: msg, context: context })
        });

        if (!res.ok) throw new Error("Could not get answer from Stylist.");
        const data = await res.json();

        // Remove typing bubble and render answer
        typingBubble.remove();
        appendChatMessage(data.reply || "For your skin tone and occasion, lean into rich textures and clean complementary contrast.");

      } catch (err) {
        typingBubble.remove();
        appendChatMessage("Sorry, I couldn't reach the stylist server. Please ensure the backend is running on port 5000.");
      }
    });
  }

  // =========================================================
  // CELEBRITY & AESTHETIC DUPE FINDER CONTROLLER
  // =========================================================
  const dupeForm = document.getElementById("dupe-form");
  const dupeDropZone = document.getElementById("dupe-drop-zone");
  const dupeFileInput = document.getElementById("dupe-file-input");
  const dupeDropPrompt = document.getElementById("dupe-drop-prompt");
  const dupePreviewWrap = document.getElementById("dupe-preview-wrap");
  const dupeImgPreview = document.getElementById("dupe-img-preview");
  const btnRemoveDupeImg = document.getElementById("btn-remove-dupe-img");
  const aestheticPresetChips = document.querySelectorAll(".preset-chip");
  const dupeAestheticInput = document.getElementById("dupe-aesthetic-input");
  const dupeBudgetSelect = document.getElementById("dupe-budget-select");
  const dupeGenderSelect = document.getElementById("dupe-gender-select");
  const dupeLoading = document.getElementById("dupe-loading");
  const dupeResults = document.getElementById("dupe-results");

  // Results elements
  const dupeInspoThumb = document.getElementById("dupe-inspo-thumb");
  const resAestheticName = document.getElementById("res-aesthetic-name");
  const resCelebrityMatch = document.getElementById("res-celebrity-match");
  const resVibeDesc = document.getElementById("res-vibe-desc");
  const dupePaletteDots = document.getElementById("dupe-palette-dots");
  const resOrigPrice = document.getElementById("res-orig-price");
  const resDupePrice = document.getElementById("res-dupe-price");
  const resSavingsBadge = document.getElementById("res-savings-badge");
  const dupePiecesGrid = document.getElementById("dupe-pieces-grid");
  const dupeSecretsList = document.getElementById("dupe-secrets-list");
  const btnCopyDupeList = document.getElementById("btn-copy-dupe-list");
  const btnDupeAnother = document.getElementById("btn-dupe-another");
  const dupeCopyToast = document.getElementById("dupe-copy-toast");

  let currentDupeData = null;
  let dupeImageObjectUrl = null;

  // Dupe File Drop & Selection
  if (dupeDropZone && dupeFileInput) {
    dupeDropZone.addEventListener("click", (e) => {
      if (e.target.closest("#btn-remove-dupe-img")) return;
      dupeFileInput.click();
    });

    dupeDropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dupeDropZone.classList.add("dragover");
    });

    dupeDropZone.addEventListener("dragleave", () => {
      dupeDropZone.classList.remove("dragover");
    });

    dupeDropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dupeDropZone.classList.remove("dragover");
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        dupeFileInput.files = e.dataTransfer.files;
        handleDupeFileSelect(e.dataTransfer.files[0]);
      }
    });

    dupeFileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        handleDupeFileSelect(e.target.files[0]);
      }
    });
  }

  function handleDupeFileSelect(file) {
    if (!file) return;
    if (dupeImageObjectUrl) URL.revokeObjectURL(dupeImageObjectUrl);
    dupeImageObjectUrl = URL.createObjectURL(file);
    if (dupeImgPreview) dupeImgPreview.src = dupeImageObjectUrl;
    if (dupeDropPrompt) dupeDropPrompt.style.display = "none";
    if (dupePreviewWrap) dupePreviewWrap.style.display = "block";
  }

  if (btnRemoveDupeImg) {
    btnRemoveDupeImg.addEventListener("click", (e) => {
      e.stopPropagation();
      if (dupeFileInput) dupeFileInput.value = "";
      if (dupeImageObjectUrl) {
        URL.revokeObjectURL(dupeImageObjectUrl);
        dupeImageObjectUrl = null;
      }
      if (dupePreviewWrap) dupePreviewWrap.style.display = "none";
      if (dupeDropPrompt) dupeDropPrompt.style.display = "block";
    });
  }

  // Aesthetic Preset Chips Handler
  aestheticPresetChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const aestheticVal = chip.getAttribute("data-aesthetic");
      const isAlreadyActive = chip.classList.contains("active");

      aestheticPresetChips.forEach((c) => c.classList.remove("active"));

      if (!isAlreadyActive && aestheticVal) {
        chip.classList.add("active");
        if (dupeAestheticInput) dupeAestheticInput.value = aestheticVal;
      } else {
        if (dupeAestheticInput) dupeAestheticInput.value = "";
      }
    });
  });

  // Dupe Form Submit
  if (dupeForm) {
    dupeForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!dupeFileInput || !dupeFileInput.files || !dupeFileInput.files[0]) {
        alert("Please upload an inspiration outfit or celebrity photo first!");
        return;
      }

      const formData = new FormData();
      formData.append("image", dupeFileInput.files[0]);
      if (dupeAestheticInput) formData.append("aesthetic", dupeAestheticInput.value.trim());
      if (dupeBudgetSelect) formData.append("budget_tier", dupeBudgetSelect.value);
      if (dupeGenderSelect) formData.append("gender", dupeGenderSelect.value);

      // Loading state
      if (dupeResults) dupeResults.style.display = "none";
      if (dupeLoading) {
        dupeLoading.style.display = "block";
        dupeLoading.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      try {
        const response = await fetch("http://127.0.0.1:5000/dupe", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Dupe analysis request failed with status: " + response.status);
        }

        const data = await response.json();
        currentDupeData = data;

        renderDupeResults(data);

        if (dupeLoading) dupeLoading.style.display = "none";
        if (dupeResults) {
          dupeResults.style.display = "block";
          dupeResults.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      } catch (err) {
        console.error("Dupe finder error:", err);
        if (dupeLoading) dupeLoading.style.display = "none";
        alert("Could not process the celebrity dupe. Please ensure the backend is running on port 5000.");
      }
    });
  }

  function renderDupeResults(data) {
    // 1. Inspo Hero Image
    if (dupeInspoThumb && dupeImageObjectUrl) {
      dupeInspoThumb.src = dupeImageObjectUrl;
    }

    // 2. Headings & vibe
    if (resAestheticName) resAestheticName.textContent = data.aesthetic_name || "Celebrity Aesthetic";
    if (resCelebrityMatch) resCelebrityMatch.textContent = data.celebrity_inspo_match || "Inspired by Celebrity Streetwear & Runway";
    if (resVibeDesc) resVibeDesc.textContent = data.vibe_description || "";

    // 3. Extracted Palette Dots
    if (dupePaletteDots) {
      dupePaletteDots.innerHTML = "";
      (data.extracted_palette || []).forEach((hex) => {
        const dot = document.createElement("div");
        dot.className = "dupe-color-dot";
        dot.style.backgroundColor = hex;
        dot.title = hex;
        dupePaletteDots.appendChild(dot);
      });
    }

    // 4. Prices
    if (resOrigPrice) resOrigPrice.textContent = data.original_estimated_price || "₹55,000";
    if (resDupePrice) resDupePrice.textContent = data.dupe_total_price || "₹2,499";
    if (resSavingsBadge) {
      resSavingsBadge.innerHTML = `<i class="fas fa-fire"></i> SAVE ${data.savings_percent || '95%'}`;
    }

    // 5. Deconstructed Pieces Cards
    if (dupePiecesGrid) {
      dupePiecesGrid.innerHTML = "";
      const pieces = data.pieces || [];

      pieces.forEach((piece) => {
        const card = document.createElement("div");
        card.className = "dupe-piece-card";

        const links = piece.shopping_links || {};
        const myntraUrl = links.myntra || "#";
        const ajioUrl = links.ajio || "#";
        const amazonUrl = links.amazon || "#";
        const flipkartUrl = links.flipkart || "#";

        card.innerHTML = `
          <div>
            <div class="dupe-piece-header">
              <span class="dupe-piece-badge">${escapeHtml(piece.category || "Item")}</span>
              <div class="dupe-color-chip">
                <span class="dot" style="background-color: ${piece.color_hex || '#333'};"></span>
                <span>${escapeHtml(piece.color_name || 'Neutral')}</span>
              </div>
            </div>
            <h4 class="dupe-piece-title">${escapeHtml(piece.name || '')}</h4>
            <div class="dupe-price-tag">${escapeHtml(piece.price_range || 'Under ₹999')}</div>
            <p class="dupe-piece-reason">${escapeHtml(piece.dupe_reason || '')}</p>
            ${piece.pro_tip ? `<div class="dupe-piece-tip"><i class="fas fa-lightbulb"></i> ${escapeHtml(piece.pro_tip)}</div>` : ''}
          </div>

          <div class="dupe-store-links">
            <a href="${myntraUrl}" target="_blank" rel="noopener noreferrer" class="store-btn store-myntra" title="Search on Myntra">
              <i class="fas fa-shopping-bag"></i> Myntra
            </a>
            <a href="${ajioUrl}" target="_blank" rel="noopener noreferrer" class="store-btn store-ajio" title="Search on Ajio">
              <i class="fas fa-tag"></i> Ajio
            </a>
            <a href="${amazonUrl}" target="_blank" rel="noopener noreferrer" class="store-btn store-amazon" title="Search on Amazon India">
              <i class="fab fa-amazon"></i> Amazon
            </a>
            <a href="${flipkartUrl}" target="_blank" rel="noopener noreferrer" class="store-btn store-flipkart" title="Search on Flipkart">
              <i class="fas fa-bolt"></i> Flipkart
            </a>
          </div>
        `;
        dupePiecesGrid.appendChild(card);
      });
    }

    // 6. Styling Masterclass Secrets
    if (dupeSecretsList) {
      dupeSecretsList.innerHTML = "";
      (data.styling_secrets || []).forEach((sec) => {
        const li = document.createElement("li");
        li.textContent = sec;
        dupeSecretsList.appendChild(li);
      });
    }
  }

  // Copy Full Dupe Shopping List
  if (btnCopyDupeList) {
    btnCopyDupeList.addEventListener("click", () => {
      if (!currentDupeData) return;

      let text = `🔥 Pic2Style Celebrity Dupe Breakdown: ${currentDupeData.aesthetic_name || "Aesthetic Look"}\n`;
      text += `💰 Designer Est: ${currentDupeData.original_estimated_price || "₹55,000"} ➡️ Dupe Total: ${currentDupeData.dupe_total_price || "₹2,499"} (Save ${currentDupeData.savings_percent || '95%'}!)\n\n`;
      text += `🛍️ DECONSTRUCTED PIECES & DIRECT STORES:\n`;

      (currentDupeData.pieces || []).forEach((p, idx) => {
        text += `\n${idx + 1}. [${p.category}] ${p.name} (~${p.price_range})\n`;
        if (p.shopping_links) {
          text += `   • Myntra: ${p.shopping_links.myntra}\n`;
          text += `   • Ajio: ${p.shopping_links.ajio}\n`;
          text += `   • Amazon: ${p.shopping_links.amazon}\n`;
        }
      });

      text += `\n✨ Stylist's Golden Rule: ${(currentDupeData.styling_secrets && currentDupeData.styling_secrets[0]) || 'Fit is 90% of luxury.'}\n`;
      text += `\nCurated with Pic2Style (pic2style.ai) 👗`;

      navigator.clipboard.writeText(text).then(() => {
        if (dupeCopyToast) {
          dupeCopyToast.style.display = "block";
          setTimeout(() => {
            dupeCopyToast.style.display = "none";
          }, 4000);
        }
      }).catch(err => {
        console.error("Could not copy dupe list:", err);
      });
    });
  }

  // Deconstruct Another Look
  if (btnDupeAnother) {
    btnDupeAnother.addEventListener("click", () => {
      if (dupeForm) dupeForm.reset();
      if (dupeFileInput) dupeFileInput.value = "";
      if (dupeImageObjectUrl) {
        URL.revokeObjectURL(dupeImageObjectUrl);
        dupeImageObjectUrl = null;
      }
      if (dupePreviewWrap) dupePreviewWrap.style.display = "none";
      if (dupeDropPrompt) dupeDropPrompt.style.display = "block";
      aestheticPresetChips.forEach((c) => c.classList.remove("active"));
      if (dupeResults) dupeResults.style.display = "none";
      if (dupeSection) dupeSection.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // =========================================================
  // SMART TRAVEL CAPSULE WARDROBE CONTROLLER
  // =========================================================
  const capsuleForm = document.getElementById("capsule-form");
  const destInput = document.getElementById("capsule-destination-input");
  const btnCheckWeather = document.getElementById("btn-capsule-check-weather");
  const destWeatherPreview = document.getElementById("capsule-dest-weather");
  const destWeatherIcon = document.getElementById("dest-weather-icon");
  const destWeatherCity = document.getElementById("dest-weather-city");
  const destWeatherTemp = document.getElementById("dest-weather-temp");
  const destWeatherCond = document.getElementById("dest-weather-cond");
  const destWeatherFabric = document.getElementById("dest-weather-fabric");

  const durationSelect = document.getElementById("capsule-duration-select");
  const capsuleGenderSelect = document.getElementById("capsule-gender-select");
  const luggageSelect = document.getElementById("capsule-luggage-select");
  const vibeInput = document.getElementById("capsule-vibe-input");
  const vibeChips = document.querySelectorAll(".vibe-chip");
  const notesInput = document.getElementById("capsule-notes-input");

  const capsuleLoading = document.getElementById("capsule-loading");
  const capsuleResults = document.getElementById("capsule-results");

  // Results elements
  const resCapsuleDest = document.getElementById("res-capsule-destination");
  const resCapsuleIcon = document.getElementById("res-capsule-icon");
  const resCapsuleTemp = document.getElementById("res-capsule-temp");
  const resCapsuleCond = document.getElementById("res-capsule-cond");
  const resCapsuleFormula = document.getElementById("res-capsule-formula");
  const resCapsuleWeight = document.getElementById("res-capsule-weight");
  const resCapsuleSummary = document.getElementById("res-capsule-summary");
  const resCapsuleTransit = document.getElementById("res-capsule-transit");

  const capsuleTabNavBtns = document.querySelectorAll(".capsule-tab-nav-btn");
  const capsuleTabContents = document.querySelectorAll(".capsule-tab-content");

  const capsulePiecesGrid = document.getElementById("capsule-pieces-grid");
  const itineraryMatrixGrid = document.getElementById("itinerary-matrix-grid");
  const checklistClothing = document.getElementById("checklist-clothing");
  const checklistToiletries = document.getElementById("checklist-toiletries");
  const checklistTech = document.getElementById("checklist-tech");
  const checklistClimate = document.getElementById("checklist-climate");
  const capsuleHacksGrid = document.getElementById("capsule-hacks-grid");

  const btnCopyCapsule = document.getElementById("btn-copy-capsule");
  const btnCapsulePrint = document.getElementById("btn-capsule-print");
  const btnCapsuleAnother = document.getElementById("btn-capsule-another");
  const capsuleCopyToast = document.getElementById("capsule-copy-toast");

  let currentCapsuleData = null;

  // 1. Destination Weather Check
  async function fetchDestinationWeather(city) {
    if (!city || !city.trim()) return;
    try {
      const res = await fetch(`http://127.0.0.1:5000/weather?city=${encodeURIComponent(city.trim())}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.temperature !== undefined) {
        if (destWeatherCity) destWeatherCity.textContent = data.resolved_city || city;
        if (destWeatherTemp) destWeatherTemp.textContent = `${data.temperature}°C`;
        if (destWeatherCond) destWeatherCond.textContent = data.condition || "Pleasant";
        if (destWeatherIcon) destWeatherIcon.textContent = data.icon || "🌤️";
        if (destWeatherFabric) destWeatherFabric.textContent = data.fabric || "Versatile fabrics recommended.";
        if (destWeatherPreview) destWeatherPreview.style.display = "flex";
      }
    } catch (e) {
      console.warn("Could not fetch preview weather for destination:", e);
    }
  }

  if (btnCheckWeather && destInput) {
    btnCheckWeather.addEventListener("click", () => {
      fetchDestinationWeather(destInput.value);
    });
  }

  if (destInput) {
    destInput.addEventListener("blur", () => {
      if (destInput.value && destInput.value.trim().length >= 3) {
        fetchDestinationWeather(destInput.value);
      }
    });
    // Auto preview initial value on load
    if (destInput.value) {
      fetchDestinationWeather(destInput.value);
    }
  }

  // 2. Vibe Chips Selection
  vibeChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      vibeChips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      const val = chip.getAttribute("data-vibe");
      if (vibeInput && val) vibeInput.value = val;
    });
  });

  // 3. Capsule Form Submission
  if (capsuleForm) {
    capsuleForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const payload = {
        destination: destInput ? destInput.value.trim() : "Goa, India",
        duration: durationSelect ? parseInt(durationSelect.value, 10) : 5,
        gender: capsuleGenderSelect ? capsuleGenderSelect.value : "Unisex",
        luggage: luggageSelect ? luggageSelect.value : "Carry-On Only (≤ 7kg)",
        vibe: vibeInput ? vibeInput.value : "Beach & Coastal Resort",
        notes: notesInput ? notesInput.value.trim() : ""
      };

      if (capsuleResults) capsuleResults.style.display = "none";
      if (capsuleLoading) {
        capsuleLoading.style.display = "block";
        capsuleLoading.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      try {
        const response = await fetch("http://127.0.0.1:5000/capsule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error("Capsule request failed with status: " + response.status);
        }

        const data = await response.json();
        currentCapsuleData = data;

        renderCapsuleResults(data);

        if (capsuleLoading) capsuleLoading.style.display = "none";
        if (capsuleResults) {
          capsuleResults.style.display = "block";
          capsuleResults.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      } catch (err) {
        console.error("Capsule generation error:", err);
        if (capsuleLoading) capsuleLoading.style.display = "none";
        alert("Could not generate travel capsule. Please verify the backend is running on port 5000.");
      }
    });
  }

  // 4. Render Capsule Results
  function renderCapsuleResults(data) {
    // A. Hero Banner
    if (resCapsuleDest) resCapsuleDest.textContent = data.destination_display || "Destination Capsule";
    
    const climate = data.climate_badge || {};
    if (resCapsuleIcon) resCapsuleIcon.textContent = climate.icon || "🌤️";
    if (resCapsuleTemp) resCapsuleTemp.textContent = climate.temp || "25°C";
    if (resCapsuleCond) resCapsuleCond.textContent = climate.condition || "Pleasant";
    if (resCapsuleFormula) {
      resCapsuleFormula.innerHTML = `<i class="fas fa-cube"></i> ${escapeHtml(data.capsule_formula || '6 Pieces ➡️ 10 Outfits')}`;
    }
    
    const luggage = data.luggage_strategy || {};
    if (resCapsuleWeight) {
      resCapsuleWeight.innerHTML = `<i class="fas fa-weight-hanging"></i> ${escapeHtml(luggage.estimated_weight || '5.5 kg')} (${escapeHtml(luggage.recommended_bag || 'Carry-On')})`;
    }
    if (resCapsuleSummary) resCapsuleSummary.textContent = climate.climate_summary || "";
    if (resCapsuleTransit) resCapsuleTransit.textContent = luggage.transit_outfit || "Wear your heaviest outer layer and walking shoes on flight.";

    // B. Tab 1: Core Pieces Grid
    if (capsulePiecesGrid) {
      capsulePiecesGrid.innerHTML = "";
      const pieces = data.core_pieces || [];
      pieces.forEach((p) => {
        const card = document.createElement("div");
        card.className = "capsule-piece-card";

        const links = p.shopping_links || {};
        const myntraUrl = links.myntra || "#";
        const ajioUrl = links.ajio || "#";
        const amazonUrl = links.amazon || "#";
        const flipkartUrl = links.flipkart || "#";

        card.innerHTML = `
          <div>
            <div class="capsule-piece-header">
              <span class="capsule-id-badge">${escapeHtml(p.id || 'P')}</span>
              <span class="capsule-category-badge">${escapeHtml(p.category || 'Essential')}</span>
            </div>
            <h4 class="capsule-piece-title">${escapeHtml(p.name || '')}</h4>
            <div class="capsule-props-row">
              <div class="capsule-color-chip">
                <span class="dot" style="background-color: ${p.color_hex || '#333'};"></span>
                <span>${escapeHtml(p.color_name || 'Neutral')}</span>
              </div>
              <span class="capsule-fabric-pill"><i class="fas fa-feather-alt"></i> ${escapeHtml(p.fabric || 'Breathable Fabric')}</span>
            </div>
            <div class="capsule-versatility-tag">
              <i class="fas fa-check-circle"></i> ${escapeHtml(p.versatility_tag || 'Multi-day wear')}
            </div>
          </div>

          <div class="dupe-store-links">
            <a href="${myntraUrl}" target="_blank" rel="noopener noreferrer" class="store-btn store-myntra" title="Search on Myntra">
              <i class="fas fa-shopping-bag"></i> Myntra
            </a>
            <a href="${ajioUrl}" target="_blank" rel="noopener noreferrer" class="store-btn store-ajio" title="Search on Ajio">
              <i class="fas fa-tag"></i> Ajio
            </a>
            <a href="${amazonUrl}" target="_blank" rel="noopener noreferrer" class="store-btn store-amazon" title="Search on Amazon India">
              <i class="fab fa-amazon"></i> Amazon
            </a>
            <a href="${flipkartUrl}" target="_blank" rel="noopener noreferrer" class="store-btn store-flipkart" title="Search on Flipkart">
              <i class="fas fa-bolt"></i> Flipkart
            </a>
          </div>
        `;
        capsulePiecesGrid.appendChild(card);
      });
    }

    // C. Tab 2: Day-by-Day Outfit Matrix
    if (itineraryMatrixGrid) {
      itineraryMatrixGrid.innerHTML = "";
      const itinerary = data.itinerary_outfits || [];
      
      itinerary.forEach((day) => {
        const dayCard = document.createElement("div");
        dayCard.className = "itinerary-day-card";

        const dayFit = day.daytime_fit || {};
        const eveFit = day.evening_fit || {};

        const renderPiecePills = (arr) => {
          if (!arr || !Array.isArray(arr)) return "";
          return arr.map(pid => `<span class="fit-piece-pill">${escapeHtml(pid)}</span>`).join("");
        };

        dayCard.innerHTML = `
          <div class="itinerary-day-header">
            <h4>${escapeHtml(day.day_title || `Day ${day.day_number}`)}</h4>
            <span class="day-badge-num">Day ${day.day_number || ''}</span>
          </div>

          <div class="itinerary-fits-grid">
            <div class="fit-block daytime">
              <div class="fit-header-row">
                <span class="fit-label"><i class="fas fa-sun"></i> Daytime Outfit</span>
              </div>
              <h5 class="fit-name">${escapeHtml(dayFit.title || 'Day Exploration')}</h5>
              <div class="fit-pieces-badges">
                ${renderPiecePills(dayFit.pieces_used)}
              </div>
              <p class="fit-tip">${escapeHtml(dayFit.styling_tip || '')}</p>
            </div>

            <div class="fit-block evening">
              <div class="fit-header-row">
                <span class="fit-label"><i class="fas fa-moon"></i> Evening Transition</span>
              </div>
              <h5 class="fit-name">${escapeHtml(eveFit.title || 'Night Dining')}</h5>
              <div class="fit-pieces-badges">
                ${renderPiecePills(eveFit.pieces_used)}
              </div>
              <p class="fit-tip">${escapeHtml(eveFit.transition_trick || eveFit.styling_tip || '')}</p>
            </div>
          </div>
        `;
        itineraryMatrixGrid.appendChild(dayCard);
      });
    }

    // D. Tab 3: Interactive Packing Checklist
    const checklist = data.smart_checklist || {};
    populateChecklist(checklistClothing, checklist.clothing || []);
    populateChecklist(checklistToiletries, checklist.toiletries_grooming || []);
    populateChecklist(checklistTech, checklist.travel_gear_tech || []);
    populateChecklist(checklistClimate, checklist.climate_essentials || []);

    // E. Tab 4: Jetsetter Hacks
    if (capsuleHacksGrid) {
      capsuleHacksGrid.innerHTML = "";
      const hacks = data.pro_packing_hacks || [];
      hacks.forEach(h => {
        const hCard = document.createElement("div");
        hCard.className = "hack-card";
        hCard.innerHTML = `
          <div class="hack-icon"><i class="fas fa-magic"></i></div>
          <p>${escapeHtml(h)}</p>
        `;
        capsuleHacksGrid.appendChild(hCard);
      });
    }

    // Reset tabs to first tab
    capsuleTabNavBtns.forEach((b, idx) => {
      b.classList.toggle("active", idx === 0);
    });
    capsuleTabContents.forEach((c, idx) => {
      c.style.display = idx === 0 ? "block" : "none";
    });
  }

  // Checklist helper with interactive toggles
  function populateChecklist(container, items) {
    if (!container) return;
    container.innerHTML = "";
    items.forEach((itemText) => {
      const li = document.createElement("li");
      li.className = "checklist-item";

      const cb = document.createElement("input");
      cb.type = "checkbox";

      const span = document.createElement("span");
      span.textContent = itemText;

      li.appendChild(cb);
      li.appendChild(span);

      li.addEventListener("click", (e) => {
        if (e.target !== cb) {
          cb.checked = !cb.checked;
        }
        li.classList.toggle("checked", cb.checked);
      });

      container.appendChild(li);
    });
  }

  // 5. Capsule Tabs Switching
  capsuleTabNavBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      capsuleTabNavBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      capsuleTabContents.forEach((content) => {
        content.style.display = content.id === targetId ? "block" : "none";
      });
    });
  });

  // 6. Copy Full Travel Capsule Plan
  if (btnCopyCapsule) {
    btnCopyCapsule.addEventListener("click", () => {
      if (!currentCapsuleData) return;

      let text = `🧳 Pic2Style Travel Capsule: ${currentCapsuleData.destination_display || 'Trip'}\n`;
      text += `🌤️ Climate: ${currentCapsuleData.climate_badge?.temp || ''} (${currentCapsuleData.climate_badge?.condition || ''})\n`;
      text += `🎒 Luggage Limit: ${currentCapsuleData.luggage_strategy?.recommended_bag || 'Carry-on'} (~${currentCapsuleData.luggage_strategy?.estimated_weight || '5.5kg'})\n`;
      text += `✈️ Transit Look: ${currentCapsuleData.luggage_strategy?.transit_outfit || ''}\n\n`;

      text += `📦 CORE CAPSULE PIECES:\n`;
      (currentCapsuleData.core_pieces || []).forEach((p) => {
        text += `• [${p.id}] ${p.name} (${p.color_name}, ${p.fabric}) - ${p.versatility_tag}\n`;
      });

      text += `\n📅 DAY-TO-NIGHT ITINERARY OUTFITS:\n`;
      (currentCapsuleData.itinerary_outfits || []).forEach((d) => {
        text += `\n${d.day_title}:\n`;
        text += `  ☀️ Day: ${d.daytime_fit?.title} [Pieces: ${(d.daytime_fit?.pieces_used || []).join(', ')}] - ${d.daytime_fit?.styling_tip}\n`;
        text += `  🌙 Night: ${d.evening_fit?.title} [Pieces: ${(d.evening_fit?.pieces_used || []).join(', ')}] - ${d.evening_fit?.transition_trick || ''}\n`;
      });

      text += `\n💡 Top Jetsetter Packing Tip: ${(currentCapsuleData.pro_packing_hacks && currentCapsuleData.pro_packing_hacks[0]) || ''}\n`;
      text += `\nGenerated with Pic2Style Travel Capsule (pic2style.ai) 👗`;

      navigator.clipboard.writeText(text).then(() => {
        if (capsuleCopyToast) {
          capsuleCopyToast.style.display = "block";
          setTimeout(() => {
            capsuleCopyToast.style.display = "none";
          }, 4000);
        }
      }).catch(err => {
        console.error("Could not copy capsule text:", err);
      });
    });
  }

  // 7. Print / Save as PDF
  if (btnCapsulePrint) {
    btnCapsulePrint.addEventListener("click", () => {
      // Temporarily reveal all tab contents for print
      capsuleTabContents.forEach((c) => c.style.display = "block");
      window.print();
      // Restore active tab
      const activeBtn = document.querySelector(".capsule-tab-nav-btn.active");
      const activeTarget = activeBtn ? activeBtn.getAttribute("data-target") : "tab-core-pieces";
      capsuleTabContents.forEach((c) => {
        c.style.display = c.id === activeTarget ? "block" : "none";
      });
    });
  }

  // 8. Plan Another Trip
  if (btnCapsuleAnother) {
    btnCapsuleAnother.addEventListener("click", () => {
      if (capsuleForm) capsuleForm.reset();
      if (capsuleResults) capsuleResults.style.display = "none";
      if (capsuleSection) capsuleSection.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // Utility HTML Escape helper
  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

});