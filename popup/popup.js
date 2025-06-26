// --- DOM Elements ---
// Removed themeSelect and addThemeBtn as they are no longer in the UI
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
const ideaNameInput = document.getElementById("ideaName");
const ideaCategoryInput = document.getElementById("ideaCategory");
const clipStatusSelect = document.getElementById("clipStatus");
const ideaSelect = document.getElementById("ideaSelect");
const addIdeaBtn = document.getElementById("addIdeaBtn");

let contentData = null;
let selectedTags = [];
let allTags = [];
let allIdeas = [];

const API_BASE = "http://localhost:8000";

// --- Persist/Restore State ---
function saveState() {
  chrome.storage.local.set({
    clipkit_tags: selectedTags,
    clipkit_contentType: contentTypeSelect.value,
    clipkit_content: document.getElementById("contentInput")?.value || "",
  });
}
function restoreState() {
  chrome.storage.local.get(
    ["clipkit_tags", "clipkit_contentType", "clipkit_content"],
    (data) => {
      if (data.clipkit_tags) {
        selectedTags = data.clipkit_tags;
        renderTagList();
      }
      if (data.clipkit_contentType) {
        contentTypeSelect.value = data.clipkit_contentType;
        renderContentInput(contentTypeSelect.value);
      } else {
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
  if (type === "text") {
    input = document.createElement("textarea");
    input.id = "contentInput";
    input.placeholder = "Paste or type your content here...";
    input.required = true;
    input.ariaLabel = "Content";
    contentInputWrapper.appendChild(input);
    contentInputWrapper.style.display = "block";
    input.addEventListener("input", saveState);
  } else if (type === "link") {
    input = document.createElement("input");
    input.type = "url";
    input.id = "contentInput";
    input.placeholder = "Paste or type the link here...";
    input.required = true;
    input.ariaLabel = "Content Link";
    contentInputWrapper.appendChild(input);
    contentInputWrapper.style.display = "block";
    input.addEventListener("input", saveState);
  } else if (type === "image") {
    input = document.createElement("input");
    input.type = "url";
    input.id = "contentInput";
    input.placeholder = "Paste image URL here...";
    input.required = true;
    input.ariaLabel = "Image URL";
    contentInputWrapper.appendChild(input);
    contentInputWrapper.style.display = "block";
    input.addEventListener("input", (e) => {
      showPreview("image", e.target.value.trim());
      saveState();
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
      showPreview("video-url", e.target.value.trim());
      saveState();
    });
  } else if (type === "code") {
    input = document.createElement("textarea");
    input.id = "contentInput";
    input.placeholder = "Paste or type your code here...";
    input.required = true;
    input.ariaLabel = "Code";
    input.style.fontFamily = "monospace";
    input.style.minHeight = "80px";
    contentInputWrapper.appendChild(input);
    contentInputWrapper.style.display = "block";
    input.addEventListener("input", saveState);
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

// --- Idea Management ---
function loadIdeas() {
  chrome.storage.local.get(["clipkit_ideas"], (data) => {
    allIdeas = data.clipkit_ideas || [];
    renderIdeaOptions();
  });
}
function saveIdeas() {
  chrome.storage.local.set({ clipkit_ideas: allIdeas });
}
function renderIdeaOptions() {
  ideaSelect.innerHTML = "";
  allIdeas.forEach((idea, idx) => {
    const opt = document.createElement("option");
    opt.value = idea.name;
    opt.textContent = idea.name;
    ideaSelect.appendChild(opt);
  });
  if (allIdeas.length > 0) {
    ideaSelect.value = allIdeas[0].name;
    updateIdeaCategory();
  }
}
function updateIdeaCategory() {
  const selected = allIdeas.find((i) => i.name === ideaSelect.value);
  if (selected) {
    ideaCategoryInput.value = selected.category || "";
  } else {
    ideaCategoryInput.value = "";
  }
}
addIdeaBtn.addEventListener("click", () => {
  const name = prompt("New idea name?");
  if (name && !allIdeas.some((i) => i.name === name)) {
    const category = prompt("Category for this idea?") || "";
    allIdeas.unshift({ name, category });
    saveIdeas();
    renderIdeaOptions();
    ideaSelect.value = name;
    updateIdeaCategory();
  }
});
ideaSelect.addEventListener("change", updateIdeaCategory);

// --- Initial Render ---
window.addEventListener("DOMContentLoaded", async () => {
  loadIdeas();
  renderTagList();
  renderContentInput(contentTypeSelect.value);
  contentInputWrapper.style.display = "block";
  contentTypeSelect.addEventListener("change", (e) => {
    renderContentInput(e.target.value);
    contentInputWrapper.style.display = "block";
    saveState();
  });
  restoreState();
  // fetchRecentItems(); // Uncomment if you want to show recent items
});

// --- Form Submission ---
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  saveBtn.disabled = true;
  loadingDiv.style.display = "block";
  const ideaName = ideaSelect.value;
  const ideaCategory = ideaCategoryInput.value.trim();
  const status = clipStatusSelect.value;
  const tags = selectedTags;
  const contentType = contentTypeSelect.value;
  let contentValue = null;
  const input = document.getElementById("contentInput");
  contentValue = input.value.trim();
  if (!contentValue) {
    alert("Please provide the content.");
    saveBtn.disabled = false;
    loadingDiv.style.display = "none";
    return;
  }
  if (!ideaName) {
    alert("Please enter an idea name.");
    saveBtn.disabled = false;
    loadingDiv.style.display = "none";
    return;
  }
  if (!ideaCategory) {
    alert("Please enter an idea category.");
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
      idea: {
        name: ideaName,
        category: ideaCategory,
      },
      clip: {
        type: contentType,
        value: contentValue,
        status,
        url,
      },
      tags: tags.map((t) => ({ name: t })),
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
