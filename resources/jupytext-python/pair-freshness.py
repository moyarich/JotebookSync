import json
import os
import sys


def get_mtime(file_path):
    return os.path.getmtime(file_path) if file_path and os.path.exists(file_path) else None


def get_file_name(file_path):
    return os.path.basename(file_path) if file_path else ""


def get_file_format(file_path, fallback=""):
    file_name = get_file_name(file_path)
    if "." not in file_name:
        return (fallback or "FILE").upper()
    return file_name.rsplit(".", 1)[-1].upper()


def unique_paths(paths):
    values = []
    for file_path in paths:
        if file_path and file_path not in values:
            values.append(file_path)
    return values


def build_pair_file_info(file_path):
    modified_at = get_mtime(file_path)
    return {
        "path": file_path,
        "fileName": get_file_name(file_path),
        "format": get_file_format(file_path),
        "exists": bool(file_path and os.path.exists(file_path)),
        "modifiedAt": modified_at,
    }


def get_newest_pair(source_path, destinations):
    pair_paths = unique_paths([source_path] + [item.get("path") for item in destinations])
    existing_pairs = [
        build_pair_file_info(file_path)
        for file_path in pair_paths
        if file_path and os.path.exists(file_path)
    ]
    existing_pairs = [item for item in existing_pairs if item["modifiedAt"] is not None]

    return max(
        existing_pairs,
        key=lambda item: item["modifiedAt"],
        default=None,
    )


def check_destination(source_path, destination, source_info, newest_pair):
    destination_path = destination.get("path", "")
    destination_info = build_pair_file_info(destination_path)
    source_modified_at = source_info["modifiedAt"]
    destination_modified_at = destination_info["modifiedAt"]

    source_is_newer = (
        source_modified_at is not None
        and destination_modified_at is not None
        and source_modified_at > destination_modified_at
    )
    destination_is_newer = (
        source_modified_at is not None
        and destination_modified_at is not None
        and destination_modified_at > source_modified_at
    )
    timestamps_are_equal = (
        source_modified_at is not None
        and destination_modified_at is not None
        and source_modified_at == destination_modified_at
    )
    newest_pair_is_source = (
        newest_pair is not None
        and os.path.abspath(newest_pair["path"]) == os.path.abspath(source_path)
    )

    result_kind = "source_newer"
    if not source_info["exists"]:
        result_kind = "source_missing"
    elif not destination_info["exists"]:
        result_kind = "destination_missing"
    elif destination_is_newer:
        result_kind = "destination_newer"
    elif timestamps_are_equal:
        result_kind = "timestamps_equal"

    result_message = "Selected source is newer than this paired destination."
    if result_kind == "source_missing":
        result_message = "Selected source file is missing."
    elif result_kind == "destination_missing":
        result_message = "Paired destination file does not exist yet and can be created from the selected source."
    elif result_kind == "destination_newer":
        result_message = "Paired destination is newer than the selected source. Review before overwriting it."
    elif result_kind == "timestamps_equal":
        result_message = "Source and destination have the same timestamp. Treat this as review required because timestamp order cannot prove which content should win."

    return {
        "ok": bool(source_info["exists"] and (not destination_info["exists"] or source_is_newer)),
        "toFormat": destination.get("toFormat", ""),
        "sourcePath": source_info["path"],
        "sourceFileName": source_info["fileName"],
        "sourceFormat": source_info["format"],
        "sourceExists": source_info["exists"],
        "sourceModifiedAt": source_modified_at,
        "destinationPath": destination_info["path"],
        "destinationFileName": destination_info["fileName"] or f"--to {destination.get('toFormat', '')}",
        "destinationFormat": destination_info["format"] or get_file_format(destination_info["path"], destination.get("toFormat", "")),
        "destinationExists": destination_info["exists"],
        "destinationModifiedAt": destination_modified_at,
        "sourceIsNewer": source_is_newer,
        "destinationIsNewer": destination_is_newer,
        "timestampsAreEqual": timestamps_are_equal,
        "newestPairedPath": newest_pair["path"] if newest_pair else None,
        "newestPairedFileName": newest_pair["fileName"] if newest_pair else None,
        "newestPairedModifiedAt": newest_pair["modifiedAt"] if newest_pair else None,
        "newestPairIsSource": newest_pair_is_source,
        "resultKind": result_kind,
        "resultMessage": result_message,
    }


def check_pair_freshness(source_path, destinations):
    source_info = build_pair_file_info(source_path)
    newest_pair = get_newest_pair(source_path, destinations)

    return [
        check_destination(source_path, destination, source_info, newest_pair)
        for destination in destinations
    ]


if __name__ == "__main__":
    source_path = sys.argv[1]
    destinations = json.loads(sys.argv[2])
    print(json.dumps(check_pair_freshness(source_path, destinations)))
