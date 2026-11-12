import os

from fastapi import FastAPI, HTTPException
from openai import APIError, OpenAI
from pydantic import BaseModel, Field

app = FastAPI()


class ChatRequest(BaseModel):
    prompt: str = Field(min_length=1)


@app.post("/chat")
def chat(request: ChatRequest) -> dict[str, str]:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="The GROQ_API_KEY environment variable is not configured.",
        )

    client = OpenAI(
        base_url="https://api.groq.com/openai/v1",
        api_key=api_key,
    )
    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {"role": "system", "content": "You are a helpful coding assistant."},
                {"role": "user", "content": request.prompt},
            ],
            temperature=0.7,
        )
    except APIError as error:
        raise HTTPException(
            status_code=502,
            detail=f"The Groq API request failed: {error}",
        ) from error

    return {"answer": response.choices[0].message.content or ""}
