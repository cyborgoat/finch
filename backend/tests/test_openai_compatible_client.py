from app.domains.ai.llm.openai_compatible import _extract_message_content


def test_extract_message_content_from_string():
    assert _extract_message_content({"content": "  hello  "}) == "hello"


def test_extract_message_content_from_text_parts():
    message = {
        "content": [
            {"type": "text", "text": "Line one"},
            {"type": "text", "text": "Line two"},
        ]
    }
    assert _extract_message_content(message) == "Line one\nLine two"


def test_extract_message_content_from_reasoning_field():
    message = {"content": None, "reasoning": "Structured summary body"}
    assert _extract_message_content(message) == "Structured summary body"


def test_extract_message_content_from_reasoning_content_field():
    message = {"content": "", "reasoning_content": "Alternate reasoning field"}
    assert _extract_message_content(message) == "Alternate reasoning field"
