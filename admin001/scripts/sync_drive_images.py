"""Refresh the admin's image lookup using its existing authenticated Drive API.

Reads the configured image roots recursively; never changes the spreadsheet or
Drive. Only image IDs/names belonging to inventory codes enter the static index.
Credentials are read from ADMIN_USERNAME / ADMIN_PASSWORD (documented defaults).
"""

import argparse
import concurrent.futures
import datetime
import json
import os
from pathlib import Path
import re
import unicodedata
import urllib.request

ADMIN = Path(__file__).resolve().parents[1]
ARCHIVE_ID = "1oQ55NzBeK_7ZttxFoazJD0Q16iz3fCXB"


def key(value, filename=False):
    value = unicodedata.normalize("NFKC", value).strip()
    if filename:
        value = re.sub(r"\.[^.]+$", "", value)
        value = re.sub(r"\s*\(\d+\)\s*$", "", value)
    return re.sub(r"\s+", "", value).lower()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cache-dir", type=Path, default=Path("/tmp/tjkim-image-scan"))
    parser.add_argument("--reuse-cache", action="store_true")
    parser.add_argument("--workers", type=int, default=4)
    args = parser.parse_args()
    args.cache_dir.mkdir(parents=True, exist_ok=True)
    api_url = os.environ.get("VITE_API_URL", "")
    if not api_url:
        for line in (ADMIN / ".env").read_text().splitlines():
            if line.startswith("VITE_API_URL="):
                api_url = line.split("=", 1)[1].strip().strip("\"'")
    if not api_url:
        raise SystemExit("VITE_API_URL is required")

    def call(action, **params):
        body = {"action": action, **params}
        if action != "login":
            body["token"] = token
        request = urllib.request.Request(api_url, data=json.dumps(body).encode(),
                                         headers={"Content-Type": "text/plain"})
        with urllib.request.urlopen(request, timeout=330) as response:
            data = json.load(response)
        if data.get("error"):
            raise RuntimeError(data["error"])
        return data

    token = call("login", username=os.environ.get("ADMIN_USERNAME", "admin"),
                 password=os.environ.get("ADMIN_PASSWORD", "admin"))["token"]
    dataset = call("dataset")
    codes = set()
    for tab in ("BOOK", "MAP", "OTHER", "PRINT"):
        rows = dataset["tabs"].get(tab, [])
        if not rows or "Item No." not in rows[0]:
            continue
        column = rows[0].index("Item No.")
        codes.update(key(row[column]) for row in rows[1:] if len(row) > column and row[column])
    roots = call("imageIndex")["roots"]
    results = []
    failures = []

    def scan(root):
        cache = args.cache_dir / (root["id"] + ".json")
        if args.reuse_cache and cache.exists():
            data = json.loads(cache.read_text())
        else:
            data = call("imageIndex", rootId=root["id"])
            cache.write_text(json.dumps(data, ensure_ascii=False))
        return root, data

    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as executor:
        tasks = {executor.submit(scan, root): root for root in roots}
        for task in concurrent.futures.as_completed(tasks):
            root = tasks[task]
            try:
                _, result = task.result()
                results.append((root, result))
                print(root["name"], len(result.get("files", [])),
                      "PARTIAL" if result.get("truncated") else "complete", flush=True)
            except Exception as error:
                failures.append(root["name"])
                # Do not print request URLs or authentication values.
                print(root["name"], "FAILED", type(error).__name__, flush=True)

    if failures or any(result.get("truncated") for _, result in results):
        raise SystemExit("Incomplete scan; existing index was preserved. Retry with --reuse-cache.")

    index = {"version": 2, "builtAt": int(datetime.datetime.now().timestamp() * 1000),
             "sourceFolderId": ARCHIVE_ID, "fileCount": 0, "folderCount": 0,
             "truncatedRoots": [], "byFolderKey": {}, "byFileKey": {}}
    seen_files, seen_folders = set(), set()
    for root, result in sorted(results, key=lambda value: value[0]["id"]):
        folders = {folder["id"]: folder for folder in result["folders"]}
        counts = {}
        for image in result["files"]:
            folder_id = image["folderId"]
            counts[folder_id] = counts.get(folder_id, 0) + 1
            folder = folders.get(folder_id, {})
            image_key = key(image["name"], True)
            if image_key not in codes:
                image_key = key(folder.get("name", ""))
            if image_key not in codes or image["id"] in seen_files:
                continue
            seen_files.add(image["id"])
            index["byFileKey"].setdefault(image_key, []).append({
                **image, "folderName": folder.get("name", ""),
                "path": folder.get("path", root["name"])})
        for folder in result["folders"]:
            if folder["id"] in seen_folders or not counts.get(folder["id"]):
                continue
            seen_folders.add(folder["id"])
            index["byFolderKey"].setdefault(key(folder["name"]), []).append({
                "folderId": folder["id"], "folderName": folder["name"],
                "path": folder["path"], "count": counts[folder["id"]]})
    index["fileCount"] = len(seen_files)
    index["folderCount"] = len(seen_folders)
    target = ADMIN / "public" / "drive-image-index.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":")))
    print("Saved", len(index["byFileKey"]), "inventory codes,", index["fileCount"], "images", flush=True)


if __name__ == "__main__":
    main()
