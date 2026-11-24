"""Wraps `claude -p` (Claude Code headless mode) so the pipeline can ask for validated JSON.

Safety, per docs/feedback-triage-spec.md:
- Pre-flight: must be logged in with claude.ai. ANTHROPIC_API_KEY must not be set (it would switch to paid API billing).
- Never `--bare`. Each call runs from an empty temp directory with `--safe-mode` (no CLAUDE.md, hooks, MCP), no tools,
  no session saved, stdin closed, one JSON schema, a pinned model.
- Every answer is cached on disk by a hash of (model, system prompt, user prompt, schema), so nothing is re-run by accident.
"""
from __future__ import annotations

import hashlib
import json
import os
import subprocess
import tempfile
from pathlib import Path
from typing import Callable

MODEL = "claude-sonnet-5-5"
MAX_RETRIES = 2  # a call is tried 1 + MAX_RETRIES times if the answer fails validation

Validator = Callable[[dict], "str | None"]  # returns an error message, or None if the answer is fine


class PipelineError(RuntimeError):
    pass


def preflight() -> dict:
    """Abort unless Claude Code is logged in with a claude.ai account and no API key is set."""
    if os.environ.get("ANTHROPIC_API_KEY"):
        raise PipelineError("ANTHROPIC_API_KEY is set. Unset it: this pipeline must run on the claude.ai login, not the paid API.")
    try:
        out = subprocess.run(["claude", "auth", "status"], capture_output=True, text=True, timeout=30, stdin=subprocess.DEVNULL)
        status = json.loads(out.stdout)
        version = subprocess.run(["claude", "--version"], capture_output=True, text=True, timeout=30, stdin=subprocess.DEVNULL).stdout.strip()
    except (OSError, ValueError, subprocess.SubprocessError) as e:
        raise PipelineError(f"Could not read `claude auth status`: {e}")
    if not status.get("loggedIn") or status.get("authMethod") != "claude.ai":
        raise PipelineError(f"Need a claude.ai login, got: {status}")
    return {"claude_code_version": version, "auth_method": status["authMethod"], "model": MODEL}


def cache_key(system: str, user: str, schema: dict, model: str = MODEL) -> str:
    blob = json.dumps({"m": model, "s": system, "u": user, "j": schema}, sort_keys=True)
    return hashlib.sha256(blob.encode()).hexdigest()


class ClaudeRunner:
    """Callable: runner(system, user, schema, validate, label) -> dict. Counts live calls and cache hits."""

    def __init__(self, cache_dir: Path, model: str = MODEL, timeout: int = 600, log: Callable[[str], None] = print):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.model, self.timeout, self.log = model, timeout, log
        self.live_calls = 0
        self.cache_hits = 0
        self.failures: list[dict] = []

    def _once(self, system: str, user: str, schema: dict) -> dict:
        cmd = [
            "claude", "-p", "--safe-mode", "--tools", "", "--model", self.model, "--no-session-persistence",
            "--output-format", "json", "--system-prompt", system, "--json-schema", json.dumps(schema), user,
        ]
        env = {k: v for k, v in os.environ.items() if k != "ANTHROPIC_API_KEY"}
        with tempfile.TemporaryDirectory(prefix="triage-") as empty:
            p = subprocess.run(cmd, cwd=empty, env=env, capture_output=True, text=True, timeout=self.timeout, stdin=subprocess.DEVNULL)
        self.live_calls += 1
        if p.returncode != 0:
            raise PipelineError(f"claude exited {p.returncode}: {p.stderr[:300]}")
        data = json.loads(p.stdout)
        if data.get("is_error") or not isinstance(data.get("structured_output"), dict):
            raise PipelineError(f"No structured output: {str(data.get('result'))[:300]}")
        return data["structured_output"]

    def __call__(self, system: str, user: str, schema: dict, validate: Validator, label: str = "") -> "dict | None":
        key = cache_key(system, user, schema, self.model)
        path = self.cache_dir / f"{key}.json"
        if path.exists():
            cached = json.loads(path.read_text())
            if validate(cached) is None:
                self.cache_hits += 1
                return cached
        last = ""
        for attempt in range(1 + MAX_RETRIES):
            try:
                out = self._once(system, user, schema)
                err = validate(out)
            except (PipelineError, ValueError, subprocess.SubprocessError) as e:
                out, err = None, str(e)
            if err is None:
                path.write_text(json.dumps(out))
                return out
            last = err
            self.log(f"  {label}: attempt {attempt + 1} invalid ({err[:120]})")
        self.failures.append({"label": label, "error": last})
        return None
