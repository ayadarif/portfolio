"""Strip personal data from review text before any model sees it.

Order matters: emails and URLs first (they contain digits), then phone-like and long number runs.
This is pattern matching, so it will miss some things and over-strip others. It errs toward stripping.
"""
import re

PATTERNS = [
    ("EMAIL", re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")),
    ("HANDLE", re.compile(r"(?<![\w.])@\w{2,}")),
    ("URL", re.compile(r"(?:https?://|www\.)\S+", re.I)),
    # Nigerian and international phone numbers: +234..., 0803..., with optional spaces or dashes.
    ("PHONE", re.compile(r"(?<!\w)(?:\+?234|0)[789][01]\d[\s-]?\d{3}[\s-]?\d{4}(?!\d)")),
    ("PHONE", re.compile(r"(?<!\w)\+\d{1,3}[\s-]?\d{2,4}[\s-]?\d{3,4}[\s-]?\d{3,4}(?!\d)")),
    # Card numbers: 13 to 19 digits, optionally grouped.
    ("CARD", re.compile(r"(?<!\d)(?:\d[\s-]?){12,18}\d(?!\d)")),
    # Account numbers, BVN, NIN and similar: any run of 9 or more digits (Nigerian NUBAN is 10, BVN and NIN are 11).
    ("NUMBER", re.compile(r"(?<!\d)\d{9,}(?!\d)")),
    # Transaction references: long mixed letters and digits, 12+ characters, containing both.
    ("REF", re.compile(r"(?<![A-Za-z0-9])(?=[A-Za-z0-9]*\d)(?=[A-Za-z0-9]*[A-Za-z])[A-Za-z0-9]{12,}(?![A-Za-z0-9])")),
]


def strip_pii(text: str) -> tuple[str, int]:
    """Return the cleaned text and how many substitutions were made."""
    total = 0
    for label, pat in PATTERNS:
        text, n = pat.subn(f"[{label}]", text)
        total += n
    return text, total
