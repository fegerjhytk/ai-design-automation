import concurrent.futures
import hashlib
import hmac
import os
import re
import time
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse
import requests
from requests.adapters import HTTPAdapter
from dotenv import load_dotenv

# Automatically load environment variables from .env
load_dotenv()

DEFAULT_DOWNLOAD_DIR = os.getenv(
    "MAGNIFIC_DOWNLOAD_DIR",
    os.path.expanduser("~/Downloads"),
)


def extract_asset_urls(data: Any) -> List[str]:
    """Recursively search a JSON structure for asset URLs."""
    urls = []
    if isinstance(data, dict):
        for k, v in data.items():
            if k in ("generated", "images", "image", "url", "image_url", "video", "video_url"):
                if isinstance(v, str) and v.startswith("http"):
                    urls.append(v)
                elif isinstance(v, list):
                    for item in v:
                        if isinstance(item, str) and item.startswith("http"):
                            urls.append(item)
                        elif isinstance(item, dict):
                            urls.extend(extract_asset_urls(item))
            else:
                urls.extend(extract_asset_urls(v))
    elif isinstance(data, list):
        for item in data:
            urls.extend(extract_asset_urls(item))
    return list(dict.fromkeys(urls))  # Deduplicate while preserving order


class MagnificClient:
    """High-performance client for the Magnific REST API (https://api.magnific.com)."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        webhook_secret: Optional[str] = None,
        base_url: Optional[str] = None,
        download_dir: Optional[str] = None,
    ):
        self.api_key = api_key or os.getenv("MAGNIFIC_API_KEY")
        if not self.api_key:
            raise ValueError(
                "MAGNIFIC_API_KEY not found. Pass it to the constructor or set it in your environment."
            )

        self.webhook_secret = webhook_secret or os.getenv("MAGNIFIC_WEBHOOK_SECRET")
        self.base_url = (base_url or os.getenv("MAGNIFIC_BASE_URL", "https://api.magnific.com")).rstrip("/")
        self.download_dir = download_dir or DEFAULT_DOWNLOAD_DIR
        os.makedirs(self.download_dir, exist_ok=True)

        # Persistent HTTP Session with connection pooling for low-latency calls
        self.session = requests.Session()
        adapter = HTTPAdapter(pool_connections=10, pool_maxsize=20, max_retries=1)
        self.session.mount("https://", adapter)
        self.session.mount("http://", adapter)
        self.session.headers.update({
            "x-magnific-api-key": self.api_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        })

    def test_connection(self) -> Dict[str, Any]:
        """Test authentication against the Magnific API resources endpoint."""
        url = f"{self.base_url}/v1/resources"
        response = self.session.get(url, timeout=10)
        response.raise_for_status()
        return response.json()

    def get_task_status(self, task_endpoint: str, task_id: str) -> Dict[str, Any]:
        """Check status of an asynchronous task."""
        endpoint = task_endpoint.strip("/")
        url = f"{self.base_url}/{endpoint}/{task_id}"
        response = self.session.get(url, timeout=10)
        response.raise_for_status()
        return response.json()

    def wait_for_task(
        self,
        task_endpoint: str,
        task_id: str,
        poll_interval: Optional[float] = None,
        timeout: int = 180,
    ) -> Dict[str, Any]:
        """Poll task until status is COMPLETED or FAILED using low-latency adaptive polling."""
        start_time = time.time()
        print(f"Polling task {task_id} (adaptive low-latency)...")

        # Fast adaptive poll cadence: 0.5s -> 0.8s -> 1.0s -> 1.2s -> 1.5s
        adaptive_intervals = [0.5, 0.8, 1.0, 1.2, 1.5]
        attempt = 0

        while time.time() - start_time < timeout:
            data = self.get_task_status(task_endpoint, task_id)
            status = data.get("status") or (
                data.get("data", {}).get("status") if isinstance(data.get("data"), dict) else ""
            )
            status = str(status).upper()

            if status in ("COMPLETED", "SUCCESS", "DONE"):
                elapsed = time.time() - start_time
                print(f"Task {task_id} finished in {elapsed:.1f}s!")
                return data
            elif status in ("FAILED", "ERROR"):
                error_msg = data.get("error") or data.get("message") or "Unknown error"
                raise RuntimeError(f"Task {task_id} failed: {error_msg}")

            if poll_interval is not None:
                sleep_sec = poll_interval
            else:
                sleep_sec = adaptive_intervals[min(attempt, len(adaptive_intervals) - 1)]

            attempt += 1
            time.sleep(sleep_sec)

        raise TimeoutError(f"Task {task_id} did not complete within {timeout} seconds.")

    def download_asset(
        self,
        url: str,
        output_path: Optional[str] = None,
        output_dir: Optional[str] = None,
        prefix: str = "magnific_",
    ) -> str:
        """Download an asset with fast 64KB chunk streaming."""
        dest_dir = output_dir or self.download_dir
        os.makedirs(dest_dir, exist_ok=True)

        if not output_path:
            parsed = urlparse(url)
            basename = os.path.basename(parsed.path)
            if not basename or "." not in basename:
                basename = f"{prefix}{int(time.time())}.jpg"
            else:
                basename = re.sub(r"[^\w\-.]", "_", basename)
                basename = f"{prefix}{basename}"
            output_path = os.path.join(dest_dir, basename)

        t0 = time.time()
        # Stream download using session connection pool
        res = self.session.get(url, stream=True, timeout=60, headers={"Accept": "*/*"})
        res.raise_for_status()

        with open(output_path, "wb") as f:
            for chunk in res.iter_content(chunk_size=65536):  # 64 KB chunks
                if chunk:
                    f.write(chunk)

        elapsed = time.time() - t0
        size_kb = os.path.getsize(output_path) / 1024
        print(f"Downloaded {size_kb:.0f} KB in {elapsed:.2f}s -> {output_path}")
        return os.path.abspath(output_path)

    def download_task_assets(
        self,
        task_data: Dict[str, Any],
        output_dir: Optional[str] = None,
        prefix: str = "magnific_",
    ) -> List[str]:
        """Download all asset URLs in parallel using ThreadPoolExecutor."""
        urls = extract_asset_urls(task_data)
        if not urls:
            return []

        if len(urls) == 1:
            return [self.download_asset(urls[0], output_dir=output_dir, prefix=prefix)]

        # Parallel downloads for multiple assets
        saved_files = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=min(4, len(urls))) as executor:
            futures = {
                executor.submit(
                    self.download_asset,
                    u,
                    output_dir=output_dir,
                    prefix=f"{prefix}{idx + 1}_",
                ): idx
                for idx, u in enumerate(urls)
            }
            for fut in concurrent.futures.as_completed(futures):
                saved_files.append(fut.result())
        return saved_files

    def create_mystic_image(
        self,
        prompt: str,
        aspect_ratio: str = "square_1_1",
        resolution: str = "1k",  # Default to 1k for 2x-3x faster generation speed
        webhook_url: Optional[str] = None,
        structure_reference: Optional[str] = None,
        style_reference: Optional[str] = None,
        wait: bool = True,
        download: bool = True,
        output_dir: Optional[str] = None,
        timeout: int = 180,
    ) -> Dict[str, Any]:
        """Generate high-resolution image using Mystic AI with fast 1k default."""
        url = f"{self.base_url}/v1/ai/mystic"
        payload: Dict[str, Any] = {
            "prompt": prompt,
            "aspect_ratio": aspect_ratio,
            "resolution": resolution,
        }
        if webhook_url:
            payload["webhook_url"] = webhook_url
        if structure_reference:
            payload["structure_reference"] = structure_reference
        if style_reference:
            payload["style_reference"] = style_reference

        response = self.session.post(url, json=payload, timeout=20)
        response.raise_for_status()
        initial_data = response.json()

        task_id = (
            initial_data.get("task_id")
            or initial_data.get("id")
            or (initial_data.get("data", {}).get("task_id") if isinstance(initial_data.get("data"), dict) else None)
        )
        if not task_id or not wait:
            return initial_data

        result = self.wait_for_task("v1/ai/mystic", task_id, timeout=timeout)
        if download:
            saved_paths = self.download_task_assets(result, output_dir=output_dir, prefix=f"mystic_{task_id[:8]}_")
            result["downloaded_files"] = saved_paths
        return result

    def upscale_image(
        self,
        image_url: Optional[str] = None,
        image_base64: Optional[str] = None,
        upscale_factor: int = 2,  # 2x is fastest
        prompt: Optional[str] = None,
        creativity: Optional[int] = None,
        webhook_url: Optional[str] = None,
        wait: bool = True,
        download: bool = True,
        output_dir: Optional[str] = None,
        timeout: int = 180,
    ) -> Dict[str, Any]:
        """Upscale an image using Magnific's Image Upscaler."""
        if not image_url and not image_base64:
            raise ValueError("Either image_url or image_base64 must be provided.")

        url = f"{self.base_url}/v1/ai/image-upscaler"
        payload: Dict[str, Any] = {
            "scale_factor": upscale_factor,
        }
        if image_url:
            payload["image_url"] = image_url
        elif image_base64:
            payload["image"] = image_base64

        if prompt:
            payload["prompt"] = prompt
        if creativity is not None:
            payload["creativity"] = creativity
        if webhook_url:
            payload["webhook_url"] = webhook_url

        response = self.session.post(url, json=payload, timeout=20)
        response.raise_for_status()
        initial_data = response.json()

        task_id = (
            initial_data.get("task_id")
            or initial_data.get("id")
            or (initial_data.get("data", {}).get("task_id") if isinstance(initial_data.get("data"), dict) else None)
        )
        if not task_id or not wait:
            return initial_data

        result = self.wait_for_task("v1/ai/image-upscaler", task_id, timeout=timeout)
        if download:
            saved_paths = self.download_task_assets(result, output_dir=output_dir, prefix=f"upscale_{task_id[:8]}_")
            result["downloaded_files"] = saved_paths
        return result

    def remove_background(
        self,
        image_url: Optional[str] = None,
        image_base64: Optional[str] = None,
        wait: bool = True,
        download: bool = True,
        output_dir: Optional[str] = None,
        timeout: int = 120,
    ) -> Dict[str, Any]:
        """Remove image background."""
        if not image_url and not image_base64:
            raise ValueError("Either image_url or image_base64 must be provided.")

        url = f"{self.base_url}/v1/ai/remove-background"
        payload: Dict[str, Any] = {}
        if image_url:
            payload["image_url"] = image_url
        elif image_base64:
            payload["image"] = image_base64

        response = self.session.post(url, json=payload, timeout=20)
        response.raise_for_status()
        initial_data = response.json()

        task_id = (
            initial_data.get("task_id")
            or initial_data.get("id")
            or (initial_data.get("data", {}).get("task_id") if isinstance(initial_data.get("data"), dict) else None)
        )
        if not task_id or not wait:
            return initial_data

        result = self.wait_for_task("v1/ai/remove-background", task_id, timeout=timeout)
        if download:
            saved_paths = self.download_task_assets(result, output_dir=output_dir, prefix=f"cutout_{task_id[:8]}_")
            result["downloaded_files"] = saved_paths
        return result

    def verify_webhook_signature(self, payload_bytes: bytes, signature_header: str) -> bool:
        """Verify HMAC-SHA256 webhook signature using the webhook signing secret."""
        if not self.webhook_secret:
            raise ValueError("MAGNIFIC_WEBHOOK_SECRET is not configured.")

        expected_sig = hmac.new(
            self.webhook_secret.encode("utf-8"),
            payload_bytes,
            hashlib.sha256,
        ).hexdigest()

        return hmac.compare_digest(expected_sig, signature_header)
