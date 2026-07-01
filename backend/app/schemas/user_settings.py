from typing import Literal

from app.schemas import CamelModel

AppLanguage = Literal["en", "zh"]
SummaryStyle = Literal["concise", "balanced", "detailed"]
SummaryFormat = Literal["paragraphs", "bullets"]


class UserSettingsResponse(CamelModel):
    ui_language: AppLanguage = "en"
    content_language: AppLanguage = "en"
    summary_style: SummaryStyle = "balanced"
    summary_format: SummaryFormat = "paragraphs"
    user_name: str = ""
    user_speaker_profile_id: str | None = None
    notes_auto_save: bool = True


class UpdateUserSettingsRequest(CamelModel):
    ui_language: AppLanguage | None = None
    content_language: AppLanguage | None = None
    summary_style: SummaryStyle | None = None
    summary_format: SummaryFormat | None = None
    user_name: str | None = None
    user_speaker_profile_id: str | None = None
    notes_auto_save: bool | None = None
