import json
import sys
from typing import TypedDict

from jupytext import formats as jf
from jupytext import languages


JUPYTEXT_FORMATS = getattr(jf, "JUPYTEXT_FORMATS", [])
SCRIPT_EXTENSIONS = getattr(languages, "_SCRIPT_EXTENSIONS", {}) or {}


class PairFormatSuggestion(TypedDict):
    label: str
    format: str
    pair_formats: str
    extension: str
    format_name: str
    language: str
    kind: str
    rank: int


def normalize_extension(extension: str) -> str:
    return "." + extension.lstrip(".").split(".")[-1]


def get_format_entries(extension: str):
    item = jf.long_form_one_format(extension.lstrip("."))
    ext = normalize_extension(item["extension"])
    entries = [fmt for fmt in JUPYTEXT_FORMATS if fmt.extension == ext]
    return ext, entries


def build_single_format_suggestion(ext: str, fmt, index: int) -> PairFormatSuggestion:
    is_script = ext in SCRIPT_EXTENSIONS
    script_info = SCRIPT_EXTENSIONS.get(ext, {})
    format_name = fmt.format_name
    short_format = jf.short_form_one_format(
        {
            "extension": ext,
            "format_name": format_name,
        }
    )

    language = script_info.get("language", format_name) if is_script else format_name
    kind = "script" if is_script else "markup"
    label = (
        f"Pair Notebook with - {language.title()} {format_name.title()}"
        if is_script
        else f"Pair Notebook with - {format_name.title()}"
    )

    return {
        "label": label,
        "format": short_format,
        "pair_formats": f"ipynb,{short_format}",
        "extension": ext,
        "format_name": format_name,
        "language": language,
        "kind": kind,
        "rank": (10 if is_script else 50) + index,
    }


def get_pair_format_suggestions(extension: str) -> list[PairFormatSuggestion]:
    ext, entries = get_format_entries(extension)
    source_format = ext.lstrip(".")
    suggestions = []
    seen_formats = set()

    for candidate_extension in [extension, ".py", ".Rmd", ".qmd"]:
        try:
            candidate_ext, candidate_entries = get_format_entries(candidate_extension)
        except Exception:
            continue

        for index, fmt in enumerate(candidate_entries):
            suggestion = build_single_format_suggestion(candidate_ext, fmt, index)
            if suggestion["format"] in seen_formats:
                continue
            seen_formats.add(suggestion["format"])
            suggestions.append(suggestion)

    # Jupytext --set-formats must include a format that matches the current file.
    # For example, example.md must include "md"; otherwise "ipynb,.myst.md:myst"
    # fails because example.md matches none of the export formats.
    if not any(suggestion["format"] == source_format for suggestion in suggestions):
        suggestions.insert(
            0,
            {
                "label": f"Current file format ({ext})",
                "format": source_format,
                "pair_formats": f"ipynb,{source_format}",
                "extension": ext,
                "format_name": source_format,
                "language": source_format,
                "kind": "source",
                "rank": 0,
            },
        )

    return suggestions


if __name__ == "__main__":
    print(json.dumps(get_pair_format_suggestions(sys.argv[1])))
