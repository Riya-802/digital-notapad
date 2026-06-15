# Digital Notepad

A simple Flask application for creating handwritten or typed notes on a digital canvas, saving them as PNG files, and viewing your saved notes in the browser.

## Features

- Draw with a pen, highlighter, or eraser
- Adjust stroke color, size, and smoothness
- Undo and redo your last actions
- Add a title, category, date, and text notes
- Download the canvas as a PNG image
- Save notes to disk and list them from the UI

## Tech Stack

- Python
- Flask
- React JS (frontend UI)
- Python + Flask (backend)
- Canvas API for drawing

## Project Structure

- `app.py` — Flask routes and note-saving logic
- `templates/index.html` — main interface for the app
- `static/script.js` — canvas drawing, toolbar behavior, and save/load actions
- `static/style.css` — optional legacy styling file; the React-based UI can replace this with component styling
- `static/notes/` — saved note image files
- `notes.json` — saved note metadata
- `requirement.txt` — Python dependencies

## Quick Start

1. Create and activate a virtual environment:

   ```powershell
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```

2. Install dependencies:

   ```powershell
   pip install -r requirement.txt
   ```

3. Run the app:

   ```powershell
   python app.py
   ```

4. Open the app in your browser:

   ```text
   http://127.0.0.1:5000/
   ```

## How It Works

- The main page renders the notepad interface from `templates/index.html`.
- The frontend can be upgraded to React JS for a more modular UI, while the current canvas logic lives in `static/script.js`.
- Clicking Save sends the canvas image to the Flask backend in `app.py`.
- The backend stores the image in `static/notes/` and saves note metadata in `notes.json`.

## Notes

- The note gallery is populated from the `/get-notes` endpoint.
- The image save route is `/save-note`.
- If you run into startup issues, confirm that Flask is installed and that you are running the app from the project root folder.
