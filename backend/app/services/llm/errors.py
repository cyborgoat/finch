from app.core.errors import AppError


def raise_llm_request_failed(provider_label: str, exc: Exception) -> None:
    detail = str(exc)
    if isinstance(exc, Exception) and hasattr(exc, "response"):
        response = exc.response  # type: ignore[attr-defined]
        if hasattr(response, "text"):
            detail = response.text

    raise AppError(
        "LLM_REQUEST_FAILED",
        f"{provider_label} request failed: {detail}",
        502,
    ) from exc
