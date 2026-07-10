"""Topic detection and segment summarization."""

import logging
import re
from collections import defaultdict

logger = logging.getLogger(__name__)

# Semantic concept groups for related-term matching
CONCEPT_GROUPS = {
    "testing": ["testing", "qa", "quality assurance", "test case", "test plan", "uat", "integration testing"],
    "bugs": ["bug", "defect", "issue", "error", "failure", "crash", "broken"],
    "budget": ["budget", "cost", "pricing", "fee", "fees", "expense", "financial"],
    "deployment": ["deployment", "deploy", "release", "production", "rollout", "ci/cd"],
    "login": ["login", "authentication", "auth", "sign in", "password", "access"],
    "client": ["client", "customer", "stakeholder", "user complaint"],
    "action": ["action item", "todo", "follow up", "next step", "assign"],
}


def detect_topics(segments: list[dict], duration_seconds: float) -> dict:
    if not segments:
        return {"topics": []}

    window_size = 60.0
    windows: list[dict] = []
    current_start = segments[0]["start"]
    current_texts: list[str] = []
    current_end = segments[0]["end"]

    for seg in segments:
        if seg["start"] - current_start > window_size and current_texts:
            windows.append({
                "start": current_start,
                "end": current_end,
                "text": " ".join(current_texts),
            })
            current_start = seg["start"]
            current_texts = []
        current_texts.append(seg["text"])
        current_end = seg["end"]

    if current_texts:
        windows.append({
            "start": current_start,
            "end": current_end,
            "text": " ".join(current_texts),
        })

    scored_windows = []
    for window in windows:
        text_lower = window["text"].lower()
        scores = {}
        for topic, keywords in CONCEPT_GROUPS.items():
            score = sum(1 for kw in keywords if kw in text_lower)
            if score > 0:
                scores[topic] = score
        if scores:
            top_topic = max(scores, key=scores.get)
            scored_windows.append({**window, "topic_key": top_topic, "score": scores[top_topic]})

    # Merge adjacent windows with same topic
    topics: list[dict] = []
    for window in scored_windows:
        title = _topic_title(window["topic_key"])
        summary = _summarize_text(window["text"])
        if topics and topics[-1]["title"] == title and window["start"] - topics[-1]["end_time"] < 30:
            topics[-1]["end_time"] = window["end"]
            topics[-1]["summary"] += " " + summary
        else:
            topics.append({
                "title": title,
                "summary": summary,
                "start_time": window["start"],
                "end_time": window["end"],
                "confidence": min(window["score"] / 5.0, 1.0),
                "key_decisions": _extract_decisions(window["text"]),
                "action_items": _extract_action_items(window["text"]),
                "risks": _extract_risks(window["text"]),
                "issues_raised": _extract_issues(window["text"]),
            })

    return {"topics": topics}


def semantic_search_local(
    query: str,
    chunks: list[dict],
    embeddings: list[list[float]] | None = None,
    top_k: int = 5,
) -> dict:
    from app.services.embeddings import embed_query, generate_embeddings
    import numpy as np

    query_vec = np.array(embed_query(query))
    if embeddings is None:
        result = generate_embeddings(chunks)
        embeddings = result["embeddings"]

    scores = []
    for i, emb in enumerate(embeddings):
        chunk_vec = np.array(emb)
        similarity = float(np.dot(query_vec, chunk_vec))
        scores.append((similarity, i))

    scores.sort(reverse=True)
    results = []
    for similarity, idx in scores[:top_k]:
        chunk = chunks[idx]
        results.append({
            "chunk_id": chunk.get("id"),
            "confidence": round(similarity, 4),
            "summary": _summarize_text(chunk.get("text", ""), query),
        })
    return {"results": results}


def summarize_segment(text: str, query: str | None = None) -> dict:
    return {"summary": _summarize_text(text, query)}


def _topic_title(key: str) -> str:
    titles = {
        "testing": "Testing Discussion",
        "bugs": "Bug & Issue Discussion",
        "budget": "Budget Discussion",
        "deployment": "Deployment Discussion",
        "login": "Login & Authentication Discussion",
        "client": "Client Discussion",
        "action": "Action Items",
    }
    return titles.get(key, key.replace("_", " ").title() + " Discussion")


def _summarize_text(text: str, query: str | None = None) -> str:
    sentences = re.split(r'[.!?]+', text)
    sentences = [s.strip() for s in sentences if len(s.strip()) > 10]
    if not sentences:
        return text[:200]
    if query:
        query_terms = set(query.lower().split())
        scored = []
        for s in sentences:
            s_lower = s.lower()
            score = sum(1 for t in query_terms if t in s_lower)
            scored.append((score, s))
        scored.sort(reverse=True)
        top = [s for _, s in scored[:3]]
        return ". ".join(top) + "."
    return ". ".join(sentences[:3]) + "."


def _extract_decisions(text: str) -> list[str]:
    patterns = [r"we (?:decided|agreed|will)", r"decision is", r"let's go with"]
    return _extract_matches(text, patterns)


def _extract_action_items(text: str) -> list[str]:
    patterns = [r"(?:need to|should|must|will) \w+", r"action item", r"follow up"]
    return _extract_matches(text, patterns)


def _extract_risks(text: str) -> list[str]:
    patterns = [r"risk", r"concern", r"worried", r"might fail"]
    return _extract_matches(text, patterns)


def _extract_issues(text: str) -> list[str]:
    patterns = [r"issue", r"problem", r"bug", r"error", r"failed"]
    return _extract_matches(text, patterns)


def _extract_matches(text: str, patterns: list[str]) -> list[str]:
    results = []
    text_lower = text.lower()
    for pattern in patterns:
        for match in re.finditer(pattern, text_lower):
            start = max(0, match.start() - 20)
            end = min(len(text), match.end() + 80)
            snippet = text[start:end].strip()
            if snippet and snippet not in results:
                results.append(snippet)
    return results[:5]
