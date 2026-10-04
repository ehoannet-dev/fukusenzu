#!/usr/bin/env python3
"""開発用の簡易サーバー（キャッシュ無効）。python3 devserver.py [ポート]"""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()


if __name__ == '__main__':
    import os
    port = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get('PORT', '8765'))
    print(f'http://localhost:{port}/ でアプリを開けます（Ctrl+C で終了）')
    ThreadingHTTPServer(('127.0.0.1', port), NoCacheHandler).serve_forever()
