#!/usr/bin/env python3
"""Send a data-only job to the installed, already-open Illustrator session."""
import fcntl
import hashlib
import json
import pathlib
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent
PROFILES = {name: ROOT / (name + ".json") for name in
            ("square-v1", "story-v1", "landscape-v1")}
APPLESCRIPT = '''on run argv
    with timeout of 120 seconds
        tell application id "com.adobe.illustrator"
            return do javascript file (POSIX file (item 1 of argv))
        end tell
    end timeout
end run
'''


def canonical_copy(text):
    # Only Adobe's paragraph-delimiter representation is equivalent.
    # No stripping, Unicode normalization, case folding, or whitespace collapse.
    return text.replace("\r\n", "\n").replace("\r", "\n")


def validate_copy(job, policy):
    frozen = pathlib.Path(job["copy_file"])
    raw = frozen.read_bytes()
    if hashlib.sha256(raw).hexdigest() != job["copy_sha256"]:
        raise ValueError("Frozen copy changed; create a new job revision")
    copy = json.loads(raw)
    if set(copy) != set(policy["slots"]):
        raise ValueError("Frozen copy must cover every policy slot exactly")
    if not all(isinstance(v, str) and v for v in copy.values()):
        raise ValueError("Every copy value must be a nonempty string")
    for change in job.get("changes", []):
        if change.get("name") not in copy:
            raise ValueError("Unknown copy slot")
        if "text" in change and canonical_copy(change["text"]) != canonical_copy(copy[change["name"]]):
            raise ValueError("Verbatim copy violation: " + change["name"])
    return copy


def main():
    job = json.loads(pathlib.Path(sys.argv[1]).read_text())
    if job.get("op") not in ("inspect", "patch", "preview"):
        raise ValueError("op must be inspect, patch, or preview")
    if job.get("template") not in PROFILES:
        raise ValueError("Unknown template; register additional formats explicitly")
    job["policy"] = json.loads(PROFILES[job["template"]].read_text())
    job["expectedCopy"] = validate_copy(job, job["policy"])
    doc = pathlib.Path(job["document"])
    if not doc.is_absolute() or not doc.is_file():
        raise ValueError("document must identify a saved, open .ai file")
    job["document"] = str(doc.resolve())
    if job["op"] == "preview":
        dest = pathlib.Path(job["output"])
        if not dest.is_absolute() or dest.suffix.lower() != ".png":
            raise ValueError("output must be an absolute .png path")
        if dest.exists() or not dest.parent.is_dir():
            raise ValueError("output must be a new file in an existing folder")
    # Marker is persisted BEFORE dispatch: timeouts/crashes block later dispatch.
    # Reconcile in Illustrator and archive/remove the marker only after the app
    # is idle and its actual state has been inspected. Never auto-replay a write.
    lock_path = pathlib.Path(tempfile.gettempdir()) / "design-workflow-illustrator.lock"
    pending = lock_path.with_suffix(".pending.json")
    with lock_path.open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        if pending.exists():
            raise SystemExit("Unreconciled Illustrator request: " + str(pending))
        with tempfile.TemporaryDirectory(prefix="design-job-") as folder:
            wrapper = pathlib.Path(folder) / "request.jsx"
            wrapper.write_text(
                "$.global.__designJob = " + json.dumps(job, ensure_ascii=True, allow_nan=False)
                + ";\n$.evalFile(new File("
                + json.dumps(str(ROOT / "engine.jsx")) + "));\n"
            )
            with pending.open("x") as marker:
                marker.write(json.dumps({"document": job["document"], "op": job["op"],
                                         "request_sha256": hashlib.sha256(wrapper.read_bytes()).hexdigest()}))
                marker.flush()
                import os
                os.fsync(marker.fileno())
            try:
                result = subprocess.run(
                    ["osascript", "-", str(wrapper)], input=APPLESCRIPT,
                    text=True, capture_output=True, timeout=130, check=True,
                )
            except subprocess.TimeoutExpired:
                raise SystemExit("Timeout: Illustrator may still be executing. Inspect before retrying.")
            except subprocess.CalledProcessError as exc:
                raise SystemExit(exc.stderr.strip())
            report = json.loads(result.stdout.strip())
            if not isinstance(report, dict) or type(report.get("ok")) is not bool:
                raise ValueError("Invalid worker acknowledgement; reconcile pending marker")
            # A failed mutation can leave partial edits: require reconciliation.
            if report["ok"] or not report.get("mutated", True):
                pending.unlink()
    print(json.dumps(report, indent=2))
    return 0 if report.get("ok") else 2


if __name__ == "__main__":
    sys.exit(main())
