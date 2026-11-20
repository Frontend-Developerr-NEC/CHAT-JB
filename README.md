# JB-Chat

JB-Chat is a lightweight, browser-based AI chat application built with FastAPI and the Groq API. It combines a responsive chat interface with model selection, file attachments, copy controls, token and quota information, and optional browser-local chat and profile storage.

## Features

- **Multiple Groq models:** choose from `openai/gpt-oss-20b` (default), `openai/gpt-oss-120b`, `qwen/qwen3.8-27b`.
- **Chat history:** conversations are saved in the current browser using `localStorage`.
- **File attachments:** attach up to five files with a combined size of 10 MB per message. Supported inputs include images, PDFs, DOCX documents, and UTF-8 text or source files.
- **Image and document processing:** images are resized and converted to JPEG; PDF and DOCX text is extracted; scanned PDFs are not OCR-processed.
- **Saved personal info:** automatically remember supported statements such as names, relationships, preferences, and facts written as “My … is …”. You can also rename the assistant with requests such as “Change your name to …”; the chosen name is saved in this browser and used for later replies. Use “Remember that …” for other useful facts. Review or remove saved facts in the browser. Facts labeled as passwords, financial account/card numbers, IDs, or health details are excluded from profile extraction, but this text-pattern check cannot catch every sensitive detail.
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

### 5. Set an application access token

All provider-backed endpoints require a random bearer access token of at least 32 characters. Generate a strong random token and set `APP_ACCESS_TOKEN` in the same terminal session. Keep it private and do not commit it.

For this workspace, a cryptographically secure 64-character URL-safe token has been generated and stored in the owner-only `.env` file. The application loads `.env` automatically. The file is excluded from Git and is protected with `0600` permissions. Retrieve the token only from the local server machine when prompted by the browser:

```bash
sed -n 's/^APP_ACCESS_TOKEN=//p' .env
```

**Linux / macOS**

```bash
export APP_ACCESS_TOKEN="$(python -c 'import secrets; print(secrets.token_urlsafe(32))')"
```

**Windows PowerShell**

```powershell
$env:APP_ACCESS_TOKEN = python -c "import secrets; print(secrets.token_urlsafe(32))"
```

The browser asks for the token the first time a provider-backed feature is used and keeps it in memory only for the current page. API clients must send `Authorization: Bearer <APP_ACCESS_TOKEN>`. Requests to `/chat`, `/translate`, and `/translate-speech` also require a `Content-Length` header, reject cross-origin browser origins, and have route-specific total-body size limits.

### 6. Start the application

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

- Maximum **5 files** and **10 MB combined** per message; the complete `/chat` request body is limited to 12 MB.
- **Images:** common image formats are decoded, orientation-corrected, reduced to at most 2048 × 2048 pixels, and converted to JPEG. Images larger than 40 megapixels are rejected. Image understanding depends on the selected model's capabilities.
- **PDF:** text is extracted from up to 100 pages. Scanned/image-only pages are not OCR-processed.
- **DOCX:** text from paragraphs and tables is extracted. Legacy `.doc` files are not supported.
- **Text and source code:** UTF-8 text and common programming-language files are included as text, up to 100,000 extracted characters across attachments.
- Attachments are processed in memory for the request; the application does not intentionally save uploaded files.

## API

### `GET /models`

Returns the configured model IDs that are currently present in Groq's model catalog. Requires `GROQ_API_KEY` and `Authorization: Bearer <APP_ACCESS_TOKEN>`.

### `POST /chat`

Send an authenticated `multipart/form-data` request. The `files` field may be repeated for multiple attachments.

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
  -H "Authorization: Bearer $APP_ACCESS_TOKEN" \
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

Send `multipart/form-data` fields `text` (up to 8,000 characters) and `target_language` (a supported language code) to translate text for speech playback. Requires the bearer access token.

### `POST /translate-speech`

Send an authenticated `multipart/form-data` audio recording in `audio` and a supported `target_language`. Speech is automatically detected and transcribed before translation. Recordings are limited to 20 MB and the complete request body is limited to 21 MB.

## Troubleshooting

- **`{"detail":"Method Not Allowed"}` or HTTP 405:** use `POST /chat` for chat requests and `GET /models` to load models. Opening `/chat` directly in a browser sends a `GET` request and is not supported.
- **Missing API key / HTTP 503:** set `GROQ_API_KEY` in the server's environment, then restart the server.
- **Access token missing / HTTP 503:** set `APP_ACCESS_TOKEN` in the server environment and restart the server.
- **Access denied / HTTP 401:** enter the correct `APP_ACCESS_TOKEN` in the browser prompt or send it as a bearer token in the `Authorization` header.
- **Model list cannot load:** verify the API key and network access to Groq. The configured models are shown only when they are returned by the provider's catalog.
- **Rate limit / HTTP 429:** select an available model in the model picker or wait for the provider's quota to reset.
- **Attachment rejected:** check that the format is supported and that the file count, total size, image dimensions, PDF page count, and extracted text are within the limits above.
- **Image request fails:** the selected model may not support image input. Choose a vision-capable model or remove the image.
- For other failures, inspect the Uvicorn terminal output and the browser's developer console for the server response and details.

## Privacy and data handling

- Chat history and saved profile facts are stored in the browser's `localStorage`; JB-Chat does not use a database for them. The profile extractor recognizes common “My … is/are …” statements, preference statements such as “I like …”, requests to rename the assistant, and explicit “Remember that …” notes. Profile facts are included with chat requests so the model can answer relevant follow-ups and personalize suggestions; the model should ask when needed recommendation details are missing.
- Browser security headers include a restrictive Content Security Policy, frame restrictions, `nosniff`, and `no-store`; HSTS is sent only when the application sees an HTTPS request. Ensure TLS is enforced at the deployment proxy and configure its body-size limits as an additional boundary.
- The browser sends the current message, relevant conversation history, saved profile, and attachments to the JB-Chat backend. The backend forwards relevant content to Groq to generate a response.
- When speech translation is used, microphone recordings are sent to the backend and forwarded to Groq for speech recognition and translation. Selected response text is sent to Groq when translated for speech playback. Audio is processed in memory and is not intentionally saved by the application.
- Read-aloud uses the browser's built-in speech synthesis; available voices depend on the browser and operating system.
- Uploaded files are processed in memory by the backend and are not intentionally saved by the application.
- Profile extraction skips facts labeled as passwords, access tokens, account/card numbers, government IDs, and health details, but this is a basic text-pattern safeguard and cannot identify every sensitive detail. Full chat history is still stored in browser `localStorage`, including messages that were not extracted as profile facts; recent conversation turns and the profile are sent to Groq with requests. Do not submit confidential information unless you are comfortable sharing it with the configured AI provider. Remove profile facts in **Saved personal info**, delete conversations in the chat list, and clear browser storage to remove locally saved data.

## Security controls

### Authentication and authorization

- Provider-backed routes (`/models`, `/chat`, `/translate`, and `/translate-speech`) require a bearer access token from `APP_ACCESS_TOKEN`.
- The token must contain at least 32 ASCII characters; it is checked with constant-time comparison.
- The browser stores the bearer token only in page memory and prompts for it instead of sending it through the URL or persisting it in `localStorage`.
- This shared-token mode provides application-level authorization. For personal accounts or multiple roles, replace it with server-side sessions or a short-lived signed identity token in front of the provider routes.

### Provider API key protection

- `GROQ_API_KEY` is read only from the server environment.
- It is validated before an OpenAI-compatible Groq client is created and is never included in frontend code or API responses.
- Use a secret manager or deployment platform secret injection in production. Rotate the key if it may have been exposed and never commit an `.env` file containing credentials.

### Input validation

- Prompt, history, profile, translation text, filenames, file types, attachment counts, and attachment sizes are checked on the server.
- Chat and translation text reject unsupported control characters and empty normalized values.
- JSON history/profile payloads are type-checked and bounded; upload processing is bounded for bytes, image dimensions, PDF pages, DOCX uncompressed size, and extracted text.
- The provider route body is limited, and POST requests require `Content-Length`, same-origin browser `Origin`, and bearer authorization.

### Rate limiting and production security

- In-process per-IP, per-route limits protect provider usage in a 60-second window. Configure them with `CHAT_RATE_LIMIT`, `TRANSLATE_RATE_LIMIT`, `SPEECH_RATE_LIMIT`, and `MODELS_RATE_LIMIT`.
- Responses include restrictive CSP, frame, MIME, cache, referrer, permissions, opener, resource-policy, and HSTS headers.
- Set `ENVIRONMENT=production` to disable interactive Swagger/ReDoc/OpenAPI documentation. Keep the application behind HTTPS and a production reverse proxy.
- The built-in in-memory limiter is suitable for a single process only. Use a shared Redis-backed limiter and centralized authentication for horizontally scaled deployments.

### Five-minute server keepalive

- The browser calls the public, lightweight `GET /health` endpoint every five minutes while the page remains open.
- For server-side keepalives that continue without an open browser, set `KEEP_ALIVE_URL` to the deployment's public HTTPS health URL:

```bash
export KEEP_ALIVE_URL="https://your-server.example/health"
export KEEP_ALIVE_INTERVAL_SECONDS=300
```

- The server-side interval is fixed to at least 300 seconds and runs with a 10-second HTTP timeout.
- `/health` does not require authentication and does not call Groq or use the provider API key.

## Google sign-in setup

1. Create an OAuth 2.0 Web application in Google Cloud Console.
2. Add the exact deployed callback URL as an authorized redirect URI:

```text
https://YOUR-SERVICE.onrender.com/auth/google/callback
```

3. Configure these Render environment variables:

```text
GOOGLE_CLIENT_ID=your_google_oicd_client_id
GOOGLE_CLIENT_SECRET=your_google_oicd_client_secret
GOOGLE_REDIRECT_URI=https://YOUR-SERVICE.onrender.com/auth/google/callback
SESSION_SECRET=a_random_value_of_at_least_32_characters
```

4. Optionally restrict sign-in to a workspace domain:

```text
GOOGLE_ALLOWED_DOMAIN=example.com
```

The login button appears in the top bar. A successful Google login creates an HTTP-only, signed session cookie. The cookie lasts seven days and is secure when `ENVIRONMENT=production`. `APP_ACCESS_TOKEN` remains available as an API-client fallback; browser users no longer need to enter or know it.

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

`--reload` is intended for local development, not production. The application protects provider-backed routes with a shared bearer token, not per-user accounts or quotas. Before making it publicly accessible, configure a production ASGI server, HTTPS, per-user authentication and request rate limits at the reverse proxy or hosting layer, and secure secret management. HSTS is sent only when the ASGI request scheme is HTTPS; configure it at the TLS-terminating proxy if HTTPS is terminated before the app.

## Quick-start checklist

1. Create and activate a Python virtual environment.
2. Install dependencies with `python -m pip install -r requirements.txt`.
3. Set `GROQ_API_KEY` in the server environment.
4. Set `APP_ACCESS_TOKEN` to a random token of at least 32 characters.
5. Start the server with `python -m uvicorn app:app --reload`.
6. Visit [http://127.0.0.1:8000](http://127.0.0.1:8000), enter the access token when prompted, and send a test message.
