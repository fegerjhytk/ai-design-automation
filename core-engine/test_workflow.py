import copy
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

import pipeline
import preflight
import run
import layout


class WorkflowTests(unittest.TestCase):
    def test_aspect_ratio_routes(self):
        self.assertEqual(layout.profile_for(1080,1920), "story-v1")
        self.assertEqual(layout.profile_for(1920,1080), "landscape-v1")
        with self.assertRaises(ValueError):
            layout.profile_for(200,300)

    def test_cover_fills_box(self):
        result = layout.cover((1600,900), (0,0,1080,1920))
        x,y,w,h = result["bounds"]
        self.assertLessEqual(x,0)
        self.assertLessEqual(y,0)
        self.assertGreaterEqual(x+w,1080)
        self.assertGreaterEqual(y+h,1920)

    def test_subject_crop_requests_expansion(self):
        result = layout.cover((1600,900), (0,0,1080,1920), subject=(0,0,1,1))
        self.assertTrue(result["needs_expansion"])

    def test_cover_shifts_to_keep_subject(self):
        result = layout.cover((1600,900), (0,0,1080,1920), subject=(0.8,0.2,0.15,0.6))
        self.assertFalse(result["needs_expansion"])
        x,y,w,h=result["bounds"]
        self.assertGreaterEqual(x+0.8*w,-0.0001)
        self.assertLessEqual(x+0.95*w,1080.0001)

    def test_contrast_extremes(self):
        self.assertEqual(preflight.contrast([255]*3, [[0]*3])["minimum_ratio"], 21)
        self.assertFalse(preflight.contrast([255]*3, [[255]*3])["passed"])

    def test_local_bad_pixel_is_not_hidden_by_average(self):
        self.assertFalse(preflight.contrast([255]*3, [[0]*3]*100+[[255]*3])["passed"])

    def test_empty_contrast_is_failure(self):
        with self.assertRaises(ValueError):
            preflight.contrast([255]*3, [])

    def test_invalid_contrast_channels(self):
        for value in (-1, 256, float("nan")):
            with self.assertRaises(ValueError):
                preflight.luminance([value, 0, 0])

    def test_freeze_keeps_unicode_and_spaces(self):
        raw = "Brief:  It’s yours!  \n"
        self.assertEqual(pipeline.freeze_copy(raw, {"BODY": [6, len(raw)]})["BODY"], "  It’s yours!  \n")

    def test_span_outside_brief(self):
        with self.assertRaises(ValueError):
            pipeline.freeze_copy("abc", {"BODY": [0, 4]})

    def test_routing_skips_irrelevant_skills(self):
        self.assertEqual(pipeline.route({}), ["plan", "snapshot", "compose", "cleanup", "render", "preflight"])
        self.assertIn("icons", pipeline.route({"needs": {"icons": True}}))
        self.assertNotIn("recreate", pipeline.route({"needs": {"icons": True}}))

    def test_copy_guard(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "copy.json"
            path.write_text(json.dumps({"BODY": "  It’s yours!\n"}))
            job = {"copy_file": str(path), "copy_sha256": pipeline.digest(path),
                   "changes": [{"name": "BODY", "text": "  It’s yours!\r"}]}
            policy = {"slots": {"BODY": {}}}
            run.validate_copy(job, policy)
            job["changes"][0]["text"] = "It's yours!"
            with self.assertRaises(ValueError):
                run.validate_copy(job, policy)

    def test_copy_file_hash_guard(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "copy.json"
            path.write_text('{"BODY":"Original"}')
            checksum = pipeline.digest(path)
            path.write_text('{"BODY":"Changed"}')
            with self.assertRaises(ValueError):
                run.validate_copy({"copy_file": str(path), "copy_sha256": checksum}, {"slots": {"BODY": {}}})

    def test_policy_rectangles(self):
        for path in run.PROFILES.values():
            policy = json.loads(path.read_text())
            sx, sy, sw, sh = policy["safe"]
            self.assertTrue(sx >= 0 and sy >= 0 and sx+sw <= policy["width"] and sy+sh <= policy["height"])
            for slot in policy["slots"].values():
                x, y, w, h = slot["box"]
                self.assertTrue(sx <= x and sy <= y and x+w <= sx+sw and y+h <= sy+sh)
                self.assertGreaterEqual(slot["max"], slot["min"])

    def fixture(self, folder):
        folder = Path(folder)
        candidate, frozen = folder / "candidate.png", folder / "copy.json"
        candidate.write_bytes(b"test render bytes")
        frozen.write_text('{"BODY":"Original"}')
        manifest = {"revision": 1, "candidate": str(candidate), "final": str(folder / "final.png"),
                    "copy_file": str(frozen), "copy_sha256": pipeline.digest(frozen)}
        report = {"ok": True, "candidate_sha256": pipeline.digest(candidate),
                  "copy_sha256": manifest["copy_sha256"], "checks": {
                      name: {"passed": True, "evidence": "mock verification"} for name in pipeline.REQUIRED_CHECKS}}
        registry = {stage: {"argv": [sys.executable, "mock-adapter"], "version": "test-1"}
                    for stage in pipeline.route(manifest)}
        return manifest, report, registry

    def test_evidence_is_bound_to_render(self):
        with tempfile.TemporaryDirectory() as folder:
            manifest, report, _ = self.fixture(folder)
            Path(manifest["candidate"]).write_bytes(b"changed")
            with self.assertRaises(ValueError):
                pipeline.verify_report(report, manifest)

    def test_missing_evidence_blocks_final(self):
        with tempfile.TemporaryDirectory() as folder:
            manifest, report, _ = self.fixture(folder)
            del report["checks"]["text_visibility"]
            with self.assertRaises(ValueError):
                pipeline.promote(manifest, report)
            self.assertFalse(Path(manifest["final"]).exists())

    def test_promotion_is_byte_identical_and_repeatable(self):
        with tempfile.TemporaryDirectory() as folder:
            manifest, report, _ = self.fixture(folder)
            pipeline.promote(manifest, report)
            pipeline.promote(manifest, report)
            self.assertEqual(Path(manifest["candidate"]).read_bytes(), Path(manifest["final"]).read_bytes())

    def test_different_final_is_never_overwritten(self):
        with tempfile.TemporaryDirectory() as folder:
            manifest, report, _ = self.fixture(folder)
            Path(manifest["final"]).write_bytes(b"existing")
            with self.assertRaises(FileExistsError):
                pipeline.promote(manifest, report)

    def test_pipeline_resume_uses_completed_checkpoints(self):
        with tempfile.TemporaryDirectory() as folder:
            manifest, report, registry = self.fixture(folder)
            def adapter(*args, **kwargs):
                return subprocess.CompletedProcess([], 0, stdout=json.dumps(report))
            with patch("pipeline.tempfile.gettempdir", return_value=folder), patch("pipeline.subprocess.run", side_effect=adapter) as mocked:
                pipeline.pipeline(manifest, registry, Path(folder)/"state")
                pipeline.pipeline(manifest, registry, Path(folder)/"state")
                self.assertEqual(mocked.call_count, len(pipeline.route(manifest)))

    def test_uncertain_mutation_blocks_other_jobs(self):
        with tempfile.TemporaryDirectory() as folder:
            manifest, report, registry = self.fixture(folder)
            count = [0]
            def adapter(*args, **kwargs):
                count[0] += 1
                if count[0] == 2:  # snapshot mutates Illustrator
                    raise subprocess.TimeoutExpired("mock-adapter", 1)
                return subprocess.CompletedProcess([], 0, stdout=json.dumps(report))
            with patch("pipeline.tempfile.gettempdir", return_value=folder), patch("pipeline.subprocess.run", side_effect=adapter):
                with self.assertRaises(subprocess.TimeoutExpired):
                    pipeline.pipeline(manifest, registry, Path(folder)/"state")
                manifest["revision"] = 2
                with self.assertRaisesRegex(RuntimeError, "pending app operation"):
                    pipeline.pipeline(manifest, registry, Path(folder)/"state")
            self.assertFalse(Path(manifest["final"]).exists())


if __name__ == "__main__":
    unittest.main()
