import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError


def load_dotenv(dotenv_path: str) -> None:
    if not os.path.exists(dotenv_path):
        return

    with open(dotenv_path, "r", encoding="utf-8") as handle:
        for raw_line in handle:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip()
            if key and key not in os.environ:
                os.environ[key] = value


load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

PORT = int(os.getenv("PORT", "8787"))
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1/responses")
ALLOWED_ORIGIN = os.getenv("ALLOWED_ORIGIN", "*")
DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "gpt-4.1-mini")
ALLOWED_ORIGIN_LIST = [value.strip() for value in ALLOWED_ORIGIN.split(",") if value.strip()]

if not OPENAI_API_KEY or OPENAI_API_KEY.startswith("sk-PASTE-"):
    print("[ask-anton-proxy] OPENAI_API_KEY is not configured. Model requests will fail until it is set.")


class AskAntonProxyHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _is_allowed_origin(self, req_origin: str) -> bool:
        if ALLOWED_ORIGIN == "*" or "*" in ALLOWED_ORIGIN_LIST:
            return True
        if not req_origin and "null" in ALLOWED_ORIGIN_LIST:
            return True
        return req_origin in ALLOWED_ORIGIN_LIST

    def _set_cors_headers(self, req_origin: str) -> None:
        allow_origin = "*" if (ALLOWED_ORIGIN == "*" or "*" in ALLOWED_ORIGIN_LIST) else req_origin
        self.send_header("Access-Control-Allow-Origin", allow_origin or "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def _send_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        req_origin = self.headers.get("Origin", "")
        self.send_response(status)
        self._set_cors_headers(req_origin)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_json_body(self) -> dict:
        raw_len = self.headers.get("Content-Length", "0")
        try:
            length = int(raw_len)
        except ValueError:
            raise ValueError("Invalid Content-Length.")

        if length <= 0:
            return {}
        if length > 1024 * 1024:
            raise ValueError("Request body too large.")

        data = self.rfile.read(length)
        try:
            return json.loads(data.decode("utf-8"))
        except json.JSONDecodeError as error:
            raise ValueError("Invalid JSON body.") from error

    def _sanitize_payload(self, raw_payload: dict) -> dict:
        model = raw_payload.get("model")
        model = model.strip() if isinstance(model, str) and model.strip() else DEFAULT_MODEL

        input_text = raw_payload.get("input")
        input_text = input_text if isinstance(input_text, str) else ""
        if not input_text.strip():
            raise ValueError("Missing input text.")

        payload = {
            "model": model,
            "input": input_text
        }

        tools = raw_payload.get("tools")
        if isinstance(tools, list):
            allowed = []
            for tool in tools:
                tool_type = tool.get("type") if isinstance(tool, dict) else ""
                if tool_type in ("web_search_preview", "web_search"):
                    allowed.append({"type": tool_type})
                if len(allowed) >= 1:
                    break
            if allowed:
                payload["tools"] = allowed

        return payload

    def _forward_to_openai(self, payload: dict) -> tuple[int, dict]:
        req = Request(
            OPENAI_BASE_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {OPENAI_API_KEY}"
            },
            method="POST"
        )

        try:
            with urlopen(req, timeout=30) as response:
                response_body = response.read().decode("utf-8")
                data = json.loads(response_body) if response_body else {}
                return int(response.status), data
        except HTTPError as error:
            try:
                detail = error.read().decode("utf-8")
                parsed = json.loads(detail) if detail else {"message": str(error)}
            except Exception:
                parsed = {"message": str(error)}
            return int(error.code), {"error": "Upstream model request failed.", "details": parsed}
        except URLError as error:
            return 502, {"error": "Could not reach upstream model provider.", "details": str(error)}

    def do_OPTIONS(self) -> None:
        req_origin = self.headers.get("Origin", "")
        if not self._is_allowed_origin(req_origin):
            self._send_json(403, {"error": "Origin not allowed."})
            return

        self.send_response(204)
        self._set_cors_headers(req_origin)
        self.end_headers()

    def do_GET(self) -> None:
        if self.path == "/health":
            self._send_json(200, {"ok": True, "service": "ask-anton-proxy"})
            return

        self._send_json(404, {"error": "Not found."})

    def do_POST(self) -> None:
        req_origin = self.headers.get("Origin", "")

        if self.path != "/api/ask-anton":
            self._send_json(404, {"error": "Not found."})
            return

        if not self._is_allowed_origin(req_origin):
            self._send_json(403, {"error": "Origin not allowed."})
            return

        if not OPENAI_API_KEY or OPENAI_API_KEY.startswith("sk-PASTE-"):
            self._send_json(500, {"error": "Server is missing OPENAI_API_KEY."})
            return

        try:
            body = self._read_json_body()
            payload = self._sanitize_payload(body)
            status, data = self._forward_to_openai(payload)
            self._send_json(status, data)
        except ValueError as error:
            self._send_json(400, {"error": str(error)})
        except Exception as error:
            self._send_json(500, {"error": "Unexpected server error.", "details": str(error)})


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", PORT), AskAntonProxyHandler)
    print(f"[ask-anton-proxy] listening on http://127.0.0.1:{PORT}")
    print(f"[ask-anton-proxy] POST endpoint: http://127.0.0.1:{PORT}/api/ask-anton")
    server.serve_forever()
