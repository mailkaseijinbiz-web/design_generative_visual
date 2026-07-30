#!/usr/bin/env python3
# ローカル実行用の小さな配信＋中継。macOS標準のpython3で動く（依存なし）。
#
#   使い方:  python3 tools/localrelay.py
#            → ブラウザで http://127.0.0.1:8787 を開く
#
# このサーバはリポジトリ一式を配信しつつ、/sdapi/* を Draw Things / A1111
# （既定 http://127.0.0.1:7860）へ中継する。ページと同じ配信元を通るので、
# 画像生成側のCORS設定が一切要らなくなる。
# 中継先を変えるときは SD_URL=http://127.0.0.1:7861 のように環境変数で。
import http.server
import os
import urllib.request
import urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SD = os.environ.get("SD_URL", "http://127.0.0.1:7860")
PORT = int(os.environ.get("PORT", "8787"))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    # git pull 直後に古いページが出ないよう、ブラウザにキャッシュさせない
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_POST(self):
        if not self.path.startswith("/sdapi/"):
            self.send_response(404)
            self.end_headers()
            return
        n = int(self.headers.get("content-length", 0))
        body = self.rfile.read(n)
        req = urllib.request.Request(SD + self.path, data=body,
                                     headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=600) as r:
                data, code = r.read(), r.status
        except urllib.error.HTTPError as e:
            data, code = e.read(), e.code
        except Exception as e:
            data = ('{"error":"Draw Things / A1111 に届きません: %s"}' % e).encode()
            code = 502
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    # 一気描きは同時に複数投げるので、スレッド版で受ける
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print("感性モーフ: http://127.0.0.1:%d を開いてください（/sdapi → %s へ中継）" % (PORT, SD))
    srv.serve_forever()
