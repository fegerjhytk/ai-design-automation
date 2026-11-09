"""Deterministic skill dispatcher. Skill-specific commands are trusted adapters.

Adapters read one JSON request on stdin and emit one JSON report on stdout.
Use absolute argv arrays in the registry; never build shell commands from briefs.
No custom skill implementation is bundled or assumed by this dispatcher.
"""
import fcntl
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

REQUIRED_CHECKS = ("copy", "text_visibility", "contrast", "fonts", "color_profile",
                   "links", "safe_areas", "composition")
MUTATING = {"photoshop", "icons", "recreate", "snapshot", "compose", "cleanup", "render", "upload"}


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def freeze_copy(raw_brief, spans):
    """Offsets are Python Unicode code-point offsets, end exclusive.

    Supply explicit spans from intake. Never let an improver rewrite these values.
    Save the raw brief and offsets with the job for provenance.
    """
    result = {}
    for slot, (start, end) in spans.items():
        if not (type(start) is int and type(end) is int and 0 <= start < end <= len(raw_brief)):
            raise ValueError("Invalid copy span: " + slot)
        result[slot] = raw_brief[start:end]
    return result


def route(manifest):
    if manifest.get("direction", "refined") not in ("refined", "improved"):
        raise ValueError("Direction must be refined or improved")
    stages = ["plan"]  # improver: layout-only plan, never copy edits
    for kind in ("photoshop", "icons", "recreate"):
        if manifest.get("needs", {}).get(kind) is True:
            stages.append(kind)
    return stages + ["snapshot", "compose", "cleanup", "render", "preflight"]


def verify_report(report, manifest):
    if report.get("candidate_sha256") != digest(manifest["candidate"]):
        raise ValueError("Preflight belongs to a different render")
    if report.get("copy_sha256") != manifest["copy_sha256"]:
        raise ValueError("Preflight belongs to different copy")
    for name in REQUIRED_CHECKS:
        check = report.get("checks", {}).get(name, {})
        if check.get("passed") is not True or not check.get("evidence"):
            raise ValueError("Missing/failed preflight evidence: " + name)


def atomic_json(path, value):
    scratch = path.with_suffix(".tmp")
    with scratch.open("w") as stream:
        json.dump(value, stream, ensure_ascii=True, allow_nan=False)
        stream.flush()
        os.fsync(stream.fileno())
    os.replace(scratch, path)


def pipeline(manifest, registry, state_root):
    # Registry is installed configuration, not content supplied in an Asana brief.
    payload = json.dumps(manifest, sort_keys=True, ensure_ascii=True, allow_nan=False)
    run_id = hashlib.sha256(payload.encode()).hexdigest()
    root = Path(state_root) / run_id
    root.mkdir(parents=True, exist_ok=True)
    state_path = root / "state.json"
    state = json.loads(state_path.read_text()) if state_path.exists() else {}
    stages = route(manifest)
    if manifest.get("upload_authorized") is True:
        stages.append("upload")
    # Reject missing adapters before any app mutation.
    for stage in stages:
        entry = registry[stage]
        command = entry["argv"]
        if not entry.get("version") or not isinstance(command, list) or not command:
            raise ValueError("Register a versioned argv adapter: " + stage)
        if not all(isinstance(v, str) for v in command) or not Path(command[0]).is_absolute():
            raise ValueError("Adapter executable must be absolute: " + stage)
    config_digest = hashlib.sha256(json.dumps(registry, sort_keys=True).encode()).hexdigest()
    if state.get("registry_sha256", config_digest) != config_digest:
        raise ValueError("Adapter registry changed; reconcile and create a new job revision")
    state["registry_sha256"] = config_digest
    reports = {}
    lock_path = Path(tempfile.gettempdir()) / "design-workflow-pipeline.lock"
    pending = lock_path.with_suffix(".pending.json")
    with lock_path.open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        if pending.exists():
            raise RuntimeError("Reconcile pending app operation before any job: " + str(pending))
        # Reload after locking: another process may have completed this job.
        if state_path.exists():
            state = json.loads(state_path.read_text())
        if state.get("registry_sha256", config_digest) != config_digest:
            raise ValueError("Adapter registry changed")
        state["registry_sha256"] = config_digest
        for stage in stages:
            if digest(manifest["copy_file"]) != manifest["copy_sha256"]:
                raise ValueError("Frozen copy changed")
            record = state.get(stage, {})
            if record.get("status") in ("running", "uncertain"):
                raise RuntimeError("Reconcile app state before continuing stage: " + stage)
            if record.get("status") == "done":
                for path, checksum in record["artifacts"].items():
                    if digest(path) != checksum:
                        raise RuntimeError("Checkpoint artifact changed: " + path)
                reports[stage] = record["report"]
                continue
            if stage == "upload":
                promote(manifest, reports["preflight"])
            state[stage] = {"status": "running"}
            atomic_json(state_path, state)
            if stage in MUTATING:
                atomic_json(pending, {"run_id": run_id, "stage": stage, "state": str(state_path)})
            try:
                response = subprocess.run(
                    registry[stage]["argv"],
                    input=json.dumps({"manifest": manifest, "completed": reports}),
                    text=True, capture_output=True, check=True,
                    timeout=registry[stage].get("timeout", 120),
                )
                report = json.loads(response.stdout)
                if report.get("ok") is not True:
                    raise RuntimeError("Adapter did not acknowledge success")
                if digest(manifest["copy_file"]) != manifest["copy_sha256"]:
                    raise ValueError("Adapter changed frozen copy")
                if stage == "preflight":
                    verify_report(report, manifest)
                artifacts = {str(Path(p).resolve()): digest(p) for p in report.get("artifacts", [])}
                # Candidate bytes must stay fixed after rendering.
                if stage in ("render", "preflight"):
                    artifacts[str(Path(manifest["candidate"]).resolve())] = digest(manifest["candidate"])
                state[stage] = {"status": "done", "report": report, "artifacts": artifacts}
                reports[stage] = report
            except BaseException:
                state[stage] = {"status": "uncertain" if stage in MUTATING else "failed"}
                atomic_json(state_path, state)
                raise
            atomic_json(state_path, state)
            if stage in MUTATING:
                pending.unlink()
        promote(manifest, reports["preflight"])
    return {"ok": True, "run_id": run_id, "final": manifest["final"], "state": str(state_path)}


def promote(manifest, report):
    """Publish the checked bytes; do not re-render after preflight."""
    verify_report(report, manifest)
    destination = Path(manifest["final"])
    source = Path(manifest["candidate"])
    if destination.resolve() == source.resolve():
        raise ValueError("Candidate and final paths must differ")
    if destination.exists():
        if digest(destination) != report["candidate_sha256"]:
            raise FileExistsError("Refusing to overwrite a different final")
        return
    # Write a durable, private copy, then atomically expose it without overwrite.
    with tempfile.NamedTemporaryFile(dir=destination.parent, delete=False) as stream:
        temporary = Path(stream.name)
        try:
            stream.write(source.read_bytes())
            stream.flush()
            os.fsync(stream.fileno())
            if digest(temporary) != report["candidate_sha256"]:
                raise ValueError("Candidate changed during promotion")
            os.link(temporary, destination)
        finally:
            temporary.unlink(missing_ok=True)


if __name__ == "__main__":
    # python3 pipeline.py manifest.json adapters.json /absolute/state-directory
    print(json.dumps(pipeline(json.loads(Path(sys.argv[1]).read_text()),
                              json.loads(Path(sys.argv[2]).read_text()), sys.argv[3]), indent=2))
