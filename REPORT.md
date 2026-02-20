# VoiceVerse Sprint — Project Report

## SpeakEasy: AI-Powered Document-to-Audio Platform

---

**Program:** PGDM & PGDM(BM) 25-27  
**Course:** Maker Lab — Application Test 2  
**Student:** Rameshta  
**Deployment:** [https://huggingface.co/spaces/RV28/speak-easy-web](https://huggingface.co/spaces/RV28/speak-easy-web)  
**Repository:** [https://huggingface.co/spaces/RV28/speak-easy-web/tree/main](https://huggingface.co/spaces/RV28/speak-easy-web/tree/main)

---

## Table of Contents

1. Executive Summary
2. System Architecture
3. Document Input & Knowledge Layer
4. Script Generation Module (RAG Pipeline)
5. Voice Generation Module
6. User Interface
7. Live Deployment
8. "Wow Factor" Features
9. Tools, Models & Attributions
10. Testing & Quality Assurance
11. Challenges Faced & Solutions
12. Screenshots & Demo Flow
13. Conclusion

---

## 1. Executive Summary

**SpeakEasy** is a full-stack AI-powered web application that transforms uploaded documents and text into engaging synthetic audio content. Users can upload PDF, DOCX, or TXT files, select from six distinct content styles (Summary, Podcast, Narration, Storytelling, Debate, Lecture), and generate AI-crafted scripts grounded in their source material using a Retrieval-Augmented Generation (RAG) pipeline. The generated scripts are then converted to speech using the browser's native Web Speech API, with a Spotify-like audio player offering real-time speed/pitch adjustment, a seek progress bar, and audio download capability.

The system is deployed as a Docker-based application on Hugging Face Spaces and is publicly accessible.

**Key Highlights:**
- End-to-end pipeline: Upload → Chunk → Embed → Retrieve → Generate → Play
- RAG grounding ensures outputs are faithful to source material
- 6 content styles including an accessibility-focused Summary mode
- Live playback controls (dynamic speed, pitch, seek)
- Dark/light mode toggle
- Audio download via browser tab capture
- Deployed on Hugging Face Spaces (Docker SDK)

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    USER INTERFACE                        │
│  (React + TypeScript + Tailwind CSS + Radix UI)         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────────┐  │
│  │  File    │  │  Text    │  │   Style Selector      │  │
│  │  Upload  │  │  Input   │  │   (6 content styles)  │  │
│  └────┬─────┘  └────┬─────┘  └───────────┬───────────┘  │
│       └──────┬───────┘                    │              │
│              ▼                            │              │
│  ┌───────────────────┐                   │              │
│  │  Document Parser  │                   │              │
│  │  (PDF/DOCX/TXT)   │                   │              │
│  └────────┬──────────┘                   │              │
│           ▼                              │              │
│  ┌───────────────────┐                   │              │
│  │  Text Chunker     │                   │              │
│  │  (500 char, 50    │                   │              │
│  │   overlap)        │                   │              │
│  └────────┬──────────┘                   │              │
│           ▼                              │              │
│  ┌───────────────────┐                   │              │
│  │  Embedding Engine │◄──── HuggingFace API             │
│  │  (BAAI/bge-small) │     (Inference)   │              │
│  └────────┬──────────┘                   │              │
│           ▼                              │              │
│  ┌───────────────────┐                   │              │
│  │  Vector Store     │                   │              │
│  │  (In-memory,      │                   │              │
│  │   cosine sim)     │                   │              │
│  └────────┬──────────┘                   │              │
│           ▼                              ▼              │
│  ┌──────────────────────────────────────────────────┐   │
│  │         LLM Script Generator                      │   │
│  │  (Llama 3.1 8B / Qwen 2.5 72B via HF API)       │   │
│  │  Style-specific prompts + retrieved context       │   │
│  └───────────────────────┬──────────────────────────┘   │
│                          ▼                              │
│  ┌───────────────────────────────────────────────────┐  │
│  │              Script Editor (Editable)             │  │
│  └───────────────────────┬───────────────────────────┘  │
│                          ▼                              │
│  ┌───────────────────────────────────────────────────┐  │
│  │          TTS Engine (Web Speech API)              │  │
│  │  • Managed playback with progress tracking        │  │
│  │  • Live speed/pitch adjustment                    │  │
│  │  • Seek via character position                    │  │
│  │  • Audio download via getDisplayMedia             │  │
│  └───────────────────────────────────────────────────┘  │
│                          ▼                              │
│  ┌───────────────────────────────────────────────────┐  │
│  │         Spotify-like Audio Player UI              │  │
│  │  Play/Pause • ⏪10s • ⏩10s • Progress bar        │  │
│  │  Time display • Download • Replay                 │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend Framework | React 19 + TypeScript | Component-based UI |
| Build Tool | Vite 6.3.5 | Fast HMR, optimized builds |
| Styling | Tailwind CSS v4 + Radix UI (shadcn/ui) | Responsive design, accessible components |
| Theme | next-themes 0.4.6 | Dark/light mode with system preference detection |
| Embedding Model | BAAI/bge-small-en-v1.5 | 384-dimensional sentence embeddings |
| LLM (Primary) | meta-llama/Llama-3.1-8B-Instruct | Script generation via OpenAI-compatible chat API |
| LLM (Fallback) | Qwen/Qwen2.5-72B-Instruct | Fallback when primary model is unavailable |
| TTS | Web Speech API (SpeechSynthesis) | Browser-native text-to-speech |
| PDF Parsing | pdfjs-dist | Client-side PDF text extraction |
| DOCX Parsing | mammoth | Client-side DOCX text extraction |
| Audio Capture | getDisplayMedia API | Tab audio capture for downloads |
| Deployment | Docker on Hugging Face Spaces | Containerized static serving on port 7860 |
| API Gateway | HuggingFace Inference API (router.huggingface.co) | Embedding + LLM endpoints |

---

## 3. Document Input & Knowledge Layer

### 3.1 File Upload Support

The application supports three document formats:

- **PDF** — Parsed client-side using `pdfjs-dist`. Extracts text page-by-page, handling multi-page documents.
- **DOCX** — Parsed using `mammoth.js` to extract raw text from Word documents.
- **TXT** — Read directly using the FileReader API.

File validation enforces:
- Maximum file size: 5 MB
- Allowed extensions: `.pdf`, `.docx`, `.txt`
- Graceful error messages for corrupted or unsupported files

### 3.2 Text Input

Users can alternatively paste or type text directly (up to 5,000 characters), enabling quick testing without file uploads.

### 3.3 Chunking Strategy

The `chunkText()` function implements an intelligent chunking strategy:

- **Chunk size:** 500 characters (configurable)
- **Overlap:** 50 characters between consecutive chunks
- **Sentence-boundary splitting:** Chunks are split at sentence boundaries (`.`, `!`, `?`) to maintain coherence
- **Edge case handling:** Short texts are returned as a single chunk

This ensures that the embedding model receives semantically complete text segments, critical for accurate retrieval.

### 3.4 Embedding & Vector Store

**Embedding Model:** `BAAI/bge-small-en-v1.5` — a compact, high-quality sentence embedding model producing 384-dimensional vectors.

The `VectorStore` class provides:
- **Batch indexing:** Chunks are embedded in batches of 8 to respect API rate limits
- **Mean pooling:** Handles both 1D and 2D embedding outputs (token-level → sentence-level)
- **Cosine similarity retrieval:** Queries are embedded and compared against all indexed chunks
- **Top-K retrieval:** Returns the 5 most relevant chunks for script generation

---

## 4. Script Generation Module (RAG Pipeline)

### 4.1 RAG Pipeline Flow

```
Input Text → Chunk (500 chars) → Embed (BGE) → Index in Vector Store
                                                       ↓
Style-specific Query → Embed → Cosine Similarity → Top-5 Chunks
                                                       ↓
                               Retrieved Context + Style Prompt → LLM → Script
```

### 4.2 Content Styles

Six distinct styles are available, each with a tailored system prompt:

| Style | Emoji | Description | Script Structure |
|-------|-------|-------------|-----------------|
| **Summary** | 📋 | Plain-text abstract for accessibility | Flowing paragraphs, 50-100 words |
| **Podcast** | 🎙️ | Conversational podcast episode | Introduction → Body → Conclusion |
| **Narration** | 🎧 | Professional narration | Scene setting → Narrative → Closing |
| **Storytelling** | 📖 | Engaging story format | Hook → Compelling narrative → Takeaway |
| **Debate** | ⚖️ | Multi-perspective debate | Topic intro → Side A → Side B → Summary |
| **Lecture** | 🎓 | Educational lecture | Significance → Concepts → Further study |

### 4.3 LLM Integration

The system uses the **OpenAI-compatible chat completions API** on HuggingFace:

- **Endpoint:** `router.huggingface.co/v1/chat/completions`
- **Primary model:** `meta-llama/Llama-3.1-8B-Instruct`
- **Fallback model:** `Qwen/Qwen2.5-72B-Instruct`
- **Temperature:** 0.7 (balanced creativity and accuracy)
- **Max tokens:** 1024
- **Automatic fallback:** If the primary model fails (except auth errors), the system tries the fallback

### 4.4 Script Post-Processing

The `cleanScript()` function strips LLM artifacts:
- Removes markdown formatting (`**bold**`, `### headings`)
- Strips stage directions (`[PAUSE FOR A MOMENT]`, `[MUSIC FADES IN]`)
- Removes speaker labels (`Announcer:`, `Host:`, `Narrator:`)
- Removes section labels (`OVERVIEW:`, `KEY POINTS:`, `CONCLUSION:`)
- Collapses excess whitespace
- Validates minimum output length (50 characters)

### 4.5 Grounding Verification

The RAG pipeline ensures grounding by:
1. Only retrieving chunks from the uploaded source material
2. Including retrieved context in the LLM prompt with explicit instructions: *"The content MUST be grounded in the provided source material"*
3. Using style-specific retrieval queries to find the most relevant passages for each format

---

## 5. Voice Generation Module

### 5.1 TTS Engine

The application uses the **Web Speech API** (`SpeechSynthesis`), available natively in modern browsers. This provides:

- **Zero latency:** No API calls needed for voice generation
- **Multiple voices:** Access to all system-installed voices (typically 20-60 depending on OS/browser)
- **Language support:** Voices for English, Spanish, French, Hindi, and many more
- **Configurable parameters:** Rate (0.1–10x), Pitch (0–2), Volume (0–1)

### 5.2 Managed Playback System

The `TTSEngine` class implements a managed playback system that overcomes Web Speech API limitations:

- **Character-level progress tracking** via `onboundary` events
- **Version-counted utterances** to safely ignore callbacks from canceled speech
- **Cancel-and-restart pattern** for live settings changes (Web Speech API doesn't natively support mid-utterance parameter changes)
- **Position-based pause/resume** — stores character position on pause, restarts from that position on resume

### 5.3 Audio Download

Since the Web Speech API doesn't expose its audio stream, the application uses a creative workaround:

- **`getDisplayMedia` API** captures the browser tab's audio output
- **MediaRecorder** records the stream while SpeechSynthesis plays
- **Chrome optimization:** `preferCurrentTab` and `selfBrowserSurface` provide a one-click sharing experience
- **Format detection:** Automatically selects the best supported MIME type (`audio/webm;codecs=opus`, `audio/ogg`, etc.)
- **Video track preservation:** Video tracks are kept alive during recording to prevent Chrome from killing the audio capture

---

## 6. User Interface

### 6.1 Design Principles

- **Clean, modern layout** with gradient backgrounds and card-based sections
- **Responsive design** — works on desktop, tablet, and mobile
- **Accessible components** — all interactive elements built with Radix UI (WAI-ARIA compliant)
- **Progressive disclosure** — API settings collapsed by default, controls appear contextually

### 6.2 Key UI Components

| Component | Description |
|-----------|-------------|
| **ThemeToggle** | Sun/Moon toggle switch for dark/light mode (system preference aware) |
| **FileUpload** | Drag-and-drop or click-to-upload with file type/size validation |
| **TextInput** | Textarea with character count (5,000 char limit) |
| **StyleSelector** | Dropdown with 6 content styles, each with emoji and description |
| **SummaryEditor** | Editable textarea showing the generated script with word counts |
| **VoiceControls** | Voice dropdown, speed slider, pitch slider |
| **AudioPlayer** | Spotify-like player with progress bar, seek, time display, playback controls |

### 6.3 Audio Player Features

The audio player provides a Spotify-like experience:

- **Progress slider** — visual progress bar that updates in real-time via character boundary events
- **Time display** — estimated current time and total duration (calculated from character count and speech rate)
- **Seek** — drag the slider to jump to any position in the text
- **Skip ±10 seconds** — dedicated buttons calculate character offset from time estimate
- **Play/Pause/Resume** — managed playback with position memory
- **Replay** — restart from beginning
- **Download** — capture and download audio as WebM/OGG file
- **Live status indicator** — green pulse when playing, yellow when paused

### 6.4 Error Handling

The UI handles errors gracefully:
- Browser compatibility check (Web Speech API support)
- File type/size validation with user-friendly messages
- API token validation
- Model loading states (503 handling)
- Network error messages
- Generation step indicators ("Chunking document...", "Generating embeddings...", etc.)

---

## 7. Live Deployment

### 7.1 Deployment Architecture

The application is deployed on **Hugging Face Spaces** using the **Docker SDK**:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG VITE_HF_TOKEN
ENV VITE_HF_TOKEN=$VITE_HF_TOKEN
RUN npm run build
RUN npm install -g serve
EXPOSE 7860
CMD ["serve", "-s", "dist", "-l", "7860"]
```

- **Build-time token injection:** The `VITE_HF_TOKEN` is passed as a Docker build argument from HF Space secrets
- **Static serving:** The production build is served using `serve` on port 7860 (required by HF Spaces)
- **Alpine base:** Minimal Node.js image for fast builds

### 7.2 CORS Handling

- **Development:** Vite dev proxy forwards `/api/hf` requests to `router.huggingface.co`
- **Production:** API calls go directly to HuggingFace (same-origin policy not an issue from HF Spaces domain)

### 7.3 Access

- **Public URL:** [https://huggingface.co/spaces/RV28/speak-easy-web](https://huggingface.co/spaces/RV28/speak-easy-web)
- **No login required** — the API token is pre-configured via Space secrets

---

## 8. "Wow Factor" Features

### 8.1 Style Selector with 6 Content Modes

The application goes beyond basic TTS conversion by offering **six distinct AI-powered content transformation styles**. This includes:
- A **Debate mode** that generates multi-perspective arguments from neutral source material
- A **Storytelling mode** that transforms dry content into engaging narratives
- An **Accessibility Summary** mode designed for visually impaired users

### 8.2 Live Playback Controls

A unique feature where **speed and pitch changes apply instantly during playback** — the engine cancels the current utterance and restarts from the exact character position with new settings, providing a YouTube/Spotify-like experience that the Web Speech API doesn't natively support.

### 8.3 Spotify-Like Audio Player

The progress bar with seek functionality, skip ±10 second buttons, estimated time display, and real-time progress tracking provides a professional audio player experience rarely seen in browser-based TTS applications.

### 8.4 Dark/Light Mode

Full theme support with system preference detection, smooth transitions, and consistent styling across all components.

---

## 9. Tools, Models & Attributions

### 9.1 AI Models Used

| Model | Provider | Purpose | License |
|-------|----------|---------|---------|
| BAAI/bge-small-en-v1.5 | HuggingFace | Text embeddings (384-dim) | MIT |
| meta-llama/Llama-3.1-8B-Instruct | Meta via HuggingFace | Primary script generation | Llama 3.1 Community |
| Qwen/Qwen2.5-72B-Instruct | Alibaba via HuggingFace | Fallback script generation | Apache 2.0 |
| Web Speech API | Browser-native | Text-to-speech synthesis | N/A (Browser API) |

### 9.2 Key Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| React | 19.x | UI framework |
| Vite | 6.3.5 | Build toolchain |
| Tailwind CSS | 4.x | Utility-first CSS |
| Radix UI (shadcn/ui) | Various | Accessible UI primitives |
| next-themes | 0.4.6 | Theme management |
| pdfjs-dist | Latest | PDF text extraction |
| mammoth | 1.11.0 | DOCX text extraction |
| lucide-react | 0.487.0 | Icon library |

### 9.3 APIs

| API | Endpoint | Usage |
|-----|----------|-------|
| HuggingFace Inference | `router.huggingface.co/hf-inference/models/BAAI/bge-small-en-v1.5` | Embedding generation |
| HuggingFace Chat | `router.huggingface.co/v1/chat/completions` | LLM script generation |
| Web Speech API | Browser-native | Speech synthesis |
| getDisplayMedia | Browser-native | Audio download capture |

### 9.4 Academic Integrity Statement

- All AI models are open-source and properly attributed
- No prompt-only wrappers or no-code tools were used
- The entire codebase is custom-written TypeScript/React
- All synthetic audio is generated in real-time and not pre-recorded
- The system clearly displays when AI generation is in progress

---

## 10. Testing & Quality Assurance

### 10.1 Test Scenarios Covered

| Scenario | Status |
|----------|--------|
| Upload PDF → Generate → Play | ✅ Working |
| Upload DOCX → Generate → Play | ✅ Working |
| Upload TXT → Generate → Play | ✅ Working |
| Text input → Generate → Play | ✅ Working |
| All 6 content styles generate correctly | ✅ Working |
| Speed/pitch changes during playback | ✅ Working |
| Progress bar seek | ✅ Working |
| Skip ±10 seconds | ✅ Working |
| Pause/Resume from position | ✅ Working |
| Audio download (WebM) | ✅ Working |
| Dark/light mode toggle | ✅ Working |
| Invalid file type rejection | ✅ Working |
| Oversized file rejection | ✅ Working |
| Missing API token error | ✅ Working |
| Model fallback (primary → secondary) | ✅ Working |
| Unsupported browser detection | ✅ Working |
| HF Spaces deployment accessible | ✅ Working |

### 10.2 Browser Compatibility

| Browser | TTS | Audio Download | Status |
|---------|-----|---------------|--------|
| Chrome 90+ | ✅ | ✅ | Full support |
| Edge 90+ | ✅ | ✅ | Full support |
| Firefox | ✅ | ⚠️ Limited | TTS works, download may vary |
| Safari | ✅ | ❌ | TTS works, getDisplayMedia not supported |

---

## 11. Challenges Faced & Solutions

### Challenge 1: HuggingFace API Migration
**Problem:** The original HuggingFace Inference API (`api-inference.huggingface.co`) was deprecated and returned 410 errors.  
**Solution:** Migrated all endpoints to the new `router.huggingface.co` with updated paths (`/hf-inference/models/` for embeddings, `/v1/chat/completions` for LLM).

### Challenge 2: CORS in Development
**Problem:** Browser CORS policy blocked direct API calls from localhost.  
**Solution:** Configured Vite dev proxy (`/api/hf` → `router.huggingface.co`) with automatic switching to direct URLs in production.

### Challenge 3: Dynamic Speed/Pitch During Playback
**Problem:** The Web Speech API does not support changing `rate` or `pitch` on an active utterance.  
**Solution:** Implemented a cancel-and-restart-from-position pattern using `onboundary` events for character-level tracking and a version counter to ignore stale callbacks.

### Challenge 4: Audio Download Silence
**Problem:** Initial AudioContext-based recording produced silent files; second attempt using getDisplayMedia lost audio when video tracks were stopped.  
**Solution:** Kept all media tracks (including video) alive throughout the recording session — Chrome requires this to maintain audio capture.

### Challenge 5: LLM Generating Stage Directions
**Problem:** The Summary style produced script-like output with `[PAUSE FOR A MOMENT]`, `Announcer:` labels, etc.  
**Solution:** Rewrote the Summary prompt to explicitly request plain-text output, and enhanced the `cleanScript()` function to strip stage directions, speaker labels, and section headers from all styles.

---

## 12. Screenshots & Demo Flow

### Demo Flow

1. **Open the application** — Landing page with SpeakEasy header, theme toggle, and input section
2. **Upload a document** — Click "Upload" or drag-and-drop a PDF/DOCX/TXT file
3. **Select content style** — Choose from Summary, Podcast, Narration, Storytelling, Debate, or Lecture
4. **Generate script** — Click "Generate Script & Convert to Speech" — watch the 4-step progress indicator
5. **Review/edit script** — The generated script appears in an editable text area with word count
6. **Configure voice** — Select a voice, adjust speed and pitch using sliders
7. **Play audio** — Click Play to hear the script; progress bar shows real-time progress
8. **Adjust live** — Change speed/pitch during playback — applies instantly
9. **Seek** — Drag the progress bar or click ⏪/⏩ to skip 10 seconds
10. **Download** — Click Download to save the audio as a WebM file

---

## 13. Conclusion

SpeakEasy delivers a complete, production-ready AI pipeline that transforms documents into engaging audio content. The system demonstrates proficiency in:

- **End-to-end AI pipeline design** — from document ingestion through RAG retrieval to script generation and audio output
- **Retrieval-Augmented Generation** — ensuring all generated content is grounded in source material, minimizing hallucination
- **Creative AI application** — six content styles transform the same source material into fundamentally different audio experiences
- **User experience engineering** — Spotify-like audio controls, real-time settings adjustment, dark mode, and accessible design
- **Production deployment** — Docker-based deployment on Hugging Face Spaces with proper secret management and CORS handling

The application is publicly accessible, handles edge cases gracefully, and provides a compelling demonstration of how AI can make text content more accessible and engaging through audio transformation.

---

*Report prepared for PGDM Maker Lab — VoiceVerse Sprint*  
*Application: SpeakEasy — https://huggingface.co/spaces/RV28/speak-easy-web*
