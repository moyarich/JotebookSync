"""Report formats and language mappings exposed by the installed Jupytext."""

import json
import jupytext
from jupytext import formats as jf
from jupytext import languages


def make_json_safe(value):
    try:
        json.dumps(value)
        return value
    except TypeError:
        return str(value)


def build_payload():
    """Build the JSON-safe discovery payload consumed by the extension."""
    descriptions = getattr(jf, "JUPYTEXT_FORMATS", [])
    formats = sorted(
        {
            jf.short_form_one_format(
                {
                    "extension": item.extension,
                    "format_name": item.format_name,
                }
            )
            for item in descriptions
        }
    )
    language_formats = {}
    script_extensions = getattr(languages, "_SCRIPT_EXTENSIONS", {}) or {}

    for extension, info in script_extensions.items():
        language = str(info.get("language") or extension.lstrip("."))
        matching = sorted(
            {
                jf.short_form_one_format(
                    {
                        "extension": item.extension,
                        "format_name": item.format_name,
                    }
                )
                for item in descriptions
                if item.extension == extension
            }
        )
        if matching:
            language_formats.setdefault(language, []).extend(matching)

    language_formats = {
        language: sorted(set(items))
        for language, items in sorted(language_formats.items())
    }

    return {
        "version": getattr(jupytext, "__version__", None),
        "formats": formats,
        "languageFormats": make_json_safe(language_formats),
    }


if __name__ == "__main__":
    print(json.dumps(build_payload()))
