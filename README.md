# Worlds Content Dashboard

A React dashboard for managing video script generation and video creation using OpenAI and HeyGen APIs. Each "world" represents a book, with its own system prompt for scriptwriting and a collection of generated videos (chapters).

## Features

- **World Management**: Create and manage multiple worlds (books), each with its own system prompt
- **Script Generation**: Generate video scripts using OpenAI API with customizable system prompts
- **Video Generation**: Send scripts to HeyGen API to generate videos (placeholder implementation)
- **Local Storage**: All data persists in browser localStorage (no backend required for MVP)

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env` file in the root directory:
   ```env
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   VITE_HEYGEN_API_KEY=your_heygen_api_key_here
   ```
   
   Get your OpenAI API key from: https://platform.openai.com/api-keys

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to the URL shown in the terminal (usually `http://localhost:5173`)

## Usage

1. **Create a World:**
   - Click "Create New World" in the sidebar
   - Enter a world name (book name)
   - Optionally add a system prompt (can edit later)

2. **Set System Prompt:**
   - Select a world from the sidebar
   - Edit the system prompt that will guide script generation for that world

3. **Create a Chapter/Video:**
   - Click "Create New Chapter" in the world view
   - Enter a chapter title
   - Click "Generate Script" to create a script using OpenAI
   - Review and edit the generated script if needed
   - Enter HeyGen avatar ID
   - Click "Generate Video" to send to HeyGen

4. **View Videos:**
   - All videos for a world are displayed in the main view
   - Status indicators show generation progress
   - Click "View Video" to open completed videos

## Project Structure

```
src/
├── components/          # React components
│   ├── Sidebar.jsx
│   ├── WorldView.jsx
│   ├── SystemPromptEditor.jsx
│   ├── VideosList.jsx
│   ├── ChapterCreator.jsx
│   └── CreateWorldModal.jsx
├── contexts/            # React Context providers
│   ├── WorldsContext.jsx
│   └── VideosContext.jsx
├── services/            # API integrations
│   ├── openai.js
│   └── heygen.js
├── utils/               # Utility functions
│   └── storage.js
├── App.jsx
└── main.jsx
```

## Tech Stack

- **React 19** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **OpenAI SDK** - Script generation
- **LocalStorage** - Data persistence

## Notes

- This is a frontend-only MVP
- API keys are stored in environment variables (for production, use a backend)
- HeyGen integration is a placeholder structure - implement based on HeyGen API documentation
- All data is stored in browser localStorage

## Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.
