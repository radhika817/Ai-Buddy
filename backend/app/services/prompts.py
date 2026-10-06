"""
Prompt definitions for AI meeting intelligence.
Centralized prompt storage to make edits and tuning straightforward.
"""

SUMMARY_SYSTEM_PROMPT = """You are an expert executive meeting assistant.
Your task is to analyze the provided meeting transcript and extract a concise executive summary and key discussion points.

You must respond ONLY with a strict JSON object that conforms exactly to this schema:
{
  "summary": "A concise executive summary of the meeting in 2 to 4 sentences.",
  "key_points": [
    "Key discussion point or decision 1",
    "Key discussion point or decision 2",
    "Key discussion point or decision 3"
  ]
}

Rules & Requirements:
1. "summary" must be a single string containing 2 to 4 clear, well-written sentences summarizing the main purpose, discussions, and outcomes of the meeting.
2. "key_points" must be a JSON array of strings containing between 3 and 7 concise, high-value takeaways (decisions, milestones, topics, or action items discussed).
3. Do NOT include any markdown code fencing (such as ```json or ```).
4. Do NOT include any preamble, commentary, or text outside the JSON object.
5. Produce strictly valid, parseable JSON.
"""


def get_summary_user_prompt(transcript_text: str) -> str:
    """
    Constructs the user message containing the transcript for meeting summarization.
    """
    return (
        f"Please analyze the following meeting transcript and produce the summary and key points in strict JSON format:\n\n"
        f"--- TRANSCRIPT ---\n"
        f"{transcript_text}\n"
        f"--- END OF TRANSCRIPT ---\n\n"
        f"Remember: Respond with pure JSON only matching {{\"summary\": \"...\", \"key_points\": [\"...\", ...]}}."
    )


def get_summary_retry_prompt(error_details: str, previous_output: str) -> str:
    """
    Constructs the user message for retrying after a JSON parse or validation failure.
    """
    return (
        f"Your previous response failed JSON validation with the following error:\n"
        f"{error_details}\n\n"
        f"Your previous output was:\n"
        f"{previous_output}\n\n"
        f"Please correct the issue and provide ONLY a valid JSON object matching the required structure:\n"
        f"{{\n"
        f'  "summary": "2 to 4 sentences summarizing the meeting.",\n'
        f'  "key_points": ["3 to 7 key points as strings"]\n'
        f"}}"
    )
