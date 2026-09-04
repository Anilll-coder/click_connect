import re

# Letters, digits, underscore; must contain at least one letter so a bare
# number like "#2024" isn't treated as a tag.
HASHTAG_RE = re.compile(r"#(\w*[A-Za-z]\w*)")
MAX_TAG_LENGTH = 50


def extract_hashtags(text: str) -> list[str]:
    if not text:
        return []
    seen = []
    for match in HASHTAG_RE.findall(text):
        tag = match.lower()[:MAX_TAG_LENGTH]
        if tag and tag not in seen:
            seen.append(tag)
    return seen
