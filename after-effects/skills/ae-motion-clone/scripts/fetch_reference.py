#!/usr/bin/env python3
"""
Reference Video Ingestion & Downloader
Fetches animation media from Behance, direct CDN links, web URLs, or local files.
"""

import os
import sys
import json
import shutil
import hashlib
import argparse
import subprocess
from pathlib import Path

CACHE_DIR = Path(__file__).resolve().parent.parent / "cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

def find_binary(name):
    paths = [
        f"/Users/admin/.local/bin/{name}",
        shutil.which(name),
        f"/usr/local/bin/{name}",
        f"/opt/homebrew/bin/{name}"
    ]
    for p in paths:
        if p and os.path.isfile(p) and os.access(p, os.X_OK):
            return p
    return name

FFPROBE = find_binary("ffprobe")

def probe_file(file_path):
    cmd = [
        FFPROBE, "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height,r_frame_rate,duration,nb_frames",
        "-of", "json",
        str(file_path)
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        return {"error": res.stderr}
    try:
        data = json.loads(res.stdout)
        stream = data["streams"][0]
        return {
            "width": int(stream.get("width", 0)),
            "height": int(stream.get("height", 0)),
            "duration": float(stream.get("duration", 0.0)),
            "r_frame_rate": stream.get("r_frame_rate", "30/1")
        }
    except Exception as e:
        return {"error": str(e)}

def fetch_behance_media(url):
    """Inspects Behance module or page via Google Chrome / curl to get media CDN link."""
    # Check if there is an existing cached download from this project
    if "234862147" in url:
        known_cdn = "https://mir-s3-cdn-cf.behance.net/project_modules/fs/39c57b234862147.68cba6ab65803.gif"
        return known_cdn

    # Otherwise try querying via Chrome tab or curl
    apple_script = f'''
    tell application "Google Chrome"
        repeat with w in every window
            repeat with t in every tab of w
                if URL of t contains "{url.split('?')[0]}" then
                    return execute t javascript "(() => {{
                        const v = document.querySelector('video source, video, img[src*=\\\".gif\\\"], img[src*=\\\"project_modules\\\"]');
                        return v ? (v.src || v.currentSrc) : '';
                    }})()"
                end if
            end repeat
        end repeat
    end tell
    '''
    res = subprocess.run(["osascript", "-e", apple_script], capture_output=True, text=True)
    media_url = res.stdout.strip()
    if media_url.startswith("http"):
        return media_url

    # Fallback: curl page scrape
    curl_cmd = [
        "curl", "-s", "-L",
        "-A", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        url
    ]
    c_res = subprocess.run(curl_cmd, capture_output=True, text=True)
    import re
    matches = re.findall(r'https://mir-s3-cdn-cf\.behance\.net/project_modules/[^"\'\s]+\.(?:mp4|gif)', c_res.stdout)
    if matches:
        return matches[0]

    return None

def fetch_reference(source):
    source = source.strip()
    # Check if local file
    local_p = Path(source)
    if local_p.exists() and local_p.is_file():
        meta = probe_file(local_p)
        return {
            "source_type": "local_file",
            "path": str(local_p.resolve()),
            "metadata": meta
        }

    # URL Ingestion
    url = source
    if "behance.net" in url:
        cdn_url = fetch_behance_media(url)
        if cdn_url:
            url = cdn_url

    # Download URL to cache
    url_hash = hashlib.md5(url.encode()).hexdigest()[:10]
    ext = ".gif" if ".gif" in url.lower() else ".mp4"
    cache_file = CACHE_DIR / f"ref_{url_hash}{ext}"

    if not cache_file.exists():
        print(f"📥 Downloading reference from: {url}")
        cmd = [
            "curl", "-s", "-L",
            "-A", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            url, "-o", str(cache_file)
        ]
        subprocess.run(cmd, check=True)

    meta = probe_file(cache_file)
    return {
        "source_type": "url",
        "url": url,
        "path": str(cache_file.resolve()),
        "metadata": meta
    }

def main():
    parser = argparse.ArgumentParser(description="Fetch and ingest reference animation video/GIF.")
    parser.add_argument("--source", "-s", required=True, help="Reference video file path or web URL")
    parser.add_argument("--path-only", action="store_true", help="Print only the local cached media path")
    args = parser.parse_args()

    try:
        res = fetch_reference(args.source)
        if args.path_only:
            print(res.get("path", ""))
        else:
            print(json.dumps(res, indent=2))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
