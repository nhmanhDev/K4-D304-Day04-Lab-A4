from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Literal

# chat.py prints emoji for each tool call; on Windows the default console
# codepage (cp1252/cp936) can't encode them and raises UnicodeEncodeError.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from chat import now_iso, run_model_tool_loop, safe_slug, trim_history, write_transcript
from providers import make_provider
from tools import load_tool_declarations, to_openai_tools
from versioning import artifact_version_dict, build_artifact_version

ROOT = Path(__file__).parent
ARTIFACTS_DIR = ROOT / "artifacts"
TRANSCRIPTS_DIR = ROOT / "transcripts"
UI_DIST = ROOT / "ui" / "dist"

app = FastAPI(title="Research Agent UI")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_provider_cache: dict[str, Any] = {}


def get_provider(name: str):
    if name not in _provider_cache:
        try:
            _provider_cache[name] = make_provider(name)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _provider_cache[name]


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str
    version: str = "v0"
    provider: str = "openrouter"
    model: str | None = None
    history: list[ChatTurn] = []
    session_id: str | None = None
    history_window: int = 5


class ChatResponse(BaseModel):
    status: str
    assistant_text: str
    rounds: list[dict[str, Any]]
    tool_events: list[dict[str, Any]]
    artifact_version: str
    session_id: str


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/tools")
def list_tools() -> list[dict[str, str]]:
    tools_path = ARTIFACTS_DIR / "tools.yaml"
    declarations = load_tool_declarations(tools_path)
    return [
        {
            "name": item["name"],
            "description": (item.get("description") or "").strip().splitlines()[0] if item.get("description") else "",
        }
        for item in declarations
    ]


@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest) -> ChatResponse:
    system_prompt_path = ARTIFACTS_DIR / "system_prompt.md"
    tools_path = ARTIFACTS_DIR / "tools.yaml"
    if not system_prompt_path.exists() or not tools_path.exists():
        raise HTTPException(status_code=500, detail="Missing artifacts/system_prompt.md or artifacts/tools.yaml")

    system_prompt = system_prompt_path.read_text(encoding="utf-8")
    tool_declarations = load_tool_declarations(tools_path)
    openai_tools = to_openai_tools(tool_declarations)
    provider = get_provider(req.provider)
    selected_model = req.model or getattr(provider, "default_model", None)
    artifact_version = build_artifact_version(req.version, system_prompt_path, tools_path)

    trimmed_history = trim_history(req.history, req.history_window)
    messages = [
        {"role": "system", "content": system_prompt},
        *[{"role": turn.role, "content": turn.content} for turn in trimmed_history],
        {"role": "user", "content": req.message},
    ]

    try:
        result = run_model_tool_loop(
            provider=provider,
            messages=messages,
            tools=openai_tools,
            model=req.model,
            max_tool_rounds=4,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"{type(exc).__name__}: {exc}") from exc

    session_id = req.session_id or "_".join([
        safe_slug(req.version),
        safe_slug(req.provider),
        datetime.now().strftime("%Y%m%dT%H%M%S%f"),
    ])
    transcript_path = TRANSCRIPTS_DIR / f"{session_id}.transcript.json"
    existing_turns: list[dict[str, Any]] = []
    if transcript_path.exists():
        existing_turns = json.loads(transcript_path.read_text(encoding="utf-8")).get("turns", [])

    turn_record = {
        "turn_index": len(existing_turns) + 1,
        "started_at": now_iso(),
        "user": req.message,
        **result,
        "ended_at": now_iso(),
    }
    transcript = {
        "transcript_id": session_id,
        **artifact_version_dict(artifact_version),
        "provider": req.provider,
        "model": selected_model,
        "system_prompt": str(system_prompt_path),
        "tools": str(tools_path),
        "created_at": existing_turns[0]["started_at"] if existing_turns else now_iso(),
        "turns": [*existing_turns, turn_record],
    }
    write_transcript(transcript_path, transcript)

    return ChatResponse(
        status=result["status"],
        assistant_text=result["assistant_text"],
        rounds=result["rounds"],
        tool_events=result["tool_events"],
        artifact_version=artifact_version.artifact_version,
        session_id=session_id,
    )


if UI_DIST.exists():
    app.mount("/", StaticFiles(directory=str(UI_DIST), html=True), name="ui")
