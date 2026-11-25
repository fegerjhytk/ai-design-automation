const DEFAULT_BRIDGE_URL = "http://127.0.0.1:4815";

let capturedTab = null;

const TOOL_SCHEMAS = {
  brand_anti_sameness_audit: [
    { key: "category", label: "Category", type: "text", default: "matcha" },
    { key: "brand_name", label: "Brand Name", type: "text", default: "" },
    { key: "audience", label: "Target Audience", type: "text", default: "" }
  ],
  audit_typographic_kerning: [
    { key: "wordmark", label: "Wordmark", type: "text", default: "MIRAI" },
    { key: "font_name", label: "Font Name", type: "text", default: "IvyPrestoDisplay-SemiBold" }
  ],
  motion_sync_timeline: [
    { key: "text", label: "Headline Text", type: "text", default: "HOW TO DESIGN A BRAND" },
    { key: "bpm", label: "BPM", type: "number", default: "120" },
    { key: "duration_seconds", label: "Duration (seconds)", type: "number", default: "5" }
  ],
  stage_environmental_mockup: [
    { key: "brand_name", label: "Brand Name", type: "text", default: "MIRAI" },
    { key: "container_type", label: "Container", type: "text", default: "cylindrical matte tin can with chrome lid" },
    { key: "primary_color", label: "Primary Color", type: "text", default: "#4A0E17" },
    { key: "lighting_preset", label: "Lighting Preset", type: "select", options: ["retail_shelf", "direct_daylight", "moody_ambient"], default: "retail_shelf" },
    { key: "aspect_ratio", label: "Aspect Ratio", type: "select", options: ["16:9", "9:16", "1:1", "4:3", "3:4"], default: "16:9" }
  ],
  design_workflow_run_action: [
    {
      key: "action",
      label: "Pipeline Action",
      type: "select",
      options: ["ps-status", "ae-status", "ai-video-status", "chrome-status", "audit", "cleanup", "fit", "qc", "qc-markers", "export"],
      default: "ae-status"
    },
    { key: "project", label: "Project Folder (optional)", type: "text", default: "" }
  ],
  design_workflow_preflight: [
    { key: "mode", label: "Mode", type: "select", options: ["core_engine_tests", "illustrator_qc"], default: "core_engine_tests" }
  ],
  design_workflow_status: []
};

function $(id) {
  return document.getElementById(id);
}

function setOutput(data) {
  const el = $("output-log");
  el.textContent = typeof data === "string" ? data : JSON.stringify(data, null, 2);
}

async function getConfig() {
  const stored = await chrome.storage.local.get(["bridgeUrl", "bridgeToken"]);
  return {
    bridgeUrl: (stored.bridgeUrl || DEFAULT_BRIDGE_URL).replace(/\/+$/, ""),
    bridgeToken: stored.bridgeToken || ""
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

async function refreshStatus() {
  const pill = $("bridge-status-text");
  try {
    await bridgeFetch("/health");
    const { bridgeToken } = await getConfig();
    if (!bridgeToken) {
      pill.textContent = "Bridge Online (Set Token in Settings)";
      pill.className = "status-pill offline";
      return;
    }
    const status = await bridgeFetch("/status");
    const adobe = status.adobe_and_browser || {};
    const running = ["illustrator", "after_effects", "photoshop"]
      .filter((k) => adobe[k]?.running)
      .join(", ");
    pill.textContent = running ? `Bridge Online | Open: ${running}` : "Bridge Online | Adobe Idle";
    pill.className = "status-pill online";
  } catch (err) {
    pill.textContent = `Bridge Offline (${err.message})`;
    pill.className = "status-pill offline";
  }
}

async function captureActiveTab() {
  const preview = $("tab-preview");
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      preview.textContent = "No active tab found.";
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
            .map((img) => img.currentSrc || img.src)
            .filter((src) => typeof src === "string" && /^https?:\/\//i.test(src));
          return {
            selection: sel.trim().slice(0, 4000),
            images: Array.from(new Set(imgs)).slice(0, 10)
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
      selection,
      images
    };
    preview.classList.remove("muted");
    preview.textContent = `${capturedTab.title}\n${capturedTab.url}${
      selection ? `\nSelection: ${selection.slice(0, 120)}...` : ""
    }${images.length ? `\nImages captured: ${images.length}` : ""}`;
  } catch (err) {
    preview.textContent = `Unable to capture tab: ${err.message}`;
  }
}

function renderToolFields() {
  const tool = $("tool-select").value;
  const container = $("tool-fields");
  container.innerHTML = "";
  const fields = TOOL_SCHEMAS[tool] || [];

  for (const field of fields) {
    const label = document.createElement("label");
    label.className = "field-label";
    label.textContent = field.label;
    label.setAttribute("for", `tf-${field.key}`);
    container.appendChild(label);

    let input;
    if (field.type === "select") {
      input = document.createElement("select");
      for (const optVal of field.options) {
        const opt = document.createElement("option");
        opt.value = optVal;
        opt.textContent = optVal;
        if (optVal === field.default) opt.selected = true;
        input.appendChild(opt);
      }
    } else {
      input = document.createElement("input");
      input.type = field.type || "text";
      input.value = field.default || "";
    }
    input.id = `tf-${field.key}`;
    input.dataset.key = field.key;
    input.dataset.type = field.type || "text";
    container.appendChild(input);
  }
}

function collectToolArgs() {
  const args = {};
  const inputs = $("tool-fields").querySelectorAll("input, select");
  for (const el of inputs) {
    const val = el.value.trim();
    if (val === "") continue;
    args[el.dataset.key] = el.dataset.type === "number" ? Number(val) : val;
  }
  return args;
}

async function init() {
  const cfg = await getConfig();
  $("bridge-url").value = cfg.bridgeUrl;
  $("bridge-token").value = cfg.bridgeToken;

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      $(`panel-${btn.dataset.tab}`).classList.add("active");
    });
  });

  document.querySelectorAll(".preset-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      $("agy-prompt").value = chip.dataset.preset || "";
    });
  });

  $("agy-mode").addEventListener("change", () => {
    $("agy-convo-wrap").classList.toggle("hidden", $("agy-mode").value !== "send-message");
  });

  $("tool-select").addEventListener("change", renderToolFields);
  renderToolFields();

  $("refresh-status-btn").addEventListener("click", refreshStatus);
  $("capture-tab-btn").addEventListener("click", captureActiveTab);

  $("send-agy-btn").addEventListener("click", async () => {
    try {
      setOutput("Sending to Antigravity...");
      const payload = {
        mode: $("agy-mode").value,
        prompt: $("agy-prompt").value,
        model: $("agy-model").value || undefined,
        conversation_id: $("agy-convo-id").value || undefined,
        tab: $("agy-attach-tab").checked ? capturedTab : null
      };
      const res = await bridgeFetch("/antigravity", { method: "POST", body: payload });
      setOutput(res);
    } catch (err) {
      setOutput(`Error: ${err.message}`);
    }
  });

  $("run-tool-btn").addEventListener("click", async () => {
    try {
      const tool = $("tool-select").value;
      setOutput(`Running ${tool}...`);
      const res = await bridgeFetch("/tool", {
        method: "POST",
        body: { tool, arguments: collectToolArgs() }
      });
      setOutput(res);
    } catch (err) {
      setOutput(`Error: ${err.message}`);
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
      setOutput(st);
    } catch (err) {
      setOutput(`Settings saved, but status failed: ${err.message}`);
    }
  });

  $("toggle-token-btn").addEventListener("click", () => {
    const inp = $("bridge-token");
    const show = inp.type === "password";
    inp.type = show ? "text" : "password";
    $("toggle-token-btn").textContent = show ? "Hide" : "Show";
  });

  $("copy-output-btn").addEventListener("click", async () => {
    await navigator.clipboard.writeText($("output-log").textContent || "");
  });

  await refreshStatus();
}

init();
