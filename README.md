# 🎙️ Minutes — AI-Powered Meeting Summarizer & Task Manager

Minutes is a modern, production-grade application that simplifies post-meeting workflows. By uploading meeting audio or raw transcripts, the system automatically transcribes the discussion, extracts actionable tasks, slices corresponding audio proof clips, and enables semantic search over task items.

---

## 🏗️ Architecture & Tech Stack

The workspace is divided into two primary sub-projects:

### 1. Backend (`/server`)
- **Framework:** FastAPI (Python 3.10+)
- **Database:** MongoDB (via Motor async driver)
- **Transcription:** Groq Whisper (`whisper-large-v3`) with segment-level timestamping
- **AI Processing:** Groq Cloud AI (`llama-3.3-70b-versatile` / `llama3-8b-8192`)
- **Semantic Embeddings:** Local `all-MiniLM-L6-v2` via `sentence-transformers` (384-dimensional cosine similarity vectors)
- **Audio Slicing:** FFmpeg (via `ffmpeg-python`) with browser-compatible HTML5 Media Fragment fallback
- **Authentication:** Custom JWT-based user register/login flow

### 2. Frontend (`/client`)
- **Build Tool:** Vite + React 19 (JavaScript)
- **Styling:** Tailwind CSS v4
- **Routing:** React Router v7
- **Authentication:** Custom JWT context provider integrated with standard local storage

---

## ✨ Key Features

- **Segment-Level Timestamped Transcriptions:** Uses Groq Whisper to generate bracket-timestamped transcripts in `[HH:MM:SS]` format.
- **AI-Driven Data Extraction:** Automatically parses summaries, participants, key points, and lists of tasks (including priority, assignee, verbatim quotes, and temporal start/end offsets).
- **Interactive Audio Proofs:** FFmpeg dynamically cuts audio clips corresponding to the exact seconds a task was spoken. Clicking play on a task in the UI plays only that specific segment. Falls back to HTML5 Media Fragments (`#t=start,end`) if FFmpeg isn't installed.
- **Semantic Vector Search:** Real-time semantic searching over extracted tasks using MongoDB Atlas `$vectorSearch` and local embeddings.
- **Secure Authentication:** Standard registration and login routes with password hashing (`bcrypt`) and JWT access control.

---

## 📂 Project Structure

```text
gappy-ai/
├── client/                 # React + Vite frontend
│   ├── src/
│   │   ├── components/     # UI components (AudioPlayer, Toast, etc.)
│   │   ├── lib/            # API wrappers and helpers
│   │   ├── auth.jsx        # JWT Authentication state provider
│   │   ├── main.jsx        # App entrypoint
│   │   └── index.css       # Tailwind v4 CSS setup
│   ├── package.json
│   └── vite.config.js
│
├── server/                 # FastAPI backend
│   ├── api/
│   │   └── routes/         # Auth, Meetings, Tasks, Search routes
│   ├── core/
│   │   ├── config.py       # Pydantic Settings
│   │   ├── database.py     # MongoDB connection setup
│   │   └── security.py     # Password hashing and token generation
│   ├── services/
│   │   ├── ai_service.py   # Groq LLM meeting parser & fallback mock engine
│   │   ├── audio_service.py# FFmpeg audio slicer
│   │   ├── embedding_service.py # sentence-transformers local embeddings
│   │   └── transcription_service.py # Groq Whisper transcriber
│   ├── uploads/            # Local directory for original audio & cut clips
│   ├── requirements.txt
│   └── main.py             # Server entrypoint
│
└── .gitignore              # Root gitignore excluding dependencies, environments & runtime uploads
```

---

## ⚙️ Configuration & Setup

### 1. Backend (`/server`)

#### Prerequisites
- Python 3.10 or higher installed.
- **FFmpeg** installed and added to your system's PATH (highly recommended for audio proof clips).
- MongoDB (Local instance or MongoDB Atlas cluster).

#### Configuration Setup
Create a `.env` file in the `/server` directory:

```env
MONGO_URI=mongodb://localhost:27017
MONGO_DB_NAME=meeting_summarizer
PORT=8000
HOST=0.0.0.0

GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile

JWT_SECRET=your-super-secret-jwt-key
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=10080
```

#### Running the Server
1. Navigate to `/server`.
2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # macOS/Linux:
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the FastAPI application:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

The API will be available at `http://localhost:8000`, and interactive docs can be viewed at `http://localhost:8000/docs`.

---

### 2. Frontend (`/client`)

#### Prerequisites
- Node.js (v18+) and npm installed.

#### Configuration Setup
Vite automatically interfaces with the backend running on port 8000 via API client wrappers. No special frontend `.env` config is strictly necessary for standard development, though you can adjust standard configurations as needed.

#### Running the Frontend
1. Navigate to `/client`.
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```

The client will be running at `http://localhost:5173`.

---

## 🔍 Semantic Search & Vector Indexing Setup

To leverage the semantic search feature, you must configure a Vector Search Index on your MongoDB Atlas cluster:

1. Log into your **MongoDB Atlas** console.
2. Select your cluster and navigate to **Atlas Search** (or Search -> Vector Search).
3. Create a Search Index using the **JSON Editor**.
4. Set the database name to your configured database name (e.g., `meeting_summarizer`) and collection name to `tasks`.
5. Name the index: `task_embedding_index`.
6. Insert the following definition:

```json
{
  "fields": [
    {
      "numDimensions": 384,
      "path": "embedding",
      "similarity": "cosine",
      "type": "vector"
    },
    {
      "path": "userId",
      "type": "filter"
    }
  ]
}
```

7. Save and wait for the indexing status to show **Active**.
