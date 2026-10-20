from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
import threading
from playwright.sync_api import sync_playwright
r=Path(__file__).parent
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
s=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(r)));threading.Thread(target=s.serve_forever,daemon=True).start()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);page=b.new_page(viewport={'width':1200,'height':600});page.goto(f'http://127.0.0.1:{s.server_address[1]}/SW-grip-check.html');page.wait_for_function('window.checkReady');page.screenshot(path=str(r/'SW-weapon-check.png'));b.close()
s.shutdown()
