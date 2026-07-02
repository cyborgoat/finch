from dataclasses import dataclass


@dataclass(frozen=True)
class AiActionPreset:
    id: str
    title: str
    description: str
    note_type: str
    prompt_file: str
    title_prefix: str
    uses_content_language: bool = True
    uses_user_summary_prefs: bool = False


PRESETS: dict[str, AiActionPreset] = {
    "meeting_summary": AiActionPreset(
        id="meeting_summary",
        title="Meeting Summary",
        description="Overview, key points, and open questions from the transcript.",
        note_type="meeting_summary",
        prompt_file="meeting_summary.md",
        title_prefix="Meeting Summary",
        uses_user_summary_prefs=True,
    ),
    "action_items": AiActionPreset(
        id="action_items",
        title="Action Items",
        description="Checklist of tasks, owners, and deadlines mentioned in the recording.",
        note_type="action_items",
        prompt_file="action_items.md",
        title_prefix="Action Items",
    ),
    "key_decisions": AiActionPreset(
        id="key_decisions",
        title="Key Decisions",
        description="Decisions made during the conversation and the context behind them.",
        note_type="key_decisions",
        prompt_file="key_decisions.md",
        title_prefix="Key Decisions",
    ),
    "follow_up_email": AiActionPreset(
        id="follow_up_email",
        title="Follow-up Email",
        description="Draft a professional follow-up email recap for attendees.",
        note_type="follow_up_email",
        prompt_file="follow_up_email.md",
        title_prefix="Follow-up Email",
    ),
}


def get_preset(action: str) -> AiActionPreset | None:
    return PRESETS.get(action.strip())


def list_presets() -> list[AiActionPreset]:
    return list(PRESETS.values())
