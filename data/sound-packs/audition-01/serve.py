"""Loopback-only audition player. Ratings are saved next to the manifest."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import json
import threading
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
LOCK = threading.Lock()
PORT = 3211
EMPTY = {'pack': 'audition-01', 'ratings': {}}

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def respond(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status); self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body))); self.send_header('Cache-Control', 'no-store')
        self.end_headers(); self.wfile.write(body)

    def do_GET(self):
        if self.path == '/api/ratings':
            with LOCK:
                file = ROOT/'ratings.json'
                return self.respond(json.loads(file.read_text()) if file.exists() else EMPTY)
        return super().do_GET()

    def do_POST(self):
        if self.path != '/api/ratings':
            return self.respond({'error': 'Unknown route'}, 404)
        origin = self.headers.get('Origin')
        if origin != f'http://127.0.0.1:{PORT}':
            return self.respond({'error': 'Invalid origin'}, 403)
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if not 0 < size <= 8192: raise ValueError('Invalid size')
            data = json.loads(self.rfile.read(size))
            key = data['id']; rating = data.get('rating', ''); note = data.get('note', '')
            if key not in {f'{n:02d}' for n in range(1,51)}: raise ValueError('Invalid sound')
            if rating not in ('', 'like', 'no', 'maybe') or not isinstance(note, str) or len(note)>2000:
                raise ValueError('Invalid rating')
            with LOCK:
                file = ROOT/'ratings.json'
                result = json.loads(file.read_text()) if file.exists() else {'pack':'audition-01','ratings':{}}
                if rating or note: result['ratings'][key] = {'rating':rating,'note':note}
                else: result['ratings'].pop(key, None)
                temp = ROOT/'ratings.json.tmp'
                temp.write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n'); temp.replace(file)
            self.respond(result)
        except (ValueError, KeyError, TypeError):
            self.respond({'error':'Invalid request'}, 400)

if __name__ == '__main__':
    print(f'Каталог звуков: http://127.0.0.1:{PORT}', flush=True)
    ThreadingHTTPServer(('127.0.0.1', PORT), Handler).serve_forever()
