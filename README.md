# JB-Chat

JB-Chat is a lightweight, browser-based AI chat application built with FastAPI and the Groq API. It combines a responsive chat interface with model selection, file attachments, copy controls, token and quota information, and optional browser-local chat and profile storage.

## Features

- **Multiple Groq models:** choose from `openai/gpt-oss-20b` (default), `openai/gpt-oss-120b`, `qwen/qwen3.8-27b`, and `allam-2-7b`.
- **Chat history:** conversations are saved in the current browser using `localStorage`.
- **File attachments:** attach up to five files with a combined size of 10 MB per message. Supported inputs include images, PDFs, DOCX documents, and UTF-8 text or source files.
- **Image and document processing:** images are resized and converted to JPEG; PDF and DOCX text is extracted; scanned PDFs are not OCR-processed.
- **Saved personal info:** optionally keep profile facts in browser storage, review them, remove individual facts, or clear them.
- **Convenience controls:** copy prompts and code blocks, select models, and remove queued attachments.
- **Translator and speech tools:** choose from 76 supported languages, translate microphone speech into the composer with automatic speech-language detection, or translate selected response text and read it aloud.
- **Token display:** input and output token sections are hidden for `allam-2-7b` and `qwen/qwen3.8-27b` responses.
- **Quota handling:** show provider quota data when available and open model selection when a token limit is reached.
- **English responses:** the backend instructs configured models to respond in English.

## Technology

| Area | Technology |
|---|---|
| Backend | Python, FastAPI, Uvicorn |
| AI provider | Groq, through its OpenAI-compatible API |
| Frontend | HTML, CSS, vanilla JavaScript |
| File processing | Pillow, pillow-heif, pypdf, python-docx |
| Token counting | tiktoken |

## Requirements

- Python 3.10 or later
- A Groq API key
- A modern browser

Installable Python dependencies are listed in [`requirements.txt`](requirements.txt).

## Getting started

### 1. Get the project

If you already have the project files, open a terminal in the project directory. Otherwise, clone the repository and enter its folder:

```bash
git clone <repository-url>
cd <repository-folder>
```

Replace the placeholders with the actual repository URL and folder name.

### 2. Create and activate a virtual environment

**Linux / macOS**

```bash
python3 -m venv .venv
source .venv/bin/activate
```

**Windows PowerShell**

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### 3. Install dependencies

```bash
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

### 4. Set your Groq API key

Set `GROQ_API_KEY` in the same terminal session that will run the server.

**Linux / macOS**

```bash
export GROQ_API_KEY="your_groq_api_key"
```

**Windows PowerShell**

```powershell
$env:GROQ_API_KEY = "your_groq_api_key"
```

Never put a real API key in application source code or commit it to version control.

### 5. Start the application

```bash
python -m uvicorn app:app --reload
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000). Interactive API documentation is available at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

## Using JB-Chat

1. Enter a message in the composer and optionally choose a model.
2. Use **+** to attach files. Selecting a file switches the selected model to `qwen/qwen3.8-27b`; removing an attachment switches it to the default, `openai/gpt-oss-20b`.
3. Send the message. The selected model resets to the default after a request.
4. Use the copy controls on prompts or code blocks to copy their contents.
5. Expand **Saved personal info** below the composer to review or clear locally stored profile facts.

When Groq reports a token limit, JB-Chat opens the model picker and temporarily disables models whose token limit has been reached. Qwen is offered after the three alternative models have reached their token limits. The model catalog and quota information depend on the provider response and API key.

## File attachment details

- Maximum **5 files** and **10 MB combined** per message.
- **Images:** common image formats are decoded, orientation-corrected, reduced to at most 2048 × 2048 pixels, and converted to JPEG. Images larger than 40 megapixels are rejected. Image understanding depends on the selected model's capabilities.
- **PDF:** text is extracted from up to 100 pages. Scanned/image-only pages are not OCR-processed.
- **DOCX:** text from paragraphs and tables is extracted. Legacy `.doc` files are not supported.
- **Text and source code:** UTF-8 text and common programming-language files are included as text, up to 100,000 extracted characters across attachments.
- Attachments are processed in memory for the request; the application does not intentionally save uploaded files.

## API

### `GET /models`

Returns the configured model IDs that are currently present in Groq's model catalog. Requires `GROQ_API_KEY`.

### `POST /chat`

Send a `multipart/form-data` request. The `files` field may be repeated for multiple attachments.

| Field | Required | Description |
|---|---:|---|
| `prompt` | Yes | Current message text. |
| `history` | No | JSON array of previous turns, each with a `role` (`user` or `assistant`) and `content`. Defaults to `[]`. |
| `profile` | No | JSON object containing saved profile facts. Defaults to `{}`. |
| `model` | No | Configured model ID. Defaults to `openai/gpt-oss-20b`. |
| `files` | No | One or more supported attachments. |

Example request with a source file:

```bash
curl http://127.0.0.1:8000/chat \
  -F 'prompt=Summarize this file' \
  -F 'history=[]' \
  -F 'profile={}' \
  -F 'model=openai/gpt-oss-20b' \
  -F 'files=@./example.py'
```

A successful response includes `answer`, `quota`, token counts and token pieces when available, and extracted `attachmentContext`. The interface does not display input/output token sections for `allam-2-7b` or `qwen/qwen3.8-27b`. Token counts are not available for every model. Errors use a JSON `detail` field; rate-limit responses may also include quota data.

### `GET /languages`

Returns the translator's supported language codes and display names.

### `POST /translate`

Send `multipart/form-data` fields `text` (up to 8,000 characters) and `target_language` (a supported language code) to translate text for speech playback.

### `POST /translate-speech`

Send a `multipart/form-data` audio recording in `audio` and a supported `target_language`. Speech is automatically detected and transcribed before translation. Recordings are limited to 20 MB.

## Troubleshooting

- **`{"detail":"Method Not Allowed"}` or HTTP 405:** use `POST /chat` for chat requests and `GET /models` to load models. Opening `/chat` directly in a browser sends a `GET` request and is not supported.
- **Missing API key / HTTP 503:** set `GROQ_API_KEY` in the server's environment, then restart the server.
- **Model list cannot load:** verify the API key and network access to Groq. The configured models are shown only when they are returned by the provider's catalog.
- **Rate limit / HTTP 429:** select an available model in the model picker or wait for the provider's quota to reset.
- **Attachment rejected:** check that the format is supported and that the file count, total size, image dimensions, PDF page count, and extracted text are within the limits above.
- **Image request fails:** the selected model may not support image input. Choose a vision-capable model or remove the image.
- For other failures, inspect the Uvicorn terminal output and the browser's developer console for the server response and details.

## Privacy and data handling

- Chat history and saved profile facts are stored in the browser's `localStorage`; JB-Chat does not use a database for them.
- The browser sends the current message, relevant conversation history, saved profile, and attachments to the JB-Chat backend. The backend forwards relevant content to Groq to generate a response.
- When speech translation is used, microphone recordings are sent to the backend and forwarded to Groq for speech recognition and translation. Selected response text is sent to Groq when translated for speech playback. Audio is processed in memory and is not intentionally saved by the application.
- Read-aloud uses the browser's built-in speech synthesis; available voices depend on the browser and operating system.
- Uploaded files are processed in memory by the backend and are not intentionally saved by the application.
- Do not save or submit sensitive information unless you are comfortable sharing it with the configured AI provider. Clear profile facts in **Saved personal info** and clear browser storage to remove locally saved data.

## Project structure

```text
.
├── app.py                 # FastAPI routes and Groq integration
├── requirements.txt       # Python dependencies
└── static/
    ├── app.js             # Chat, model, attachment, and storage behavior
    ├── favicon.svg
    ├── index.html         # Application page
    └── styles.css         # Layout and theme
```

## Development checks

From the project directory, run:

```bash
node --check static/app.js
python -m compileall -q app.py
```

## Deployment notes

`--reload` is intended for local development, not production. Before making the application publicly accessible, configure a production ASGI server, HTTPS, appropriate authentication and request rate limits, and secure secret management. The application currently forwards chat content and attachments to Groq and does not provide user authentication.

## Quick-start checklist

1. Create and activate a Python virtual environment.
2. Install dependencies with `python -m pip install -r requirements.txt`.
3. Set `GROQ_API_KEY` in the server environment.
4. Start the server with `python -m uvicorn app:app --reload`.
5. Visit [http://127.0.0.1:8000](http://127.0.0.1:8000) and send a test message.
