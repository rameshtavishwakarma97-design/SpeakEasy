---
title: SpeakEasy
emoji: 🎙️
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
---

# SpeakEasy – AI-Powered Text-to-Speech

Upload documents or paste text, generate AI-enhanced scripts with selectable styles, and listen with a Spotify-like audio player featuring real-time speed/pitch control and seek.

## Features

- **Document Upload** – PDF, DOCX, TXT support with automatic text extraction
- **AI Script Generation** – RAG pipeline with HuggingFace LLMs (Llama 3.1, Qwen 2.5)
- **5 Content Styles** – Podcast, Narration, Storytelling, Debate, Lecture
- **Web Speech TTS** – Browser-native text-to-speech with voice selection
- **Live Playback Controls** – Dynamic speed/pitch adjustment during playback
- **Progress Bar & Seek** – Spotify-like slider with skip ±10s
- **Audio Download** – Tab audio capture for offline listening
- **Dark/Light Mode** – Toggle theme with system preference support

## Running Locally

```bash
npm install
npm run dev
```
  