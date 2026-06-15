from flask import Flask, request, render_template
import os, json, base64

app = Flask(__name__)

NOTES_FILE = "notes.json"
NOTES_FOLDER = os.path.join("static", "notes")

# Ensure notes.json exists
if not os.path.exists(NOTES_FILE):
    with open(NOTES_FILE, "w") as f:
        json.dump([], f)

# Ensure static/notes folder exists
if not os.path.exists(NOTES_FOLDER):
    os.makedirs(NOTES_FOLDER)

def load_notes():
    with open(NOTES_FILE, "r") as f:
        return json.load(f)

def save_notes(notes):
    with open(NOTES_FILE, "w") as f:
        json.dump(notes, f, indent=4)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/save-note", methods=["POST"])
def save_note():
    data = request.get_json()
    img_data = data['image'].split(",")[1]  # remove prefix

    notes = load_notes()
    note_id = len(notes) + 1
    filename = f"note_{note_id}.png"
    filepath = os.path.join(NOTES_FOLDER, filename)

    # Save the PNG
    with open(filepath, "wb") as f:
        f.write(base64.b64decode(img_data))

    metadata = {
        "id": note_id,
        "filename": filename,
        "title": data.get("title", f"Note {note_id}"),
        "category": data.get("category", "General"),
        "created_date": data.get("date", ""),
        "text": data.get("text", ""),
    }

    notes.append(metadata)
    save_notes(notes)

    return {"message": f"Note saved as {filename}"}

@app.route("/get-notes")
def get_notes():
    return {"notes": load_notes()}

if __name__ == "__main__":
    app.run(debug=True)
