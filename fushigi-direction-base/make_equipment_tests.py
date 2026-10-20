"""Deliberately simple diagnostic silhouettes, not production weapon artwork."""
from PIL import Image,ImageDraw
from pathlib import Path
p=Path(__file__).parent/'assets'/'hero-base'/'equipment-test';p.mkdir(exist_ok=True)
im=Image.new('RGBA',(96,256));d=ImageDraw.Draw(im)
d.polygon([(48,8),(58,39),(56,177),(40,177),(38,39)],fill='#cddce1',outline='#526a75',width=2)
d.line((48,22,48,174),fill='#f7ffff',width=3);d.rounded_rectangle((17,174,79,186),radius=4,fill='#c89a40',outline='#493a22',width=2)
d.rounded_rectangle((41,184,55,231),radius=3,fill='#715038');d.ellipse((39,229,57,245),fill='#c89a40')
im.save(p/'weapon.png')
im=Image.new('RGBA',(160,192));d=ImageDraw.Draw(im)
d.polygon([(80,9),(145,31),(138,113),(113,154),(80,183),(47,154),(22,113),(15,31)],fill='#b58a3c',outline='#514a37',width=3)
d.polygon([(80,22),(131,42),(125,110),(105,145),(80,166),(55,145),(35,110),(29,42)],fill='#405765',outline='#e7c478',width=3)
d.line((80,26,80,160),fill='#92abb5',width=4);d.line((37,91,123,91),fill='#92abb5',width=4);d.ellipse((68,81,92,105),fill='#d1ac62',outline='#302d25',width=2)
im.save(p/'shield.png')
