from app.schemas.user_settings import UserSettingsResponse


def _language_label(language: str) -> str:
    return "English" if language == "en" else "中文 (Chinese)"


def build_content_language_context(settings: UserSettingsResponse) -> str:
    label = _language_label(settings.content_language)
    return f"User preferences:\n- Response language: {label}"


def build_summary_prefs_context(settings: UserSettingsResponse) -> str:
    lines = ["User preferences:"]

    style_labels = {
        "concise": "concise (short, high-level)",
        "balanced": "balanced",
        "detailed": "detailed (comprehensive)",
    }
    format_labels = {
        "paragraphs": "paragraphs",
        "bullets": "bullet points",
    }
    lines.append(f"- Summary style: {style_labels[settings.summary_style]}")
    lines.append(f"- Summary format: {format_labels[settings.summary_format]}")

    if settings.user_name.strip():
        lines.append(f"- User name: {settings.user_name.strip()}")

    return "\n".join(lines)


def build_user_context(settings: UserSettingsResponse) -> str:
    content = build_content_language_context(settings)
    summary = build_summary_prefs_context(settings)
    summary_lines = summary.splitlines()[1:]
    return content + "\n" + "\n".join(summary_lines)


def apply_user_context(prompt: str, context: str) -> str:
    return f"{context}\n\n{prompt}"
