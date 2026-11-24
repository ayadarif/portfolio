"""JSON schemas sent to the model, and the stricter checks the code applies to what comes back."""
from __future__ import annotations


def classify_schema(slugs: list) -> dict:
    return {
        "type": "object",
        "properties": {"items": {"type": "array", "items": {
            "type": "object",
            "properties": {
                "id": {"type": "string"},
                "categories": {"type": "array", "items": {"type": "string", "enum": slugs}, "minItems": 1, "maxItems": 2},
                "severity": {"type": "integer", "enum": [1, 2, 3]},
                "summary": {"type": "string"},
            },
            "required": ["id", "categories", "severity", "summary"],
        }}},
        "required": ["items"],
    }


def check_classify(out: dict, ids: list, slugs: list) -> "str | None":
    items = out.get("items")
    if not isinstance(items, list):
        return "items is not a list"
    got = [i.get("id") for i in items if isinstance(i, dict)]
    if got != ids:
        return f"ids do not match the batch (got {len(got)}, expected {len(ids)})"
    for i in items:
        cats = i.get("categories")
        if not isinstance(cats, list) or not 1 <= len(cats) <= 2 or any(c not in slugs for c in cats) or len(set(cats)) != len(cats):
            return f"bad categories for {i.get('id')}"
        if i.get("severity") not in (1, 2, 3) or isinstance(i.get("severity"), bool):
            return f"bad severity for {i.get('id')}"
        if not isinstance(i.get("summary"), str) or not i["summary"].strip():
            return f"missing summary for {i.get('id')}"
    return None


THEME_SCHEMA = {
    "type": "object",
    "properties": {"themes": {"type": "array", "items": {
        "type": "object",
        "properties": {"name": {"type": "string"}, "description": {"type": "string"}, "ids": {"type": "array", "items": {"type": "string"}}},
        "required": ["name", "description", "ids"],
    }}},
    "required": ["themes"],
}


def check_themes(out: dict, valid_ids: set) -> "str | None":
    themes = out.get("themes")
    if not isinstance(themes, list) or len(themes) > 6:
        return "themes missing or more than 6"
    seen: set = set()
    for t in themes:
        if not isinstance(t, dict) or not isinstance(t.get("name"), str) or not t["name"].strip() or not isinstance(t.get("ids"), list):
            return "malformed theme"
        for i in t["ids"]:
            if i not in valid_ids:
                return f"unknown id {i}"
            if i in seen:
                return f"id {i} in two themes"
            seen.add(i)
    return None


EXCERPT_SCHEMA = {
    "type": "object",
    "properties": {"categories": {"type": "array", "items": {
        "type": "object",
        "properties": {"category": {"type": "string"}, "quotes": {"type": "array", "items": {
            "type": "object", "properties": {"id": {"type": "string"}, "quote": {"type": "string"}}, "required": ["id", "quote"]}}},
        "required": ["category", "quotes"],
    }}},
    "required": ["categories"],
}


def check_excerpts(out: dict) -> "str | None":
    cats = out.get("categories")
    if not isinstance(cats, list):
        return "categories is not a list"
    for c in cats:
        if not isinstance(c, dict) or not isinstance(c.get("category"), str) or not isinstance(c.get("quotes"), list):
            return "malformed category"
        for q in c["quotes"]:
            if not isinstance(q, dict) or not isinstance(q.get("id"), str) or not isinstance(q.get("quote"), str):
                return "malformed quote"
    return None
