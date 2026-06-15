/* ======== Canvas + Tools ======== */
const canvas = document.getElementById("notepad");
const ctx = canvas.getContext("2d", { alpha: true });

let isDrawing = false;
let currentTool = "pen";
let lastPoint = { x: 0, y: 0 };

const penSize = document.getElementById("penSize");
const penColor = document.getElementById("penColor");
const eraserSize = document.getElementById("eraserSize");
const smoothToggle = document.getElementById("smoothToggle");

const noteTitle = document.getElementById("noteTitle");
const noteCategory = document.getElementById("noteCategory");
const noteDate = document.getElementById("noteDate");
const noteText = document.getElementById("noteText");
const voiceBtn = document.getElementById("voiceBtn");
const summaryBtn = document.getElementById("summaryBtn");

const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const downloadBtn = document.getElementById("downloadBtn");
const themeToggle = document.getElementById("themeToggle");
const searchNotes = document.getElementById("searchNotes");

let undoStack = [];
let redoStack = [];
const MAX_STACK = 25;

function getPointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  const clientX = event.touches ? event.touches[0].clientX : event.clientX;
  const clientY = event.touches ? event.touches[0].clientY : event.clientY;
  return {
    x: (clientX - rect.left) * (canvas.width / rect.width),
    y: (clientY - rect.top) * (canvas.height / rect.height)
  };
}

function setTool(tool) {
  currentTool = tool;
  document.querySelectorAll(".tool-btn").forEach(btn => {
    btn.classList.toggle("active", btn.id === `${tool}Btn`);
  });
  canvas.style.cursor = tool === "eraser" ? "cell" : "crosshair";
}

function updateUndoRedoButtons() {
  undoBtn.disabled = undoStack.length <= 1;
  redoBtn.disabled = redoStack.length === 0;
}

function saveCanvasState() {
  if (undoStack.length >= MAX_STACK) {
    undoStack.shift();
  }
  undoStack.push(canvas.toDataURL("image/png"));
  updateUndoRedoButtons();
}

function restoreCanvasFromDataURL(dataURL) {
  const image = new Image();
  image.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);
  };
  image.src = dataURL;
}

function beginStroke(event) {
  event.preventDefault();
  isDrawing = true;
  lastPoint = getPointerPosition(event);
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = currentTool === "eraser" ? Number(eraserSize.value) : Number(penSize.value);
  ctx.globalCompositeOperation = currentTool === "eraser" ? "destination-out" : "source-over";
  ctx.strokeStyle = currentTool === "highlighter" ? `${penColor.value}66` : penColor.value;
  ctx.beginPath();
  ctx.moveTo(lastPoint.x, lastPoint.y);
}

function drawStroke(event) {
  if (!isDrawing) return;
  const currentPoint = getPointerPosition(event);

  if (smoothToggle.checked) {
    const midPoint = {
      x: (lastPoint.x + currentPoint.x) / 2,
      y: (lastPoint.y + currentPoint.y) / 2
    };
    ctx.quadraticCurveTo(lastPoint.x, lastPoint.y, midPoint.x, midPoint.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(midPoint.x, midPoint.y);
  } else {
    ctx.lineTo(currentPoint.x, currentPoint.y);
    ctx.stroke();
  }

  lastPoint = currentPoint;
}

function endStroke() {
  if (!isDrawing) return;
  isDrawing = false;
  ctx.restore();
  saveCanvasState();
  redoStack = [];
  updateUndoRedoButtons();
}

function undo() {
  if (undoStack.length <= 1) return;
  redoStack.push(undoStack.pop());
  restoreCanvasFromDataURL(undoStack[undoStack.length - 1]);
  updateUndoRedoButtons();
}

function redo() {
  if (redoStack.length === 0) return;
  const nextState = redoStack.pop();
  restoreCanvasFromDataURL(nextState);
  undoStack.push(nextState);
  updateUndoRedoButtons();
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  saveCanvasState();
  redoStack = [];
  updateUndoRedoButtons();
}

function downloadPNG() {
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = "note.png";
  link.click();
}

function saveNote() {
  const dataURL = canvas.toDataURL("image/png");
  fetch("/save-note", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image: dataURL,
      title: noteTitle.value || "Untitled note",
      category: noteCategory.value,
      date: noteDate.value,
      text: noteText.value
    })
  })
    .then(r => r.json())
    .then(resp => {
      alert(resp.message);
      loadNotes();
    });
}

function getDefaultDate() {
  const today = new Date();
  return today.toISOString().slice(0, 10);
}

function summarizeText(text) {
  if (!text) return "";
  const sentences = text.trim().split(/(?<=[.!?])\s+/);
  if (sentences.length > 1) {
    return sentences.slice(0, 2).join(" ");
  }
  const words = text.split(/\s+/).slice(0, 25);
  return words.join(" ") + (words.length === 25 ? "..." : "");
}

function startVoiceTyping() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Voice typing is not supported in this browser.");
    return;
  }
  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = true;
  recognition.continuous = true;
  recognition.onresult = event => {
    const transcript = Array.from(event.results)
      .map(result => result[0].transcript)
      .join(' ');
    noteText.value = noteText.value ? noteText.value + '\n' + transcript : transcript;
  };
  recognition.onerror = () => {
    alert('Voice typing stopped.');
  };
  recognition.start();
}

function toggleTheme() {
  document.body.classList.toggle("dark");
}

function filterNotes(notes) {
  const query = searchNotes?.value.trim().toLowerCase();
  if (!query) {
    return notes;
  }
  return notes.filter(note => {
    const title = (note.title || "").toLowerCase();
    const category = (note.category || "").toLowerCase();
    const filename = (note.filename || "").toLowerCase();
    return title.includes(query) || category.includes(query) || filename.includes(query);
  });
}

function loadNotes() {
  fetch("/get-notes")
    .then(r => r.json())
    .then(data => {
      const box = document.getElementById("savedNotes");
      box.innerHTML = "";
      const notes = filterNotes(data.notes).reverse();
      notes.forEach(note => {
        const card = document.createElement("div");
        card.className = "note-card";
        card.draggable = true;
        card.addEventListener("dragstart", event => {
          event.dataTransfer.setData("text/uri-list", "/static/notes/" + note.filename);
        });

        const img = document.createElement("img");
        img.src = "/static/notes/" + note.filename;
        img.alt = note.title || note.filename;
        img.onclick = () => window.open(img.src, "_blank");

        const meta = document.createElement("div");
        meta.className = "note-meta";
        meta.innerHTML = `
          <strong>${note.title || 'Untitled note'}</strong>
          <span>${note.category || 'General'}</span>
          <small>${note.created_date || ''}</small>
        `;

        card.appendChild(img);
        card.appendChild(meta);
        box.appendChild(card);
      });
    });
}

canvas.addEventListener("pointerdown", beginStroke);
canvas.addEventListener("pointermove", drawStroke);
canvas.addEventListener("pointerup", endStroke);
canvas.addEventListener("pointerleave", endStroke);
canvas.addEventListener("pointercancel", endStroke);

canvas.addEventListener("touchstart", beginStroke, { passive: false });
canvas.addEventListener("touchmove", drawStroke, { passive: false });
canvas.addEventListener("touchend", endStroke);

themeToggle?.addEventListener("click", toggleTheme);
searchNotes?.addEventListener("input", loadNotes);
voiceBtn?.addEventListener("click", startVoiceTyping);
summaryBtn?.addEventListener("click", () => {
  noteText.value = summarizeText(noteText.value);
});

noteDate.value = getDefaultDate();
setTool("pen");
clearCanvas();
loadNotes();
