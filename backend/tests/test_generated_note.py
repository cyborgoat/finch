from app.domains.ai.generated_note import parse_generated_note


def test_parse_generated_note_extracts_title_line():
    title, markdown = parse_generated_note(
        "TITLE: Chassis roadmap review\n\n# Summary\n\nBody text."
    )
    assert title == "Chassis roadmap review"
    assert markdown == "# Summary\n\nBody text."


def test_parse_generated_note_falls_back_to_subject_heading():
    title, markdown = parse_generated_note(
        "# Subject: Follow up on vendor kickoff\n\n## Email Body\n\nHello,"
    )
    assert title == "Follow up on vendor kickoff"
    assert markdown.startswith("# Subject:")


def test_parse_generated_note_ignores_generic_heading_fallback():
    title, markdown = parse_generated_note("# Summary\n\nJust a body.")
    assert title is None
    assert markdown == "# Summary\n\nJust a body."


def test_parse_generated_note_uses_non_generic_heading():
    title, markdown = parse_generated_note(
        "# Q3 hiring plan for design\n\nDetails here."
    )
    assert title == "Q3 hiring plan for design"
    assert markdown.startswith("# Q3 hiring plan for design")
