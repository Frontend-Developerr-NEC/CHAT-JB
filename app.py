import os
from collections.abc import Mapping
from pathlib import Path
from typing import Literal, get_args

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from openai import APIError, OpenAI, RateLimitError
from pydantic import BaseModel, Field

app = FastAPI()
FRONTEND_FILE = Path(__file__).parent / "static" / "index.html"
DEFAULT_MODEL = "openai/gpt-oss-120b"
ModelName = Literal[
    "openai/gpt-oss-20b",
    "openai/gpt-oss-120b",
    "qwen/qwen3.8-27b",
    "allam-2-7b",
]
ALLOWED_MODELS = get_args(ModelName)
app.mount("/static", StaticFiles(directory=FRONTEND_FILE.parent), name="static")


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=8000)


class ChatRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=8000)
    history: list[ChatTurn] = Field(default_factory=list, max_length=12)
    model: ModelName = DEFAULT_MODEL


def get_groq_client() -> OpenAI:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="The GROQ_API_KEY environment variable is not configured.",
        )
    return OpenAI(
        base_url="https://api.groq.com/openai/v1",
        api_key=api_key,
    )


def get_quota(headers: Mapping[str, str]) -> dict[str, int | None]:
    def number(name: str) -> int | None:
        value = headers.get(name)
        try:
            return int(value) if value is not None else None
        except (TypeError, ValueError):
            return None

    requests_limit = number("x-ratelimit-limit-requests")
    requests_remaining = number("x-ratelimit-remaining-requests")
    tokens_limit = number("x-ratelimit-limit-tokens")
    tokens_remaining = number("x-ratelimit-remaining-tokens")

    def used_percent(limit: int | None, remaining: int | None) -> int | None:
        if limit is None or remaining is None or limit <= 0:
            return None
        return min(100, max(0, round((limit - remaining) * 100 / limit)))

    return {
        "requests_used_percent": used_percent(requests_limit, requests_remaining),
        "tokens_used_percent": used_percent(tokens_limit, tokens_remaining),
        "requests_limit": requests_limit,
        "requests_remaining": requests_remaining,
        "tokens_limit": tokens_limit,
        "tokens_remaining": tokens_remaining,
    }


@app.get("/", include_in_schema=False)
def home() -> FileResponse:
    return FileResponse(FRONTEND_FILE)


@app.get("/models")
def models() -> dict[str, list[dict[str, str]]]:
    client = get_groq_client()
    try:
        available_models = client.models.list()
    except APIError as error:
        raise HTTPException(
            status_code=502,
            detail=f"Could not load models from Groq: {error}",
        ) from error
    return {
        "models": [
            {"id": model.id, "name": model.id}
            for model in available_models.data
            if model.id in ALLOWED_MODELS
        ]
    }


@app.post("/chat")
def chat(request: ChatRequest) -> JSONResponse:
    client = get_groq_client()
    try:
        raw_response = client.chat.completions.with_raw_response.create(
            model=request.model,
            messages=[
                {"role": "system", "content": "You are a helpful coding assistant."},
                *[
                    {"role": turn.role, "content": turn.content}
                    for turn in request.history
                ],
                {"role": "user", "content": request.prompt},
            ],
            temperature=0.7,
        )
        response = raw_response.parse()
    except RateLimitError as error:
        return JSONResponse(
            status_code=429,
            content={
                "detail": f"Groq's rate limit was reached for {request.model}. Choose another available model or try again later.",
                "quota": get_quota(error.response.headers),
            },
        )
    except APIError as error:
        raise HTTPException(
            status_code=502,
            detail=f"The Groq API request failed: {error}",
        ) from error

    return JSONResponse(
        content={
            "answer": response.choices[0].message.content or "",
            "quota": get_quota(raw_response.headers),
        }
    )
