const { useEffect, useMemo, useRef, useState } = React;

function DigitalNotepadApp() {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef({ x: 0, y: 0 });
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const MAX_STACK = 25;

  const [tool, setTool] = useState('pen');
  const [penColor, setPenColor] = useState('#111827');
  const [penSize, setPenSize] = useState(3);
  const [eraserSize, setEraserSize] = useState(18);
  const [smooth, setSmooth] = useState(true);
  const [theme, setTheme] = useState('dark');
  const [search, setSearch] = useState('');
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [date, setDate] = useState('');
  const [text, setText] = useState('');

  const filteredNotes = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return notes;
    return notes.filter((note) => {
      const haystack = `${note.title || ''} ${note.category || ''} ${note.filename || ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [notes, search]);

  function getPointerPosition(event) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function saveCanvasState() {
    if (undoStack.current.length >= MAX_STACK) undoStack.current.shift();
    undoStack.current.push(canvasRef.current.toDataURL('image/png'));
  }

  function restoreCanvasFromDataURL(dataUrl) {
    const image = new Image();
    image.onload = () => {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      ctx.drawImage(image, 0, 0);
    };
    image.src = dataUrl;
  }

  function beginStroke(event) {
    event.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    isDrawing.current = true;
    lastPoint.current = getPointerPosition(event);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = tool === 'eraser' ? eraserSize : penSize;
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = tool === 'highlighter' ? `${penColor}66` : penColor;
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
  }

  function drawStroke(event) {
    if (!isDrawing.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const currentPoint = getPointerPosition(event);

    if (smooth) {
      const midPoint = {
        x: (lastPoint.current.x + currentPoint.x) / 2,
        y: (lastPoint.current.y + currentPoint.y) / 2,
      };
      ctx.quadraticCurveTo(lastPoint.current.x, lastPoint.current.y, midPoint.x, midPoint.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(midPoint.x, midPoint.y);
    } else {
      ctx.lineTo(currentPoint.x, currentPoint.y);
      ctx.stroke();
    }

    lastPoint.current = currentPoint;
  }

  function endStroke() {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    canvasRef.current.getContext('2d').restore();
    saveCanvasState();
    redoStack.current = [];
  }

  function clearCanvas() {
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    saveCanvasState();
    redoStack.current = [];
  }

  function downloadPNG() {
    const link = document.createElement('a');
    link.href = canvasRef.current.toDataURL('image/png');
    link.download = 'react-note.png';
    link.click();
  }

  function undo() {
    if (undoStack.current.length <= 1) return;
    redoStack.current.push(undoStack.current.pop());
    restoreCanvasFromDataURL(undoStack.current[undoStack.current.length - 1]);
  }

  function redo() {
    if (redoStack.current.length === 0) return;
    const nextState = redoStack.current.pop();
    restoreCanvasFromDataURL(nextState);
    undoStack.current.push(nextState);
  }

  function saveNote() {
    fetch('/save-note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: canvasRef.current.toDataURL('image/png'),
        title: title || 'Untitled note',
        category,
        date,
        text,
      }),
    })
      .then((res) => res.json())
      .then((resp) => {
        alert(resp.message || 'Note saved!');
        loadNotes();
      });
  }

  function loadNotes() {
    fetch('/get-notes')
      .then((res) => res.json())
      .then((data) => setNotes((data.notes || []).reverse()));
  }

  function summarizeText(raw) {
    if (!raw) return '';
    const sentences = raw.trim().split(/(?<=[.!?])\s+/);
    if (sentences.length > 1) return sentences.slice(0, 2).join(' ');
    const words = raw.split(/\s+/).slice(0, 25);
    return words.join(' ') + (words.length === 25 ? '...' : '');
  }

  function startVoiceTyping() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice typing is not supported in this browser.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map((result) => result[0].transcript).join(' ');
      setText((prev) => (prev ? `${prev}\n${transcript}` : transcript));
    };
    recognition.onerror = () => alert('Voice typing stopped.');
    recognition.start();
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveCanvasState();
    loadNotes();
    setDate(new Date().toISOString().slice(0, 10));

    const handlePointerUp = () => endStroke();
    canvas.addEventListener('pointerdown', beginStroke);
    canvas.addEventListener('pointermove', drawStroke);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointerleave', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerUp);

    return () => {
      canvas.removeEventListener('pointerdown', beginStroke);
      canvas.removeEventListener('pointermove', drawStroke);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointerleave', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerUp);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle('dark-mode', theme === 'dark');
  }, [theme]);

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <h1>Digital Notepad</h1>
          <p className="subtitle">A modern React-driven interface with the same Flask backend, canvas tools, and note-saving flow.</p>
        </div>
        <div className="actions">
          <button className="btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>Toggle theme</button>
          <button className="btn" onClick={downloadPNG}>⬇ Download</button>
          <button className="btn danger" onClick={clearCanvas}>🧹 Clear</button>
          <button className="btn primary" onClick={saveNote}>💾 Save</button>
        </div>
      </header>

      <main className="dashboard">
        <section className="panel tool-grid">
          <div>
            <h3>Tools</h3>
            <div className="chip-row">
              {['pen', 'highlighter', 'eraser'].map((item) => (
                <button
                  key={item}
                  className={`tool-btn ${tool === item ? 'active' : ''}`}
                  onClick={() => setTool(item)}
                >
                  {item === 'pen' ? '✏️ Pen' : item === 'highlighter' ? '🖍 Highlighter' : '🧽 Eraser'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label>Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Project idea, meeting note..." />
          </div>
          <div>
            <label>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option>General</option>
              <option>Productivity</option>
              <option>Work</option>
              <option>Personal</option>
              <option>Ideas</option>
            </select>
          </div>
          <div>
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label>Color</label>
            <input type="color" value={penColor} onChange={(e) => setPenColor(e.target.value)} />
          </div>
          <div>
            <label>Pen size</label>
            <input type="range" min="1" max="40" value={penSize} onChange={(e) => setPenSize(Number(e.target.value))} />
          </div>
          <div>
            <label>Eraser size</label>
            <input type="range" min="5" max="60" value={eraserSize} onChange={(e) => setEraserSize(Number(e.target.value))} />
          </div>
          <label className="chip">
            <input type="checkbox" checked={smooth} onChange={(e) => setSmooth(e.target.checked)} /> Smooth strokes
          </label>
          <div className="chip-row">
            <button className="btn" onClick={undo}>↶ Undo</button>
            <button className="btn" onClick={redo}>↷ Redo</button>
          </div>
        </section>

        <section className="panel">
          <div className="canvas-top">
            <div>
              <h3 style={{ margin: '0 0 4px' }}>Canvas board</h3>
              <span className="canvas-label">Draw, annotate, save, and review notes from one interactive workspace.</span>
            </div>
            <div className="chip-row">
              <button className="btn" onClick={startVoiceTyping}>🎙 Voice typing</button>
              <button className="btn" onClick={() => setText(summarizeText(text))}>✨ Summarize</button>
            </div>
          </div>

          <div className="editor-grid" style={{ marginBottom: 12 }}>
            <div style={{ flex: '1 1 320px' }}>
              <label>Note text</label>
              <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Write your note here..." />
            </div>
            <div className="canvas-wrap" style={{ flex: '1 1 420px' }}>
              <canvas ref={canvasRef} id="notepad" width="800" height="1000" />
            </div>
          </div>

          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search saved notes..." />

          <div className="note-gallery">
            {filteredNotes.map((note) => (
              <article key={note.id || note.filename} className="note-card">
                <img src={`/static/notes/${note.filename}`} alt={note.title || 'Saved note'} onClick={() => window.open(`/static/notes/${note.filename}`, '_blank')} />
                <div className="note-meta">
                  <strong>{note.title || 'Untitled note'}</strong>
                  <span>{note.category || 'General'}</span>
                  <small>{note.created_date || ''}</small>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<DigitalNotepadApp />);
