"""Download official CC BY 4.0 loop MP3s; retain exact bytes and provenance."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import urllib.request,zipfile,io,json,hashlib
P=Path(__file__).resolve().parent
tracks=[
 ('town','Harvest5','https://peritune.com/blog/2018/10/26/harvest5/','https://peritune.com/loop/PerituneMaterial_Harvest5_loop.zip'),
 ('green','Breeze','https://peritune.com/blog/2017/03/02/breeze/','https://peritune.com/loop/PerituneMaterial_Breeze_loop.zip'),
 ('depth','Labyrinth','https://peritune.com/blog/2015/11/01/labyrinth/','https://peritune.com/music/PerituneMaterial_Labyrinth_loop.mp3'),
 ('spooky','Spook','https://peritune.com/blog/2015/09/30/spook/','https://peritune.com/loop/PerituneMaterial_Spook_loop.zip')]
def fetch(row):
 key,title,page,url=row
 data=urllib.request.urlopen(url,timeout=90).read();member=None
 if url.endswith('.zip'):
  z=zipfile.ZipFile(io.BytesIO(data));names=[n for n in z.namelist() if n.lower().endswith('.mp3') and not n.startswith('__MACOSX')];assert len(names)==1,names;member=names[0];data=z.read(member)
 dest=P/'audio'/f'{key}.mp3';dest.write_bytes(data)
 print(title,len(data),flush=True)
 return dict(id=key,title=title,artist='PeriTune / むつき醒',page=page,download=url,archiveMember=member,file=f'audio/{key}.mp3',license='CC BY 4.0',licenseUrl='https://creativecommons.org/licenses/by/4.0/',modifications='None; official loop MP3 bytes unchanged',sha256=hashlib.sha256(data).hexdigest(),checked='2026-10-21')
if __name__=='__main__':
 (P/'audio').mkdir(exist_ok=True)
 rows=list(ThreadPoolExecutor(max_workers=4).map(fetch,tracks))
 (P/'sources'/'bgm.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
