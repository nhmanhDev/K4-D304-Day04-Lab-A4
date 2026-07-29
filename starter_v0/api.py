"""
FastAPI backend for Research Agent UI.
Run with:  uvicorn api:app --reload --port 8000
"""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

# Ensure starter_v0 is on the path
ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from env_loader import load_lab_env
from providers import make_provider
from tools import load_tool_declarations, to_openai_tools

load_lab_env(ROOT)

# ── Lazy-load artifacts ────────────────────────────────────────────────────────
ARTIFACTS_DIR = ROOT / "artifacts"


def _load_system_prompt() -> str:
    return (ARTIFACTS_DIR / "system_prompt.md").read_text(encoding="utf-8")


def _load_tools() -> list[dict[str, Any]]:
    decls = load_tool_declarations(ARTIFACTS_DIR / "tools.yaml")
    return to_openai_tools(decls)


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="Research Agent API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    provider: str = "gemini"
    version: str = "v1"
    history: list[dict[str, str]] = []
    max_tool_rounds: int = 4


class ChatResponse(BaseModel):
    assistant_text: str
    status: str
    rounds: list[dict[str, Any]]
    tool_events: list[dict[str, Any]]


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    # Import here to avoid circular issues at module load
    from chat import run_model_tool_loop

    try:
        provider = make_provider(req.provider)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Provider error: {exc}") from exc

    system_prompt = _load_system_prompt()
    tools = _load_tools()

    messages: list[dict[str, str]] = [
        {"role": "system", "content": system_prompt},
        *req.history,
        {"role": "user", "content": req.message},
    ]

    try:
        result = run_model_tool_loop(
            provider=provider,
            messages=messages,
            tools=tools,
            model=None,
            max_tool_rounds=req.max_tool_rounds,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return ChatResponse(
        assistant_text=result.get("assistant_text", ""),
        status=result.get("status", "answered"),
        rounds=result.get("rounds", []),
        tool_events=result.get("tool_events", []),
    )
