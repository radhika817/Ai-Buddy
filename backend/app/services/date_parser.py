import re
from datetime import datetime, timedelta, date
from typing import Optional
import dateparser

UNCLEAR_PHRASES = {
    "asap",
    "soon",
    "tbd",
    "unclear",
    "when possible",
    "eventually",
    "later",
    "next sprint",
    "next week",
    "next month",
    "next quarter",
    "next year",
    "future",
    "someday",
    "no deadline",
    "none",
    "n/a",
    "pending",
    "ongoing",
    "high",
    "urgent",
    "priority",
    "immediately",
    "eod",
    "eow",
    "end of day",
    "end of week",
    "end of month",
    "end of quarter",
    "end of year",
    "to be determined",
    "not specified",
    "flexible",
}

WEEKDAYS = {
    "monday": 0,
    "tuesday": 1,
    "wednesday": 2,
    "thursday": 3,
    "friday": 4,
    "saturday": 5,
    "sunday": 6,
    "mon": 0,
    "tue": 1,
    "wed": 2,
    "thu": 3,
    "fri": 4,
    "sat": 5,
    "sun": 6,
}


def parse_deadline_date(
    deadline_text: Optional[str], base_datetime: Optional[datetime] = None
) -> Optional[date]:
    """
    Parses deadline_text into a real date relative to base_datetime.
    Only parses clear cases (e.g., 'tomorrow', 'Friday', 'next Monday', '15 October').
    Returns None if unclear or absent.
    """
    if not deadline_text or not isinstance(deadline_text, str):
        return None

    raw = deadline_text.strip()
    if not raw:
        return None

    cleaned = raw.lower()
    # Strip leading prepositions: "by", "before", "on", "due", "until"
    cleaned = re.sub(r"^(by|before|on|due|until)\s+", "", cleaned).strip()
    # Strip trailing times e.g. "at 5pm", "by 5:00 pm"
    cleaned = re.sub(r"\s+at\s+\d{1,2}(:\d{2})?\s*(am|pm)?$", "", cleaned).strip()
    # Strip punctuation at edges
    cleaned = cleaned.strip(".,;!?\"'")

    if not cleaned or cleaned in UNCLEAR_PHRASES:
        return None

    for phrase in UNCLEAR_PHRASES:
        if cleaned == phrase or cleaned.startswith(phrase + " ") or cleaned.endswith(" " + phrase):
            return None

    # Reject bare numbers like '1', '2', '20'
    if cleaned.isdigit():
        return None

    if not base_datetime:
        base_datetime = datetime.utcnow()
    elif hasattr(base_datetime, "tzinfo") and base_datetime.tzinfo:
        base_datetime = base_datetime.replace(tzinfo=None)

    # 1. Clear rule for 'next <weekday>'
    m_next = re.match(r"^next\s+([a-z]+)$", cleaned)
    if m_next and m_next.group(1) in WEEKDAYS:
        target_wd = WEEKDAYS[m_next.group(1)]
        current_wd = base_datetime.weekday()
        days_ahead = (target_wd - current_wd) % 7
        if days_ahead == 0:
            days_ahead = 7
        return (base_datetime + timedelta(days=days_ahead)).date()

    # 2. Clear rule for 'this <weekday>'
    m_this = re.match(r"^this\s+([a-z]+)$", cleaned)
    if m_this and m_this.group(1) in WEEKDAYS:
        target_wd = WEEKDAYS[m_this.group(1)]
        current_wd = base_datetime.weekday()
        days_ahead = (target_wd - current_wd) % 7
        if days_ahead == 0:
            days_ahead = 7
        return (base_datetime + timedelta(days=days_ahead)).date()

    # 3. Clear rule for standalone weekday name e.g. 'Friday'
    if cleaned in WEEKDAYS:
        target_wd = WEEKDAYS[cleaned]
        current_wd = base_datetime.weekday()
        days_ahead = (target_wd - current_wd) % 7
        if days_ahead == 0:
            days_ahead = 7
        return (base_datetime + timedelta(days=days_ahead)).date()

    # 4. Use dateparser with relative base
    try:
        parsed = dateparser.parse(
            cleaned,
            settings={
                "RELATIVE_BASE": base_datetime,
                "PREFER_DATES_FROM": "future",
                "RETURN_AS_TIMEZONE_AWARE": False,
            },
        )
        if parsed:
            return parsed.date()
    except Exception:
        return None

    return None
