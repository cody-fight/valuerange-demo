from http.server import ThreadingHTTPServer,BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse
import re,json
ROOT=Path(__file__).resolve().parent
FILES={'/':'preview.html','/preview.html':'preview.html','/ValueRange-Draft-v6-EN-ZH.mp4':'ValueRange-Draft-v6-EN-ZH.mp4','/poster.jpg':'poster.jpg','/preview-compatible.webm':'preview-compatible.webm','/subtitles-bilingual.srt':'subtitles-bilingual.srt'}
TYPES={'.html':'text/html; charset=utf-8','.mp4':'video/mp4','.jpg':'image/jpeg','.webm':'video/webm','.srt':'text/plain; charset=utf-8'}
class Handler(BaseHTTPRequestHandler):
    def do_HEAD(self):self.send_file(False)
    def do_GET(self):self.send_file(True)
    def send_file(self,body):
        path=urlparse(self.path).path
        if path not in FILES:self.send_error(404);return
        file=ROOT/FILES[path]
        if not file.exists():self.send_error(404);return
        size=file.stat().st_size;lo=0;hi=size-1;status=200
        match=re.fullmatch(r'bytes=(\d+)-(\d*)',self.headers.get('Range',''))
        if match:
            lo=int(match[1]);hi=min(size-1,int(match[2]) if match[2] else size-1);status=206
            if lo>hi:self.send_error(416);return
        self.send_response(status);self.send_header('Content-Type',TYPES[file.suffix]);self.send_header('Content-Length',str(hi-lo+1));self.send_header('Accept-Ranges','bytes')
        if status==206:self.send_header('Content-Range',f'bytes {lo}-{hi}/{size}')
        self.end_headers()
        if body:
            try:
                with file.open('rb') as f:
                    f.seek(lo);remaining=hi-lo+1
                    while remaining:
                        data=f.read(min(65536,remaining))
                        if not data:break
                        self.wfile.write(data);remaining-=len(data)
            except (BrokenPipeError,ConnectionResetError,ConnectionAbortedError):pass
if __name__=='__main__':
    server=ThreadingHTTPServer(('127.0.0.1',4190),Handler)
    print('ValueRange video review: http://127.0.0.1:4190/',flush=True)
    server.serve_forever()



