def ensure_unique_title(base_title: str, existing_titles: set[str]) -> str:
    if base_title not in existing_titles:
        return base_title

    suffix = 2
    while True:
        candidate = f"{base_title} ({suffix})"
        if candidate not in existing_titles:
            return candidate
        suffix += 1
