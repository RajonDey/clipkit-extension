// --- DOM Elements ---
const themeSelect = document.getElementById("themeSelect");
const addThemeBtn = document.getElementById("addThemeBtn");
const tagInput = document.getElementById("tagInput");
const tagList = document.getElementById("tagList");
const saveBtn = document.getElementById("saveBtn");
const loadingDiv = document.getElementById("loading");
const form = document.getElementById("clipForm");
const contentTypeSelect = document.getElementById("contentType");
const contentInputWrapper = document.getElementById("contentInputWrapper");
const previewDiv = document.getElementById("preview");
const recentItemsDiv = document.getElementById("recentItems");
const recentItemsList = document.getElementById("recentItemsList");

let contentData = null;
let selectedTags = [];
let allTags = [];
let allThemes = [];

const API_BASE = "http://localhost:8000";

// --- Persist/Restore State ---
function saveState() {
  chrome.storage.local.set({
    clipkit_theme: themeSelect.value,
    clipkit_tags: selectedTags,
    clipkit_contentType: contentTypeSelect.value,
    clipkit_content: document.getElementById("contentInput")?.value || "",
  });
}
function restoreState() {
  chrome.storage.local.get(
    ["clipkit_theme", "clipkit_tags", "clipkit_contentType", "clipkit_content"],
    (data) => {
      if (data.clipkit_theme) themeSelect.value = data.clipkit_theme;
      if (data.clipkit_tags) {
        selectedTags = data.clipkit_tags;
        renderTagList();
      }
      if (data.clipkit_contentType) {
        contentTypeSelect.value = data.clipkit_contentType;
        renderContentInput(contentTypeSelect.value);
      }
      setTimeout(() => {
        if (data.clipkit_content) {
          const input = document.getElementById("contentInput");
          if (input) input.value = data.clipkit_content;
        }
      }, 100);
    }
  );
}

// --- Theme Functions ---
async function fetchThemes() {
  const res = await fetch(`${API_BASE}/themes`);
  allThemes = await res.json();
  renderThemeOptions();
}
function renderThemeOptions() {
  themeSelect.innerHTML = "";
  allThemes.forEach((theme) => {
    const opt = document.createElement("option");
    opt.value = theme.name;
    opt.textContent = theme.name;
    themeSelect.appendChild(opt);
  });
  // Restore last used theme if available
  chrome.storage.local.get(["clipkit_theme"], (data) => {
    if (
      data.clipkit_theme &&
      allThemes.some((t) => t.name === data.clipkit_theme)
    ) {
      themeSelect.value = data.clipkit_theme;
    }
  });
}
addThemeBtn.addEventListener("click", async () => {
  const name = prompt("New project/theme name?");
  if (name && !allThemes.some((t) => t.name === name)) {
    const res = await fetch(`${API_BASE}/themes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      await fetchThemes();
      // Wait for dropdown to update, then set value
      setTimeout(() => {
        themeSelect.value = name;
        saveState();
      }, 100);
    }
  }
});
themeSelect.addEventListener("change", saveState);

// --- Tag Functions ---
tagInput.addEventListener("input", async (e) => {
  const q = e.target.value.trim();
  if (!q) return;
  const res = await fetch(`${API_BASE}/tags?q=${encodeURIComponent(q)}`);
  allTags = await res.json();
  // Autocomplete (simple): show first match
  if (allTags.length && !selectedTags.includes(allTags[0].name)) {
    tagInput.value = allTags[0].name;
  }
});
tagInput.addEventListener("keydown", async (e) => {
  if (e.key === "Enter" && tagInput.value.trim()) {
    e.preventDefault();
    const tag = tagInput.value.trim();
    if (!selectedTags.includes(tag)) {
      // Add to backend if new
      if (!allTags.some((t) => t.name === tag)) {
        await fetch(`${API_BASE}/tags`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: tag }),
        });
      }
      selectedTags.push(tag);
      renderTagList();
      saveState();
    }
    tagInput.value = "";
  }
});
function renderTagList() {
  tagList.innerHTML = "";
  selectedTags.forEach((tag) => {
    const tagEl = document.createElement("span");
    tagEl.className = "tag";
    tagEl.textContent = tag;
    const removeBtn = document.createElement("span");
    removeBtn.className = "tag-remove";
    removeBtn.textContent = "×";
    removeBtn.onclick = () => {
      selectedTags = selectedTags.filter((t) => t !== tag);
      renderTagList();
      saveState();
    };
    tagEl.appendChild(removeBtn);
    tagList.appendChild(tagEl);
  });
}

// --- Content Input Rendering (existing logic) ---
function renderContentInput(type) {
  contentInputWrapper.innerHTML = "";
  previewDiv.style.display = "none";
  contentData = null;
  let input;
  if (type === "text" || type === "other") {
    input = document.createElement("textarea");
    input.id = "contentInput";
    input.placeholder = "Paste or type your content here...";
    input.required = true;
    input.ariaLabel = "Content";
    contentInputWrapper.appendChild(input);
    contentInputWrapper.style.display = "block";
    input.addEventListener("input", saveState);
  } else if (type === "url") {
    input = document.createElement("input");
    input.type = "url";
    input.id = "contentInput";
    input.placeholder = "Paste or type the URL here...";
    input.required = true;
    input.ariaLabel = "Content URL";
    contentInputWrapper.appendChild(input);
    contentInputWrapper.style.display = "block";
    input.addEventListener("input", saveState);
  } else if (type === "image") {
    input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.id = "contentInput";
    input.required = true;
    input.ariaLabel = "Image";
    contentInputWrapper.appendChild(input);
    contentInputWrapper.style.display = "block";
    input.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (ev) {
          contentData = ev.target.result;
          showPreview("image", contentData);
          saveState();
        };
        reader.readAsDataURL(file);
      }
    });
    contentInputWrapper.addEventListener("paste", (e) => {
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          const reader = new FileReader();
          reader.onload = function (ev) {
            contentData = ev.target.result;
            showPreview("image", contentData);
            saveState();
          };
          reader.readAsDataURL(file);
          e.preventDefault();
          break;
        }
      }
    });
  } else if (type === "video") {
    input = document.createElement("input");
    input.type = "url";
    input.id = "contentInput";
    input.placeholder = "Paste a video URL (YouTube, Vimeo, etc.)";
    input.required = true;
    input.ariaLabel = "Video URL";
    contentInputWrapper.appendChild(input);
    contentInputWrapper.style.display = "block";
    input.addEventListener("input", (e) => {
      const url = e.target.value.trim();
      showPreview("video-url", url);
      saveState();
    });
  }
}

function showPreview(type, data) {
  previewDiv.innerHTML = "";
  if (type === "image") {
    const img = document.createElement("img");
    img.src = data;
    img.style.maxWidth = "100%";
    img.style.maxHeight = "120px";
    previewDiv.appendChild(img);
    previewDiv.style.display = "block";
  } else if (type === "video-url") {
    let embed = null;
    if (/youtube\.com|youtu\.be/.test(data)) {
      let videoId = null;
      const ytMatch = data.match(/(?:v=|youtu\.be\/)([\w-]+)/);
      if (ytMatch) videoId = ytMatch[1];
      if (videoId) {
        embed = document.createElement("iframe");
        embed.width = "100%";
        embed.height = "120";
        embed.src = `https://www.youtube.com/embed/${videoId}`;
        embed.frameBorder = "0";
        embed.allow =
          "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
        embed.allowFullscreen = true;
      }
    } else if (/vimeo\.com/.test(data)) {
      const vimeoMatch = data.match(/vimeo\.com\/(\d+)/);
      if (vimeoMatch) {
        embed = document.createElement("iframe");
        embed.width = "100%";
        embed.height = "120";
        embed.src = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
        embed.frameBorder = "0";
        embed.allow = "autoplay; fullscreen; picture-in-picture";
        embed.allowFullscreen = true;
      }
    }
    if (embed) {
      previewDiv.appendChild(embed);
    } else if (data) {
      const a = document.createElement("a");
      a.href = data;
      a.textContent = data;
      a.target = "_blank";
      previewDiv.appendChild(a);
    }
    previewDiv.style.display = data ? "block" : "none";
  }
}

// --- Initial Render ---
window.addEventListener("DOMContentLoaded", async () => {
  await fetchThemes();
  renderTagList();
  renderContentInput(contentTypeSelect.value);
  contentInputWrapper.style.display = "block";
  contentTypeSelect.addEventListener("change", (e) => {
    renderContentInput(e.target.value);
    contentInputWrapper.style.display = "block";
    saveState();
  });
  restoreState();
  fetchRecentItems();
});

// --- Form Submission ---
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  saveBtn.disabled = true;
  loadingDiv.style.display = "block";
  const theme = themeSelect.value;
  const tags = selectedTags;
  const contentType = contentTypeSelect.value;
  let contentValue = null;
  if (contentType === "image" || contentType === "video") {
    contentValue = contentData;
    if (!contentValue) {
      alert("Please upload or paste a " + contentType + ".");
      saveBtn.disabled = false;
      loadingDiv.style.display = "none";
      return;
    }
  } else {
    const input = document.getElementById("contentInput");
    contentValue = input.value.trim();
    if (!contentValue) {
      alert("Please provide the content.");
      saveBtn.disabled = false;
      loadingDiv.style.display = "none";
      return;
    }
  }
  if (!theme) {
    alert("Please select a project/theme.");
    saveBtn.disabled = false;
    loadingDiv.style.display = "none";
    return;
  }
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    const url = tab.url;
    let token = null;
    try {
      const tokenObj = await new Promise((resolve) =>
        chrome.storage.local.get(["clipkit_jwt"], resolve)
      );
      token = tokenObj.clipkit_jwt || null;
    } catch {}
    const payload = {
      theme,
      tags,
      content_type: contentType,
      content: contentValue,
      url,
    };
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/collect`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      await fetchRecentItems();
      saveState();
      alert("Saved to Clipkit!");
    } else {
      alert("Failed to save.");
    }
  } catch (err) {
    alert("Failed to save.");
  } finally {
    saveBtn.disabled = false;
    loadingDiv.style.display = "none";
  }
});
