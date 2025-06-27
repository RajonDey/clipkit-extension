// --- DOM Elements ---
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
const clipStatusSelect = document.getElementById("clipStatus");
const ideaSelect = document.getElementById("ideaSelect");
const addIdeaBtn = document.getElementById("addIdeaBtn");

let contentData = null;
let selectedTags = [];
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
tagInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && tagInput.value.trim()) {
    e.preventDefault();
    const tag = tagInput.value.trim();
    if (!selectedTags.includes(tag)) {
      selectedTags.push(tag);
      renderTagList();
      saveState();
    }
    tagInput.value = "";
  }
});
tagInput.addEventListener("input", (e) => {
  // No autocomplete logic needed
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
  }
}
addIdeaBtn.addEventListener("click", () => {
  const name = prompt("New idea name?");
  if (name && !allIdeas.some((i) => i.name === name)) {
    allIdeas.unshift({ name });
    saveIdeas();
    renderIdeaOptions();
    ideaSelect.value = name;
  }
});

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
  // --- Ensure any tag in the input is included ---
  const pendingTag = tagInput.value.trim();
  if (pendingTag && !selectedTags.includes(pendingTag)) {
    selectedTags.push(pendingTag);
    renderTagList();
    tagInput.value = "";
  }
  const ideaName = ideaSelect.value;
  const tags = selectedTags;
  const contentType = contentTypeSelect.value;
  const status = clipStatusSelect.value;
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
    alert("Please select or add an idea.");
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
    // Data model: user, ideas, clips, tags, status, type, value, created_at
    const payload = {
      user: {
        id: "u-123",
        name: "Rajon Dey",
        email: "rajon@example.com",
      },
      ideas: [
        {
          id: `idea-${ideaName.toLowerCase().replace(/\s+/g, "-")}`,
          name: ideaName,
          clips: [
            {
              id: `clip-${Date.now()}`,
              type: contentType,
              value: contentValue,
              status: status,
              created_at: new Date().toISOString(),
              tags: tags.map((t, i) => ({ id: `tag-${i + 1}`, name: t })),
            },
          ],
        },
      ],
    };
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/collect`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      // Optionally clear form fields after save
      if (input) input.value = "";
      selectedTags = [];
      renderTagList();
      // Optionally reset status
      // clipStatusSelect.value = "raw";
      saveState();
      alert("Saved to Clipkit!");
    } else {
      let msg = "Failed to save.";
      try {
        const err = await res.json();
        if (err && err.detail) msg = err.detail;
      } catch {}
      alert(msg);
    }
  } catch (err) {
    alert("Error: " + err.message);
  } finally {
    saveBtn.disabled = false;
    loadingDiv.style.display = "none";
  }
});
