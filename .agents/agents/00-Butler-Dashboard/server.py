#!/usr/bin/env python3
"""Loopback-only estate web server and Copilot SDK chat bridge."""

import asyncio
import json
import logging
import os
import socket
import sys
import threading
import webbrowser
from concurrent.futures import TimeoutError as FutureTimeoutError
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

DEFAULT_PORT = 8080
HOST = "127.0.0.1"
MAX_REQUEST_BYTES = 128 * 1024
MAX_RSVP_BYTES = 8 * 1024
MAX_MESSAGE_LENGTH = 20_000
MAX_RSVP_FIELD_LENGTH = 2_000
RESPONSE_TIMEOUT_SECONDS = 180
RSVP_TIMEOUT_SECONDS = 20
DASHBOARD_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = DASHBOARD_DIR.parent
AGENT_DIR = PROJECT_ROOT / ".agents" / "agents"

ROOM_AGENTS = {
    "sterling": {"financial-advisor"},
    "lyra": {"composer", "video-creator", "ui-designer"},
    "comic-creator": {"comic-creator"},
    "knowledge-team": {
        "knowledge-article-author",
        "knowledge-article-reviewer",
        "knowledge-article-publisher",
    },
}

AGENT_FILES = {
    "financial-advisor": "financial-advisor.md",
    "composer": "composer.md",
    "video-creator": "video-creator.md",
    "ui-designer": "ui-designer.md",
    "comic-creator": "comic-creator.md",
    "knowledge-article-author": "knowledge-article-author.md",
    "knowledge-article-reviewer": "knowledge-article-reviewer.md",
    "knowledge-article-publisher": "knowledge-article-publisher.md",
}

AGENT_NAMES = {
    "financial-advisor": "Sterling",
    "composer": "Lyra",
    "video-creator": "Vega",
    "ui-designer": "Iris",
    "comic-creator": "Panel",
    "knowledge-article-author": "Quill",
    "knowledge-article-reviewer": "Verity",
    "knowledge-article-publisher": "Scribe",
}


def load_agent_prompt(agent_id):
    profile_path = AGENT_DIR / AGENT_FILES[agent_id]
    profile = profile_path.read_text(encoding="utf-8-sig").strip()
    if profile.startswith("---"):
        _, separator, body = profile.partition("\n---")
        if separator:
            profile = body.split("\n", 1)[1].strip()
    return (
        f"{profile}\n\n"
        "This is a text-only conversation. Do not claim to access accounts, "
        "send messages, modify files, or create rendered assets."
    )


class OllamaLocalBridge:
    """Local bridge using Ollama for LLM inference without Copilot auth."""

    def __init__(self, base_url="http://localhost:11434", model="llama3.2"):
        self._base_url = base_url
        self._model = model
        self._session = None
        logging.info("OllamaLocalBridge initialized with model=%s", model)

    def _ensure_session(self):
        if self._session is None:
            import requests
            try:
                from requests.adapters import HTTPAdapter
                from urllib3.util.retry import Retry

                retry_strategy = Retry(
                    total=3, backoff_factor=1, status_forcelist=[429, 500, 502, 503, 504],
                )
                adapter = HTTPAdapter(max_retries=retry_strategy)

                self._session = requests.Session()
                self._session.mount("http://", adapter)
                self._session.mount("https://", adapter)
            except ImportError:
                logging.warning("requests not installed; will use urllib3")

    def _reply(self, agent_id, prompt):
        self._ensure_session()
        system_prompt = f"""You are {agent_id}, a specialized AI assistant. Keep responses concise and focused. Here is your profile:

{load_agent_prompt(agent_id)}
"""
        
        payload = {
            "model": self._model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "stream": False,
            "options": {"temperature": 0.7}
        }

        try:
            response = self._session.post(
                f"{self._base_url}/api/generate",
                json=payload,
                timeout=120
            )
            if response.status_code == 200:
                data = response.json()
                content = data.get("response", "No response generated.")
                return content.strip() if content else "Sorry, I couldn't generate a response."
            
            self._send_error(
                f"Ollama request failed with status {response.status_code}: {response.text[:200]}"
            )
        except Exception as e:
            logging.error("Ollama inference failed: %s", type(e).__name__)

        return "Local model (Ollama) is running or responding with errors. Try restarting it, or check that llama3.2 (or another model) is loaded at http://localhost:11434"

    def reply(self, agent_id, prompt):
        try:
            return self._reply(agent_id, prompt)
        except TimeoutError:
            raise
        except Exception as error:
            logging.error(
                "Local model request failed for agent=%s (%s).",
                agent_id,
                type(error).__name__,
            )
            return f"Sorry ({type(error).__name__}): {str(error)[:500]}"

    def close(self):
        if self._session:
            self._session.close()


class EstateRequestHandler(SimpleHTTPRequestHandler):
    server_version = "EstateLocal/1.0"

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

    def _is_loopback_request(self):
        host = urlsplit(f"//{self.headers.get('Host', '')}").hostname
        return host in {"localhost", "127.0.0.1"}

    def _is_same_origin_request(self):
        origin = self.headers.get("Origin")
        host = self.headers.get("Host", "")
        parsed_origin = urlsplit(origin or "")
        return (
            self._is_loopback_request()
            and parsed_origin.scheme == "http"
            and parsed_origin.netloc.lower() == host.lower()
        )

    def _send_json(self, status_code, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if not self._is_loopback_request():
            self.send_error(403, "Loopback access only")
            return
        if urlsplit(self.path).path == "/api/health":
            self._send_json(200, {"status": "ready"})
            return
        super().do_GET()

    def _handle_rsvp(self):
        if not self._is_same_origin_request():
            self._send_json(403, {"error": "Same-origin loopback requests only."})
            return
        if self.headers.get_content_type() != "application/json":
            self._send_json(415, {"error": "Send the RSVP as JSON."})
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self._send_json(400, {"error": "Invalid request length."})
            return
        if content_length <= 0 or content_length > MAX_RSVP_BYTES:
            self._send_json(413, {"error": "The RSVP request is too large."})
            return

        try:
            payload = json.loads(self.rfile.read(content_length))
        except (json.JSONDecodeError, UnicodeDecodeError):
            self._send_json(400, {"error": "The request body must be valid JSON."})
            return
        if not isinstance(payload, dict):
            self._send_json(400, {"error": "The request body must be a JSON object."})
            return

        name = payload.get("name")
        attendance = payload.get("attendance")
        guests = payload.get("guests")
        swimming = payload.get("swimming")
        message = payload.get("message", "")
        if not isinstance(name, str) or not name.strip() or len(name.strip()) > 200:
            self._send_json(400, {"error": "Enter a name of 1 to 200 characters."})
            return
        if not isinstance(attendance, str) or attendance not in {
            "Joyfully Accepts",
            "Regretfully Declines",
        }:
            self._send_json(400, {"error": "Choose a valid attendance response."})
            return
        if not isinstance(guests, str) or guests not in {"1", "2", "3", "4"}:
            self._send_json(400, {"error": "Choose a valid guest count."})
            return
        if not isinstance(swimming, str) or swimming not in {
            "Yes, bringing swimwear!",
            "No, main program only",
        }:
            self._send_json(400, {"error": "Choose a valid swimming response."})
            return
        if not isinstance(message, str) or len(message) > MAX_RSVP_FIELD_LENGTH:
            self._send_json(400, {"error": "The guest names field is too long."})
            return

        script_url = os.environ.get("JM18_GOOGLE_SCRIPT_URL", "").strip()
        script_parts = urlsplit(script_url)
        if (
            script_parts.scheme != "https"
            or script_parts.hostname != "script.google.com"
            or not script_parts.path.startswith("/macros/s/")
            or not script_parts.path.endswith("/exec")
        ):
            logging.error("RSVP submission is unavailable: JM18_GOOGLE_SCRIPT_URL is not configured.")
            self._send_json(503, {"error": "The RSVP service is not configured yet. Please contact the host."})
            return

        request_payload = {
            "name": name.strip(),
            "attendance": attendance,
            "guests": guests,
            "swimming": swimming,
            "message": message.strip() or "—",
        }
        request = Request(
            script_url,
            data=json.dumps(request_payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urlopen(request, timeout=RSVP_TIMEOUT_SECONDS) as response:
                result = json.loads(response.read().decode("utf-8"))
            if not isinstance(result, dict) or result.get("status") != "success":
                raise ValueError("Google Apps Script did not confirm the RSVP.")
        except (HTTPError, URLError, TimeoutError, UnicodeDecodeError, json.JSONDecodeError, ValueError) as error:
            logging.error("RSVP forwarding failed (%s).", type(error).__name__)
            self._send_json(502, {"error": "We could not submit your RSVP. Please try again later."})
            return

        self._send_json(200, {"status": "success"})

    def do_POST(self):
        path = urlsplit(self.path).path
        if path == "/api/rsvp":
            self._handle_rsvp()
            return
        if path != "/api/chat":
            self.send_error(404, "Not found")
            return
        if not self._is_same_origin_request():
            self.send_error(403, "Same-origin loopback requests only")
            return
        if self.headers.get_content_type() != "application/json":
            self._send_json(415, {"error": "Send the prompt as JSON."})
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self._send_json(400, {"error": "Invalid request length."})
            return
        if content_length <= 0 or content_length > MAX_REQUEST_BYTES:
            self._send_json(413, {"error": "The prompt request is too large."})
            return

        try:
            payload = json.loads(self.rfile.read(content_length))
        except (json.JSONDecodeError, UnicodeDecodeError):
            self._send_json(400, {"error": "The request body must be valid JSON."})
            return
        if not isinstance(payload, dict):
            self._send_json(400, {"error": "The request body must be a JSON object."})
            return

        room = payload.get("room")
        agent_id = payload.get("agent")
        prompt = payload.get("message")
        if not all(isinstance(value, str) for value in (room, agent_id, prompt)):
            self._send_json(400, {"error": "Room, agent, and message are required."})
            return
        prompt = prompt.strip()
        if not prompt or len(prompt) > MAX_MESSAGE_LENGTH:
            self._send_json(
                400,
                {"error": f"Prompts must be between 1 and {MAX_MESSAGE_LENGTH} characters."},
            )
            return
        if room not in ROOM_AGENTS or agent_id not in ROOM_AGENTS[room]:
            self._send_json(400, {"error": "That agent is not available in this room."})
            return

        try:
            reply = self.server.ollama_bridge.reply(agent_id, prompt)
        except TimeoutError:
            self._send_json(504, {"error": "The model response timed out. Please try again."})
        except Exception as error:
            logging.error(
                "Local model request failed for room=%s agent=%s (%s).",
                room,
                agent_id,
                type(error).__name__,
            )
            self._send_json(
                    502,
                    {
                        "error": (
                            f"Model inference failed. Check that Ollama is running at {self.server.ollama_bridge._base_url} "
                            f"and that your preferred model is loaded. Logs: {str(error)[:300]}"
                        )
                    },
                )
        else:
            self._send_json(200, {"reply": reply, "agent": AGENT_NAMES[agent_id]})


def find_available_port(start_port=DEFAULT_PORT, max_attempts=15):
    for port in range(start_port, start_port + max_attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as connection:
            try:
                connection.bind((HOST, port))
                return port
            except OSError:
                continue
    raise OSError(
        f"No free local port found between {start_port} and {start_port + max_attempts - 1}."
    )


def run_server():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    port = DEFAULT_PORT
    for argument in sys.argv[1:]:
        if argument.isdigit():
            port = int(argument)
            break

    bridge = None
    try:
        bridge = OllamaLocalBridge()
        actual_port = find_available_port(port)
        handler = partial(EstateRequestHandler, directory=str(DASHBOARD_DIR))
        httpd = ThreadingHTTPServer((HOST, actual_port), handler)
    except Exception as error:
        if bridge is not None:
            bridge.close()
        logging.error("Estate server could not start (%s): %s", type(error).__name__, error)
        return 1

    httpd.ollama_bridge = bridge
    print("=" * 72)
    print("       ESTATE COMMAND CENTER — OLLAMA CHAT SERVER")
    print("=" * 72)
    print("  Status        : ONLINE")
    print(f"  Local URL     : http://localhost:{actual_port}")
    print(f"  Listening on  : {HOST}:{actual_port} (loopback only)")
    print(f"  Serving Dir   : {DASHBOARD_DIR}")
    print("  Local LLM     : READY (via Ollama)")
    print("  CORS          : DISABLED")
    print("=" * 72)
    print("  Press Ctrl+C to terminate the server.\n")

    if "--open" in sys.argv:
        webbrowser.open(f"http://localhost:{actual_port}")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down the estate server...")
    finally:
        httpd.server_close()
        bridge.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(run_server())
