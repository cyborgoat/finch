from typing import Literal

from app.schemas import CamelModel

AppLanguage = Literal["en", "zh"]
SummaryStyle = Literal["concise", "balanced", "detailed"]
SummaryFormat = Literal["paragraphs", "bullets"]


class UserSettingsResponse(CamelModel):
    language: AppLanguage = "en"
    summary_style: SummaryStyle = "balanced"
    summary_format: SummaryFormat = "paragraphs"
    user_name: str = ""
    user_speaker_profile_id: str | None = None


class UpdateUserSettingsRequest(CamelModel):
    language: AppLanguage | None = None
    summary_style: SummaryStyle | None = None
    summary_format: SummaryFormat | None = None
    user_name: str | None = None
    user_speaker_profile_id: str | None = None
