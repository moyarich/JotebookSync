import json
import sys
from pathlib import Path

import jupytext
from jupytext.cli import paired_paths
from jupytext.config import get_formats_from_notebook_and_config, load_jupytext_config
from jupytext.formats import short_form_one_format


def get_path_info(fp):
    try:
        source = Path(fp)
        nb = jupytext.read(str(source))

        config = load_jupytext_config(str(source))
        fmts = get_formats_from_notebook_and_config(nb, config, str(source))
        formats = [short_form_one_format(fmt) for fmt in fmts]

        if not formats:
            raise ValueError(f"{source} is not tracked by jupytext")

        is_paired = len(formats) >= 2
        paths = []

        if is_paired:
            file_name = source.name.lower()
            matching_formats = sorted(
                [
                    fmt
                    for fmt in fmts
                    if file_name.endswith(
                        (str(fmt.get("suffix") or "") + str(fmt.get("extension") or "")).lower()
                    )
                ],
                key=lambda fmt: len(
                    str(fmt.get("suffix") or "") + str(fmt.get("extension") or "")
                ),
                reverse=True,
            )
            if matching_formats:
                selected_format = matching_formats[0]
                fmts = [selected_format, *[fmt for fmt in fmts if fmt is not selected_format]]
            paths = paired_paths(str(source), None, fmts) if fmts else []

        return {
            "isPaired": is_paired,
            "formats": formats,
            "paths": paths,
        }

    except Exception as e:
        return {
            "isPaired": False,
            "formats": [],
            "paths": [],
            "error": str(e),
        }


if __name__ == "__main__":
    fp = sys.argv[1]
    print(json.dumps(get_path_info(fp)))
