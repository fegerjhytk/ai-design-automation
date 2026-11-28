const DEFAULT_BRIDGE_URL = "http://127.0.0.1:4815";

let capturedTab = null;
let activeMainTab = "antigravity";
let isBusy = false;
let toastTimer = null;

const TOOL_SCHEMAS = {
  brand_anti_sameness_audit: {
    desc: "Deconstructs category clichés and generates counter-anchor pigments and negative prompts.",
    fields: [
      { key: "category", label: "Category", type: "text", default: "matcha" },
      { key: "brand_name", label: "Brand Name", type: "text", default: "" },
      { key: "audience", label: "Target Audience", type: "text", default: "" }
    ]
  },
  audit_typographic_kerning: {
    desc: "Scans display wordmarks for diagonal/counter optical traps and outputs Illustrator tracking deltas.",
    fields: [
      { key: "wordmark", label: "Wordmark", type: "text", default: "MIRAI" },
      { key: "font_name", label: "Font Name", type: "text", default: "IvyPrestoDisplay-SemiBold" }
    ]
  },
  motion_sync_timeline: {
    desc: "Calculates BPM-quantized word timing and returns HyperFrames GSAP + After Effects ExtendScript.",
    fields: [
      { key: "text", label: "Headline Text", type: "text", default: "HOW TO DESIGN A BRAND" },
      {
        row: [
          { key: "bpm", label: "BPM", type: "number", default: "120" },
          { key: "duration_seconds", label: "Duration (s)", type: "number", default: "5" }
        ]
      },
      {
        key: "easing",
        label: "Easing Curve",
        type: "select",
        options: ["power3.out", "power4.out", "expo.out", "back.out(1.4)"],
        default: "power3.out"
      }
    ]
  },
  stage_environmental_mockup: {
    desc: "Builds a Nano Banana 2.1 packaging staging prompt calibrated for retail shelf or harsh daylight.",
    fields: [
      { key: "brand_name", label: "Brand Name", type: "text", default: "MIRAI" },
      { key: "container_type", label: "Container", type: "text", default: "cylindrical matte tin can with chrome lid" },
      { key: "primary_color", label: "Primary Color", type: "color-text", default: "#4A0E17" },
      {
        row: [
          { key: "lighting_preset", label: "Lighting", type: "select", options: ["retail_shelf", "direct_daylight", "moody_ambient"], default: "retail_shelf" },
          { key: "aspect_ratio", label: "Aspect Ratio", type: "select", options: ["16:9", "9:16", "1:1", "4:3", "3:4"], default: "16:9" }
        ]
      }
    ]
  },
  illustrator_build_identity: {
    desc: "Executes typography-only wordmark construction in Illustrator with Secondary Seals separation.",
    fields: [
      {
        row: [
          { key: "project_name", label: "Project Name", type: "text", default: "MiraiIdentity" },
          { key: "wordmark", label: "Wordmark", type: "text", default: "MIRAI" }
        ]
      },
      {
        row: [
          { key: "font_name", label: "Font Name", type: "text", default: "IvyPrestoDisplay-SemiBold" },
          { key: "tracking", label: "Tracking", type: "number", default: "-25" }
        ]
      },
      { key: "primary_color_hex", label: "Primary Color", type: "color-text", default: "#4A0E17" },
      { key: "secondary_seal_name", label: "Secondary Seal Label", type: "text", default: "BonsaiSeal" }
    ]
  },
  codex_review_dispatch: {
    desc: "Generates a strict Brand Director anti-cliché critique rubric and /ask-codex command.",
    fields: [
      { key: "image_path", label: "Render / Export Path", type: "text", default: "/Users/admin/Downloads/concept.png" },
      { key: "category", label: "Category", type: "text", default: "matcha" }
    ]
  },
  design_workflow_run_action: {
    desc: "Invokes pipeline_runner.js deterministically against Illustrator, Photoshop, or After Effects.",
    fields: [
      {
        key: "action",
        label: "Pipeline Action",
        type: "select",
        options: ["ps-status", "ae-status", "ai-video-status", "chrome-status", "audit", "cleanup", "fit", "qc", "qc-markers", "export"],
        default: "ae-status"
      },
      { key: "project", label: "Project Folder (optional)", type: "text", default: "" }
    ]
  },
  design_workflow_preflight: {
    desc: "Runs local verification suites (core_engine unit tests or Illustrator QC checks).",
    fields: [
      { key: "mode", label: "Mode", type: "select", options: ["core_engine_tests", "illustrator_qc"], default: "core_engine_tests" }
    ]
  },
  design_workflow_status: {
    desc: "Inspects installed Adobe Creative Cloud apps, live processes, global symlinks, and skill packs.",
    fields: []
  }
};

function $(id) {
  return document.getElementById(id);
}

function el(tag, className = "", text = null) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== null && text !== undefined) node.textContent = String(text);
  return node;
}

function showToast(message) {
  const pill = $("toast-pill");
  if (!pill) return;
  pill.textContent = message;
  pill.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    pill.classList.add("hidden");
  }, 2000);
}

async function copyText(text, label = "Copied to clipboard", triggerBtn = null) {
  const value = String(text ?? "");
  await navigator.clipboard.writeText(value);
  showToast(label);
  if (triggerBtn) {
    const prev = triggerBtn.textContent;
    triggerBtn.textContent = "Copied!";
    setTimeout(() => {
      triggerBtn.textContent = prev;
    }, 1500);
  }
}

async function getConfig() {
  const stored = await chrome.storage.local.get(["bridgeUrl", "bridgeToken", "activeTab", "lastConvoId"]);
  return {
    bridgeUrl: (stored.bridgeUrl || DEFAULT_BRIDGE_URL).replace(/\/+$/, ""),
    bridgeToken: stored.bridgeToken || "",
    activeTab: stored.activeTab === "tools" ? "tools" : "antigravity",
    lastConvoId: stored.lastConvoId || ""
  };
}

async function bridgeFetch(pathname, options = {}) {
  const { bridgeUrl, bridgeToken } = await getConfig();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  if (bridgeToken) {
    headers["X-Bridge-Token"] = bridgeToken;
  }

  const res = await fetch(`${bridgeUrl}${pathname}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

function updateAppPills(adobe = null) {
  const mapping = [
    ["pill-ai", adobe?.illustrator, "Illustrator"],
    ["pill-ae", adobe?.after_effects, "After Effects"],
    ["pill-ps", adobe?.photoshop, "Photoshop"],
    ["pill-id", adobe?.indesign, "InDesign"]
  ];
  for (const [id, info, label] of mapping) {
    const pill = $(id);
    if (!pill) continue;
    const isRunning = Boolean(info?.running);
    const isInstalled = info ? Boolean(info.installed) : null;
    pill.classList.toggle("running", isRunning);
    if (!info) {
      pill.title = `${label}: Bridge status unavailable`;
    } else if (isRunning) {
      pill.title = `${label}: Running`;
    } else if (isInstalled) {
      pill.title = `${label}: Installed (Idle)`;
    } else {
      pill.title = `${label}: Not detected`;
    }
  }
}

async function refreshStatus() {
  const refreshBtn = $("refresh-status-btn");
  const bridgePill = $("pill-bridge");
  const bridgeText = $("pill-bridge-text");
  const settingsDot = $("settings-badge");

  refreshBtn.classList.add("spinning");
  try {
    await bridgeFetch("/health");
    const { bridgeToken } = await getConfig();
    if (!bridgeToken) {
      bridgePill.className = "status-chip warn";
      bridgeText.textContent = "Bridge Online · Set Token";
      settingsDot.classList.remove("hidden");
      updateAppPills(null);
      return;
    }

    settingsDot.classList.add("hidden");
    const status = await bridgeFetch("/status");
    const adobe = status.adobe_and_browser || {};
    updateAppPills(adobe);

    const openCount = ["illustrator", "after_effects", "photoshop", "indesign"].filter(
      (k) => adobe[k]?.running
    ).length;
    bridgePill.className = "status-chip online";
    bridgeText.textContent = openCount > 0 ? `Bridge Live · ${openCount} Open` : "Bridge Live";
  } catch (err) {
    bridgePill.className = "status-chip offline";
    bridgeText.textContent = `Bridge Offline`;
    bridgePill.title = err.message;
    updateAppPills(null);
  } finally {
    refreshBtn.classList.remove("spinning");
  }
}

function toggleSettingsDrawer(forceOpen = null) {
  const drawer = $("settings-drawer");
  const toggleBtn = $("toggle-settings-btn");
  const shouldOpen = forceOpen === null ? drawer.classList.contains("hidden") : Boolean(forceOpen);
  drawer.classList.toggle("hidden", !shouldOpen);
  toggleBtn.setAttribute("aria-expanded", String(shouldOpen));
}

function updateAttachSummary() {
  const summaryEl = $("agy-attach-summary");
  if (!capturedTab) {
    summaryEl.textContent = "No tab captured yet";
    return;
  }
  const selectedCount = capturedTab.selectedImages ? capturedTab.selectedImages.size : 0;
  const totalCount = capturedTab.images ? capturedTab.images.length : 0;
  const parts = [];
  if (capturedTab.url) parts.push("Page URL");
  if (capturedTab.selection) parts.push(`Selection (${capturedTab.selection.length} chars)`);
  if (totalCount > 0) parts.push(`${selectedCount}/${totalCount} imgs`);
  summaryEl.textContent = parts.length ? parts.join(" · ") : "Page title attached";
}

function renderTabPreview() {
  const container = $("tab-preview");
  const domainPill = $("tab-domain-pill");
  container.innerHTML = "";

  if (!capturedTab) {
    domainPill.classList.add("hidden");
    container.appendChild(
      el("p", "empty-state", "Capture current page URL, highlighted brief, and visual references.")
    );
    updateAttachSummary();
    return;
  }

  let hostname = "";
  try {
    hostname = capturedTab.url ? new URL(capturedTab.url).hostname.replace(/^www\./, "") : "";
  } catch {
    hostname = "";
  }
  if (hostname) {
    domainPill.textContent = hostname;
    domainPill.classList.remove("hidden");
  } else {
    domainPill.classList.add("hidden");
  }

  // Row: Favicon + Title + URL
  const summaryRow = el("div", "tab-summary-row");
  if (capturedTab.favIconUrl && /^https?:\/\//i.test(capturedTab.favIconUrl)) {
    const fav = document.createElement("img");
    fav.className = "tab-favicon";
    fav.src = capturedTab.favIconUrl;
    fav.alt = "";
    fav.addEventListener("error", () => fav.remove());
    summaryRow.appendChild(fav);
  }
  const meta = el("div", "tab-meta");
  meta.appendChild(el("p", "tab-title", capturedTab.title || "Untitled Tab"));
  meta.appendChild(el("p", "tab-url", capturedTab.url || "Local / Internal page"));
  summaryRow.appendChild(meta);
  container.appendChild(summaryRow);

  // Highlighted selection excerpt
  if (capturedTab.selection) {
    const excerpt =
      capturedTab.selection.length > 220
        ? `${capturedTab.selection.slice(0, 220)}…`
        : capturedTab.selection;
    const quote = el("div", "selection-quote", `“${excerpt}”`);
    quote.title = capturedTab.selection;
    container.appendChild(quote);
  }

  // Visual thumbnail grid
  if (Array.isArray(capturedTab.images) && capturedTab.images.length > 0) {
    const section = el("div", "thumb-section");
    const bar = el("div", "thumb-bar");
    const countLabel = el(
      "span",
      "meta-text",
      `${capturedTab.selectedImages.size} of ${capturedTab.images.length} images selected`
    );
    const controls = el("div", "head-right");
    const allBtn = el("button", "micro-btn", "All");
    allBtn.type = "button";
    const noneBtn = el("button", "micro-btn", "None");
    noneBtn.type = "button";

    allBtn.addEventListener("click", () => {
      capturedTab.images.forEach((u) => capturedTab.selectedImages.add(u));
      renderTabPreview();
    });
    noneBtn.addEventListener("click", () => {
      capturedTab.selectedImages.clear();
      renderTabPreview();
    });

    controls.appendChild(allBtn);
    controls.appendChild(noneBtn);
    bar.appendChild(countLabel);
    bar.appendChild(controls);
    section.appendChild(bar);

    const grid = el("div", "thumb-grid");
    capturedTab.images.forEach((imgUrl, idx) => {
      const btn = el("button", `thumb-item${capturedTab.selectedImages.has(imgUrl) ? " selected" : ""}`);
      btn.type = "button";
      btn.title = `Toggle reference image #${idx + 1}`;
      btn.setAttribute("aria-pressed", String(capturedTab.selectedImages.has(imgUrl)));

      const img = document.createElement("img");
      img.src = imgUrl;
      img.alt = `Captured page visual ${idx + 1}`;
      img.loading = "lazy";
      img.addEventListener("error", () => {
        capturedTab.selectedImages.delete(imgUrl);
        btn.remove();
        countLabel.textContent = `${capturedTab.selectedImages.size} of ${grid.children.length} images selected`;
        updateAttachSummary();
      });

      const check = el("span", "thumb-check", "✓");
      btn.appendChild(img);
      btn.appendChild(check);

      btn.addEventListener("click", () => {
        if (capturedTab.selectedImages.has(imgUrl)) {
          capturedTab.selectedImages.delete(imgUrl);
        } else {
          capturedTab.selectedImages.add(imgUrl);
        }
        renderTabPreview();
      });

      grid.appendChild(btn);
    });

    section.appendChild(grid);
    container.appendChild(section);
  }

  updateAttachSummary();
}

async function captureActiveTab() {
  const captureBtn = $("capture-tab-btn");
  captureBtn.disabled = true;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      showToast("No active tab found");
      return;
    }

    let selection = "";
    let images = [];
    if (tab.url && /^https?:\/\//i.test(tab.url)) {
      const injected = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const sel = window.getSelection ? window.getSelection().toString() : "";
          const imgs = Array.from(document.querySelectorAll("img"))
            .filter((img) => !(img.complete && img.naturalWidth > 0 && img.naturalWidth < 36 && img.naturalHeight < 36))
            .map((img) => img.currentSrc || img.src)
            .filter((src) => typeof src === "string" && /^https?:\/\//i.test(src));
          return {
            selection: sel.trim().slice(0, 4000),
            images: Array.from(new Set(imgs)).slice(0, 12)
          };
        }
      });
      const result = injected?.[0]?.result;
      if (result) {
        selection = result.selection || "";
        images = result.images || [];
      }
    }

    capturedTab = {
      title: tab.title || "",
      url: tab.url || "",
      favIconUrl: tab.favIconUrl || "",
      selection,
      images,
      selectedImages: new Set(images.slice(0, 8))
    };

    renderTabPreview();
    showToast(images.length ? `Captured ${images.length} images` : "Tab captured");
  } catch (err) {
    showToast(`Capture failed: ${err.message}`);
  } finally {
    captureBtn.disabled = false;
  }
}

function createToolControl(field) {
  const wrap = el("div", "field-group");
  const label = el("label", "field-label", field.label);
  label.setAttribute("for", `tf-${field.key}`);
  wrap.appendChild(label);

  if (field.type === "select") {
    const select = document.createElement("select");
    select.id = `tf-${field.key}`;
    select.dataset.key = field.key;
    select.dataset.type = "select";
    for (const optVal of field.options) {
      const opt = el("option", "", optVal);
      opt.value = optVal;
      if (optVal === field.default) opt.selected = true;
      select.appendChild(opt);
    }
    wrap.appendChild(select);
    return wrap;
  }

  if (field.type === "color-text") {
    const row = el("div", "color-input-wrap");
    const picker = document.createElement("input");
    picker.type = "color";
    picker.className = "color-swatch-picker";
    picker.value = /^#[0-9a-f]{6}$/i.test(field.default || "") ? field.default : "#0d99ff";
    picker.setAttribute("aria-label", `${field.label} color picker`);

    const input = document.createElement("input");
    input.type = "text";
    input.id = `tf-${field.key}`;
    input.dataset.key = field.key;
    input.dataset.type = "text";
    input.value = field.default || "";

    picker.addEventListener("input", () => {
      input.value = picker.value.toUpperCase();
    });
    input.addEventListener("input", () => {
      const val = input.value.trim();
      if (/^#[0-9a-f]{6}$/i.test(val)) {
        picker.value = val;
      }
    });

    row.appendChild(picker);
    row.appendChild(input);
    wrap.appendChild(row);
    return wrap;
  }

  const input = document.createElement("input");
  input.type = field.type || "text";
  input.id = `tf-${field.key}`;
  input.dataset.key = field.key;
  input.dataset.type = field.type || "text";
  input.value = field.default || "";
  wrap.appendChild(input);
  return wrap;
}

function renderToolFields() {
  const toolKey = $("tool-select").value;
  const schema = TOOL_SCHEMAS[toolKey] || { desc: "", fields: [] };
  $("tool-desc").textContent = schema.desc || "";

  const container = $("tool-fields");
  container.innerHTML = "";

  for (const entry of schema.fields) {
    if (Array.isArray(entry.row)) {
      const grid = el("div", "grid-2");
      for (const subField of entry.row) {
        grid.appendChild(createToolControl(subField));
      }
      container.appendChild(grid);
    } else {
      container.appendChild(createToolControl(entry));
    }
  }
}

function collectToolArgs() {
  const args = {};
  const inputs = $("tool-fields").querySelectorAll("input[data-key], select[data-key]");
  for (const inp of inputs) {
    const val = inp.value.trim();
    if (val === "") continue;
    args[inp.dataset.key] = inp.dataset.type === "number" ? Number(val) : val;
  }
  return args;
}

function parseHexSwatch(raw) {
  const str = String(raw || "");
  const match = str.match(/^(#[0-9a-fA-F]{3,8})\s*(?:\(([^)]+)\))?/);
  if (!match) return { hex: "#555555", label: str };
  return { hex: match[1], label: match[2] || match[1] };
}

function makeRichBlock(labelText, copyPayload = null) {
  const block = el("div", "rich-block");
  const head = el("div", "rich-label");
  head.appendChild(el("span", "", labelText));
  if (copyPayload !== null) {
    const btn = el("button", "micro-btn", "Copy");
    btn.type = "button";
    btn.addEventListener("click", () => copyText(copyPayload, `Copied ${labelText}`, btn));
    head.appendChild(btn);
  }
  block.appendChild(head);
  return block;
}

function renderAntiSamenessResult(res) {
  const frag = document.createDocumentFragment();
  const anchor = res.recommended_counter_anchor || {};
  const cliches = res.cliches_to_avoid || {};

  // Profile & Insight
  const metaBlock = makeRichBlock(`Counter-Anchor · ${res.matched_profile || res.category || "Brand"}`);
  metaBlock.appendChild(el("p", "rich-copy-p", anchor.origin_insight || ""));
  if (anchor.recommended_typography) {
    const typeNote = el("p", "rich-copy-p", `Type: ${anchor.recommended_typography}`);
    typeNote.style.marginTop = "6px";
    metaBlock.appendChild(typeNote);
  }
  frag.appendChild(metaBlock);

  // Pigment Swatches
  if (Array.isArray(anchor.pigment_palette) && anchor.pigment_palette.length > 0) {
    const swBlock = makeRichBlock("Recommended Pigments (click to copy hex)");
    const grid = el("div", "swatch-grid");
    for (const item of anchor.pigment_palette) {
      const { hex, label } = parseHexSwatch(item);
      const chip = el("button", "swatch-chip");
      chip.type = "button";
      const box = el("span", "swatch-color");
      box.style.background = hex;
      chip.appendChild(box);
      chip.appendChild(el("span", "swatch-hex", hex));
      chip.appendChild(el("span", "swatch-name", label));
      chip.addEventListener("click", () => copyText(hex, `Copied ${hex}`));
      grid.appendChild(chip);
    }
    swBlock.appendChild(grid);
    frag.appendChild(swBlock);
  }

  // Avoid Cliché Words & Symbols
  const avoidTags = [...(cliches.banned_words || []), ...(cliches.symbols || [])];
  if (avoidTags.length > 0) {
    const avoidBlock = makeRichBlock("Clichés & Banned Copy to Avoid");
    const cloud = el("div", "tag-cloud");
    for (const tag of avoidTags) {
      cloud.appendChild(el("span", "tag-pill avoid", tag));
    }
    avoidBlock.appendChild(cloud);
    frag.appendChild(avoidBlock);
  }

  // Copyable Negative Prompt
  if (res.negative_prompt_injection) {
    const negBlock = makeRichBlock("Negative Prompt Injection", res.negative_prompt_injection);
    negBlock.appendChild(el("p", "rich-copy-p", res.negative_prompt_injection));
    frag.appendChild(negBlock);
  }

  return frag;
}

function renderKerningResult(res) {
  const frag = document.createDocumentFragment();
  const strip = el("div", "metric-strip");
  const metrics = [
    [res.wordmark || "-", "Wordmark"],
    [String(res.traps_detected ?? 0), "Optical Traps"],
    [`${res.recommended_global_tracking ?? 0}`, "Global Tracking"]
  ];
  for (const [val, key] of metrics) {
    const box = el("div", "metric-box");
    box.appendChild(el("span", "metric-val", val));
    box.appendChild(el("span", "metric-key", key));
    strip.appendChild(box);
  }
  frag.appendChild(strip);

  const findingsBlock = makeRichBlock(
    res.findings?.length ? "Detected Kerning Pairs" : "Pair Scan"
  );
  if (Array.isArray(res.findings) && res.findings.length > 0) {
    for (const f of res.findings) {
      const row = el("div", "finding-row");
      const head = el("div", "finding-head");
      head.appendChild(el("span", "pair-token", `${f.pair} (${f.tracking_delta})`));
      const sevClass =
        f.severity === "critical" ? "sev-critical" : f.severity === "high" ? "sev-high" : "sev-medium";
      head.appendChild(el("span", `sev-pill ${sevClass}`, f.severity || "medium"));
      row.appendChild(head);
      row.appendChild(el("p", "rich-copy-p", f.reason || ""));
      findingsBlock.appendChild(row);
    }
  } else {
    findingsBlock.appendChild(el("p", "rich-copy-p", "No high-risk diagonal trap pairs detected."));
  }
  frag.appendChild(findingsBlock);

  if (res.extendscript_snippet) {
    const codeBlock = makeRichBlock("Illustrator ExtendScript", res.extendscript_snippet);
    codeBlock.appendChild(el("pre", "code-pre", res.extendscript_snippet));
    frag.appendChild(codeBlock);
  }

  return frag;
}

function renderMotionSyncResult(res) {
  const frag = document.createDocumentFragment();
  const strip = el("div", "metric-strip");
  for (const [val, key] of [
    [String(res.total_words ?? 0), "Words"],
    [String(res.bpm ?? "-"), "BPM"],
    [`${res.recommended_framerate ?? 50} fps`, "Rate"],
    [`${res.duration_s ?? 0}s`, "Duration"]
  ]) {
    const box = el("div", "metric-box");
    box.appendChild(el("span", "metric-val", val));
    box.appendChild(el("span", "metric-key", key));
    strip.appendChild(box);
  }
  frag.appendChild(strip);

  if (Array.isArray(res.gsap_timeline_schedule) && res.gsap_timeline_schedule.length > 0) {
    const tlBlock = makeRichBlock("Quantized Word Schedule");
    const list = el("div", "timeline-list");
    for (const kf of res.gsap_timeline_schedule) {
      const row = el("div", "timeline-row");
      row.appendChild(el("span", "timeline-word", `${kf.index + 1}. ${kf.word}`));
      row.appendChild(
        el("span", "timeline-time", `${Number(kf.start_time_s).toFixed(2)}s → ${Number(kf.end_time_s).toFixed(2)}s`)
      );
      list.appendChild(row);
    }
    tlBlock.appendChild(list);
    frag.appendChild(tlBlock);
  }

  // Switchable After Effects JSX vs HyperFrames GSAP preview
  const jsxCode = res.after_effects_jsx || "";
  const gsapCode = (res.hyperframes_code_snippet || "").trim();
  if (jsxCode || gsapCode) {
    let activeCodeMode = jsxCode ? "jsx" : "gsap";
    const block = el("div", "rich-block");
    const head = el("div", "rich-label");
    const tabGroup = el("div", "code-tabs");
    const jsxBtn = el("button", `micro-btn`, "AE JSX");
    const gsapBtn = el("button", `micro-btn`, "HyperFrames GSAP");
    const copyBtn = el("button", "micro-btn", "Copy Code");
    jsxBtn.type = "button";
    gsapBtn.type = "button";
    copyBtn.type = "button";

    const pre = el("pre", "code-pre", activeCodeMode === "jsx" ? jsxCode : gsapCode);

    const syncButtons = () => {
      jsxBtn.style.color = activeCodeMode === "jsx" ? "#fff" : "";
      jsxBtn.style.background = activeCodeMode === "jsx" ? "var(--accent-soft)" : "";
      gsapBtn.style.color = activeCodeMode === "gsap" ? "#fff" : "";
      gsapBtn.style.background = activeCodeMode === "gsap" ? "var(--accent-soft)" : "";
      pre.textContent = activeCodeMode === "jsx" ? jsxCode : gsapCode;
    };

    if (jsxCode) tabGroup.appendChild(jsxBtn);
    if (gsapCode) tabGroup.appendChild(gsapBtn);
    jsxBtn.addEventListener("click", () => {
      activeCodeMode = "jsx";
      syncButtons();
    });
    gsapBtn.addEventListener("click", () => {
      activeCodeMode = "gsap";
      syncButtons();
    });
    copyBtn.addEventListener("click", () =>
      copyText(pre.textContent, `Copied ${activeCodeMode.toUpperCase()}`, copyBtn)
    );

    head.appendChild(tabGroup);
    head.appendChild(copyBtn);
    block.appendChild(head);
    block.appendChild(pre);
    syncButtons();
    frag.appendChild(block);
  }

  return frag;
}

function renderStageResult(res) {
  const frag = document.createDocumentFragment();
  const payloadArgs = res.flow_tool_call_payload?.arguments || {};
  const strip = el("div", "metric-strip");
  for (const [val, key] of [
    [res.recommended_model || "Nano Banana 2.1", "Model"],
    [res.aspect_ratio || payloadArgs.aspectRatio || "16:9", "Ratio"],
    [res.lighting_preset || "-", "Lighting"]
  ]) {
    const box = el("div", "metric-box");
    box.appendChild(el("span", "metric-val", val));
    box.appendChild(el("span", "metric-key", key));
    strip.appendChild(box);
  }
  frag.appendChild(strip);

  if (payloadArgs.prompt) {
    const promptBlock = makeRichBlock("Directorial Prompt", payloadArgs.prompt);
    promptBlock.appendChild(el("p", "rich-copy-p", payloadArgs.prompt));
    frag.appendChild(promptBlock);
  }

  if (res.verification_intent) {
    const intentBlock = makeRichBlock("Verification Intent");
    intentBlock.appendChild(el("p", "rich-copy-p", res.verification_intent));
    frag.appendChild(intentBlock);
  }

  return frag;
}

function renderStatusResult(st) {
  const frag = document.createDocumentFragment();
  const adobe = st.adobe_and_browser || {};
  const block = makeRichBlock("Adobe & Browser Apps");
  const grid = el("div", "metric-strip");
  for (const [key, label] of [
    ["illustrator", "Illustrator"],
    ["after_effects", "After Effects"],
    ["photoshop", "Photoshop"],
    ["indesign", "InDesign"],
    ["chrome", "Chrome"]
  ]) {
    const item = adobe[key] || {};
    const box = el("div", "metric-box");
    const statusText = item.running ? "Running" : item.installed ? "Idle" : "Inactive";
    box.appendChild(el("span", "metric-val", statusText));
    box.appendChild(el("span", "metric-key", label));
    grid.appendChild(box);
  }
  block.appendChild(grid);
  frag.appendChild(block);

  if (st.global_symlinks) {
    const symBlock = makeRichBlock("Workspace Health");
    const linkedOk = st.global_symlinks.plugin_linked && st.global_symlinks.master_skill_linked;
    symBlock.appendChild(
      el(
        "p",
        "rich-copy-p",
        linkedOk ? "Plugin & Master Skill symlinks verified." : "Check plugin/master skill symlinks."
      )
    );
    frag.appendChild(symBlock);
  }
  return frag;
}

function renderAntigravityResult(res) {
  const frag = document.createDocumentFragment();
  const convoId = res.data?.conversationId || res.data?.conversation_id;

  const summary = makeRichBlock(`Dispatched (${res.mode || "new-conversation"})`);
  if (convoId) {
    const row = el("div", "finding-head");
    row.appendChild(el("span", "rich-copy-p", `Thread: ${convoId}`));
    const actions = el("div", "head-right");
    const useBtn = el("button", "micro-btn", "Reply Here");
    useBtn.type = "button";
    useBtn.addEventListener("click", async () => {
      $("agy-mode").value = "send-message";
      $("agy-convo-wrap").classList.remove("hidden");
      $("agy-convo-id").value = convoId;
      await chrome.storage.local.set({ lastConvoId: convoId });
      showToast("Thread ID targeted for follow-up");
    });
    const copyIdBtn = el("button", "micro-btn", "Copy ID");
    copyIdBtn.type = "button";
    copyIdBtn.addEventListener("click", () => copyText(convoId, "Copied Conversation ID", copyIdBtn));
    actions.appendChild(useBtn);
    actions.appendChild(copyIdBtn);
    row.appendChild(actions);
    summary.appendChild(row);
  } else {
    summary.appendChild(el("p", "rich-copy-p", "Task delivered to Antigravity."));
  }
  frag.appendChild(summary);

  if (res.stdout) {
    const outBlock = makeRichBlock("Agent CLI Output", res.stdout);
    outBlock.appendChild(el("pre", "code-pre", res.stdout));
    frag.appendChild(outBlock);
  }
  return frag;
}

function renderOutput(title, payload, isError = false) {
  const card = $("output-card");
  const rich = $("output-rich");
  const badge = $("output-badge");
  const heading = $("output-title");
  const rawPre = $("output-log");

  card.classList.remove("hidden");
  heading.textContent = title;
  rawPre.textContent = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
  rich.innerHTML = "";

  const inner = payload?.result ?? payload;
  const effectiveError = isError || inner?.status === "error";
  badge.className = `result-badge ${effectiveError ? "err" : "ok"}`;
  badge.textContent = effectiveError ? "ERR" : "OK";

  if (effectiveError) {
    const errText =
      typeof payload === "string"
        ? payload
        : inner?.stderr || inner?.error || inner?.stdout || payload?.error || "Request failed";
    const errBlock = makeRichBlock("Error Details", errText);
    errBlock.appendChild(el("p", "rich-copy-p", errText));
    rich.appendChild(errBlock);
    if (inner?.stdout && inner?.stderr) {
      const outBlock = makeRichBlock("Stdout", inner.stdout);
      outBlock.appendChild(el("pre", "code-pre", inner.stdout));
      rich.appendChild(outBlock);
    }
    card.scrollIntoView({ behavior: "smooth", block: "nearest" });
    return;
  }
  if (inner?.cliches_to_avoid && inner?.recommended_counter_anchor) {
    rich.appendChild(renderAntiSamenessResult(inner));
  } else if (typeof inner?.traps_detected === "number") {
    rich.appendChild(renderKerningResult(inner));
  } else if (Array.isArray(inner?.gsap_timeline_schedule)) {
    rich.appendChild(renderMotionSyncResult(inner));
  } else if (inner?.flow_tool_call_payload) {
    rich.appendChild(renderStageResult(inner));
  } else if (inner?.codex_system_rubric) {
    const block = makeRichBlock("Suggested Slash Command", inner.suggested_slash_command);
    block.appendChild(el("pre", "code-pre", inner.suggested_slash_command));
    rich.appendChild(block);
    const rBlock = makeRichBlock("Critique Rubric");
    rBlock.appendChild(el("p", "rich-copy-p", inner.codex_system_rubric));
    rich.appendChild(rBlock);
  } else if (inner?.adobe_and_browser) {
    rich.appendChild(renderStatusResult(inner));
  } else if (payload?.mode && payload?.argv_summary !== undefined) {
    rich.appendChild(renderAntigravityResult(payload));
  } else if (inner?.stdout || inner?.output) {
    const txt = inner.stdout || inner.output;
    const outBlock = makeRichBlock("Execution Output", txt);
    outBlock.appendChild(el("pre", "code-pre", txt));
    rich.appendChild(outBlock);
  } else {
    const fallback = makeRichBlock("Response Summary");
    fallback.appendChild(el("pre", "code-pre", JSON.stringify(inner, null, 2)));
    rich.appendChild(fallback);
  }

  card.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function setBusyState(busy, labelOverride = null) {
  isBusy = busy;
  const btn = $("primary-action-btn");
  const spinner = $("primary-spinner");
  const label = $("primary-action-label");
  btn.disabled = busy;
  spinner.classList.toggle("hidden", !busy);
  if (labelOverride) {
    label.textContent = labelOverride;
    return;
  }
  if (activeMainTab === "antigravity") {
    label.textContent = busy ? "Sending to Antigravity..." : "Send to Antigravity";
  } else {
    const selectedOpt = $("tool-select")?.selectedOptions?.[0]?.textContent || "Local Tool";
    label.textContent = busy ? `Running...` : `Run ${selectedOpt.split("(")[0].trim()}`;
  }
}

function switchMainTab(tabName) {
  activeMainTab = tabName === "tools" ? "tools" : "antigravity";
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    const isTarget = btn.dataset.tab === activeMainTab;
    btn.classList.toggle("active", isTarget);
    btn.setAttribute("aria-selected", String(isTarget));
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `panel-${activeMainTab}`);
  });
  setBusyState(false);
  chrome.storage.local.set({ activeTab: activeMainTab }).catch(() => {});
}

async function runAntigravityAction() {
  const promptVal = $("agy-prompt").value.trim();
  if (!promptVal) {
    showToast("Enter a task prompt first");
    $("agy-prompt").focus();
    return;
  }

  setBusyState(true, "Dispatching to Antigravity...");
  try {
    let tabPayload = null;
    if ($("agy-attach-tab").checked && capturedTab) {
      tabPayload = {
        title: capturedTab.title,
        url: capturedTab.url,
        selection: capturedTab.selection,
        images: Array.from(capturedTab.selectedImages || [])
      };
    }

    const convoId = $("agy-convo-id").value.trim();
    if (convoId) {
      await chrome.storage.local.set({ lastConvoId: convoId });
    }

    const payload = {
      mode: $("agy-mode").value,
      prompt: promptVal,
      model: $("agy-model").value || undefined,
      conversation_id: convoId || undefined,
      tab: tabPayload
    };

    const res = await bridgeFetch("/antigravity", { method: "POST", body: payload });
    renderOutput("Antigravity Dispatch", res, false);
    showToast("Sent to Antigravity");
  } catch (err) {
    renderOutput("Antigravity Error", err.message, true);
  } finally {
    setBusyState(false);
  }
}

async function runSelectedTool() {
  const tool = $("tool-select").value;
  const toolLabel = $("tool-select").selectedOptions?.[0]?.textContent || tool;
  setBusyState(true, `Running ${toolLabel}...`);
  try {
    const res = await bridgeFetch("/tool", {
      method: "POST",
      body: { tool, arguments: collectToolArgs() }
    });
    renderOutput(toolLabel, res, false);
    if (tool === "design_workflow_status" && res.result?.adobe_and_browser) {
      updateAppPills(res.result.adobe_and_browser);
    }
  } catch (err) {
    renderOutput(toolLabel, err.message, true);
  } finally {
    setBusyState(false);
  }
}

async function executeActiveAction() {
  if (isBusy) return;
  if (activeMainTab === "antigravity") {
    await runAntigravityAction();
  } else {
    await runSelectedTool();
  }
}

async function init() {
  const cfg = await getConfig();
  $("bridge-url").value = cfg.bridgeUrl;
  $("bridge-token").value = cfg.bridgeToken;
  if (cfg.lastConvoId) {
    $("agy-convo-id").value = cfg.lastConvoId;
  }

  switchMainTab(cfg.activeTab);
  renderToolFields();
  renderTabPreview();

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchMainTab(btn.dataset.tab));
  });

  $("agy-prompt").addEventListener("input", () => {
    const len = $("agy-prompt").value.length;
    $("agy-char-count").textContent = `${len} chars`;
    document.querySelectorAll(".preset-chip").forEach((c) => {
      c.classList.toggle("selected", $("agy-prompt").value.trim() === (c.dataset.preset || "").trim());
    });
  });

  document.querySelectorAll(".preset-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      $("agy-prompt").value = chip.dataset.preset || "";
      $("agy-prompt").dispatchEvent(new Event("input"));
      $("agy-prompt").focus();
    });
  });

  $("agy-mode").addEventListener("change", () => {
    $("agy-convo-wrap").classList.toggle("hidden", $("agy-mode").value !== "send-message");
  });

  $("tool-select").addEventListener("change", () => {
    renderToolFields();
    setBusyState(false);
  });

  $("refresh-status-btn").addEventListener("click", refreshStatus);
  $("toggle-settings-btn").addEventListener("click", () => toggleSettingsDrawer());
  $("close-settings-btn").addEventListener("click", () => toggleSettingsDrawer(false));

  $("pill-bridge").addEventListener("click", () => {
    if ($("pill-bridge").classList.contains("warn") || $("pill-bridge").classList.contains("offline")) {
      toggleSettingsDrawer(true);
      $("bridge-token").focus();
    } else {
      refreshStatus();
    }
  });

  $("capture-tab-btn").addEventListener("click", captureActiveTab);
  $("primary-action-btn").addEventListener("click", executeActiveAction);

  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      executeActiveAction();
    }
  });

  $("save-settings-btn").addEventListener("click", async () => {
    await chrome.storage.local.set({
      bridgeUrl: $("bridge-url").value.trim() || DEFAULT_BRIDGE_URL,
      bridgeToken: $("bridge-token").value.trim()
    });
    await refreshStatus();
    try {
      const st = await bridgeFetch("/status");
      renderOutput("Bridge Connection Verified", st, false);
      toggleSettingsDrawer(false);
      showToast("Bridge settings saved");
    } catch (err) {
      renderOutput("Connection Failed", err.message, true);
    }
  });

  $("toggle-token-btn").addEventListener("click", () => {
    const inp = $("bridge-token");
    const show = inp.type === "password";
    inp.type = show ? "text" : "password";
    $("toggle-token-btn").textContent = show ? "Hide" : "Show";
  });

  $("copy-output-btn").addEventListener("click", () =>
    copyText($("output-log").textContent || "", "Copied JSON payload", $("copy-output-btn"))
  );

  $("clear-output-btn").addEventListener("click", () => {
    $("output-card").classList.add("hidden");
    $("output-rich").innerHTML = "";
    $("output-log").textContent = "";
  });

  await refreshStatus();
}

init();
