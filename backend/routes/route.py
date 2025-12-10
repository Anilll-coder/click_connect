from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from google import genai
from google.genai import types
from configuration.config import settings

router = APIRouter()

client = genai.Client(api_key=settings.api_key)

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

class ChatRequest(BaseModel):
    query: str

class ChatResponse(BaseModel):
    reply: str

@router.post("/api/chat", response_model=ChatResponse)
def chatbot(payload: ChatRequest):
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=payload.query,
            config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
            ),
        )

        return ChatResponse(reply=response.text)

    except Exception as exc:
        print(exc)
        raise HTTPException(status_code=500, detail=f"AI Error: {exc}")
