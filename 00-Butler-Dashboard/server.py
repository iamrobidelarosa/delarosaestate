#!/usr/bin/env python3
"""
Estate Command Center — Zero-Dependency Local HTTP Server
Serves 00-Butler-Dashboard with no-cache headers for real-time status reflection.
Author: Turing (@code-expert) | Target: Dela Rosa Residence
"""

import sys
import os
import socket
import webbrowser
from http.server import HTTPServer, SimpleHTTPRequestHandler

DEFAULT_PORT = 8080
HOST = "0.0.0.0"

class NoCacheRequestHandler(SimpleHTTPRequestHandler):
    """
    HTTP Request Handler that injects strict no-cache headers to ensure
    status.json updates are delivered instantaneously without browser caching.
    """

    def end_headers(self):
        # Strict no-cache headers for instantaneous polling updates
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        # Enable CORS for local cross-origin development / testing
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def log_message(self, format, *args):
        # Format clean, readable access log lines
        sys.stdout.write(f"[{self.log_date_time_string()}] {format % args}\n")
        sys.stdout.flush()

    def guess_type(self, path):
        # Ensure correct MIME types for modern web standards
        base, ext = os.path.splitext(path)
        ext = ext.lower()
        mimes = {
            ".html": "text/html; charset=utf-8",
            ".css": "text/css; charset=utf-8",
            ".js": "application/javascript; charset=utf-8",
            ".json": "application/json; charset=utf-8",
            ".svg": "image/svg+xml",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".ico": "image/x-icon",
        }
        return mimes.get(ext, super().guess_type(path))


def find_available_port(start_port=8080, max_attempts=15):
    """Finds an open port starting from start_port."""
    for port in range(start_port, start_port + max_attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind((HOST, port))
                return port
            except OSError:
                continue
    return start_port


def run_server():
    # Guarantee server serves from the directory containing this script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    # Check CLI port override (e.g., `python server.py 8081` or `--port 8081`)
    port = DEFAULT_PORT
    if len(sys.argv) > 1:
        for arg in sys.argv[1:]:
            if arg.isdigit():
                port = int(arg)
                break

    actual_port = find_available_port(port)

    # Print executive launch banner
    print("=" * 72)
    print("       ESTATE COMMAND CENTER — HOUSEHOLD TELEMETRY SERVER")
    print("=" * 72)
    print(f"  Status        : ONLINE")
    print(f"  Local URL     : http://localhost:{actual_port}")
    print(f"  Network URL   : http://127.0.0.1:{actual_port}")
    print(f"  Serving Dir   : {script_dir}")
    print(f"  Status Stream : {os.path.join(script_dir, 'status.json')}")
    print(f"  Caching       : DISABLED (Cache-Control: no-store, must-revalidate)")
    print("=" * 72)
    print(f"  Listening on port {actual_port}. Press Ctrl+C to terminate.")
    print("=" * 72)

    # Auto-open browser if --open flag is present
    if "--open" in sys.argv:
        webbrowser.open(f"http://localhost:{actual_port}")

    httpd = HTTPServer((HOST, actual_port), NoCacheRequestHandler)

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[!] Shutting down Estate Command Center server gracefully...")
        httpd.server_close()
        print("[✓] Server terminated cleanly.")
        sys.exit(0)


if __name__ == "__main__":
    run_server()
