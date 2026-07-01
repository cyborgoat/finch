from app.schemas.user_settings import UserSettingsResponse


def build_user_context(settings: UserSettingsResponse) -> str:
    lines = ["User preferences:"]

    language_label = "English" if settings.language == "en" else "中文 (Chinese)"
    lines.append(f"- Response language: {language_label}")

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


def apply_user_context(prompt: str, context: str) -> str:
    return f"{context}\n\n{prompt}"
