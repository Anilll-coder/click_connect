import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from google import genai
from google.genai import types
from configuration.config import settings
from models.models import User
from routes.auth import require_current_user
from utils.ratelimit import limiter

logger = logging.getLogger("clickconnect.ai")

router = APIRouter()

GEMINI_TIMEOUT_MS = 20_000

client = genai.Client(
    api_key=settings.api_key,
    http_options=types.HttpOptions(timeout=GEMINI_TIMEOUT_MS),
)

SYSTEM_PROMPT = (
    "You are a specialized AI assistant designed STRICTLY for content writing and language translation.\n"
    "Your core functions are:\n"
    "1. Content Writing: Generate high-quality articles, posts, summaries, or creative text as requested.\n"
    "2. Language Conversion: Translate text accurately between languages.\n"
    "\n"
    "STRICT RESTRICTIONS:\n"
    "- Do NOT answer general knowledge questions, trivia, or unnecessary queries unrelated to content creation or translation.\n"
    "- Do NOT provide personal details, opinions, or engage in casual conversation.\n"
    "- If a user asks a question outside your scope (e.g., 'What is the capital of France?', 'How are you?'), politely decline by stating you are a content writing and translation assistant only.\n"
    "- Detect the user's language and output content in that language unless asked otherwise.\n"
)

MAX_QUERY_LENGTH = 2000
MAX_OUTPUT_TOKENS = 1024

# Tried in order; free-tier Gemini models only. If one errors out (quota,
# transient outage, timeout, etc.) we fall through to the next rather than
# failing the request outright.
FALLBACK_MODELS = [
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
]


class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=MAX_QUERY_LENGTH)


class ChatResponse(BaseModel):
    reply: str


@router.post("/api/chat", response_model=ChatResponse)
@limiter.limit("15/minute")
def chatbot(
    request: Request,
    payload: ChatRequest,
    current_user: User = Depends(require_current_user),
):
    """Authenticated, rate-limited, and length-bounded proxy to Gemini.

    Auth + rate limiting exist specifically to stop anonymous callers from
    draining the (paid) Gemini quota; the frontend never talks to Gemini
    directly and the API key never leaves this server.

    Tries each model in FALLBACK_MODELS in turn — if one errors (quota
    exhausted, transient outage, timeout), the next free model is tried
    before giving up.
    """
    last_error = None
    for model_name in FALLBACK_MODELS:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=payload.query,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    max_output_tokens=MAX_OUTPUT_TOKENS,
                ),
            )
            if model_name != FALLBACK_MODELS[0]:
                logger.info("Gemini fallback model succeeded: model=%s user_id=%s", model_name, current_user.id)
            return ChatResponse(reply=response.text or "")
        except Exception as exc:
            last_error = exc
            logger.warning("Gemini model failed, trying next: model=%s user_id=%s error=%s", model_name, current_user.id, exc)

    logger.error("All Gemini fallback models failed for user_id=%s", current_user.id, exc_info=last_error)
    raise HTTPException(status_code=502, detail="AI assistant is temporarily unavailable. Please try again.")
