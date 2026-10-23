"""Shared corner contract for all directional boundaries; game y points down."""
import math
CORNERS=[(-1,-1),(1,-1),(-1,1),(1,1)]
N=4

def height(x,y):return 1.45+.18*math.sin(math.pi*x*3+.4)*math.cos(math.pi*y*2+.8)+.13*math.cos(math.pi*(x+y)*4)+.09*math.sin(math.pi*(x-y)*5+.3)

def corner_shift(sx,sy,bits):
 # Occupied floor quadrants around this vertex: across x, across y, diagonal.
 floors=[(sx,-sy),(-sx,sy),(sx,sy)]
 fx=sum(p[0] for i,p in enumerate(floors) if bits&(1<<i))
 fy=sum(p[1] for i,p in enumerate(floors) if bits&(1<<i))
 count=bits.bit_count();length=math.hypot(fx,fy)
 if not length:return (0,0)
 amount=.29 if count==3 else .23 if count==1 else .07
 return (-fx/length*amount,-fy/length*amount)

def point(corner,bits,phase,a,b):
 sx,sy=CORNERS[corner];ox=phase%2;oy=phase//2
 # a,b go from tile center to the selected outer vertex.
 u=.5+sx*a*.5;v=.5+sy*b*.5
 dx,dy=corner_shift(sx,sy,bits)
 # X-neighbor is bit0, Y-neighbor bit1. Different visible directions have
 # different shoulder depths but use the same endpoint contract at corners.
 xm=(.20+.085*math.sin(math.pi*(oy+.5)+.7)) if bits&1 else 0
 ym=((.24 if sy<0 else .18)+.075*math.cos(math.pi*(ox+.5)+.3)) if bits&2 else 0
 # Bilinear shared center/midpoint/corner positions.
 shiftx=(-sx*xm)*a*(1-b)+dx*a*b
 shifty=(-sy*ym)*b*(1-a)+dy*a*b
 # Faceted exposed shoulders, zero at the midpoints and shared corners.
 if bits&1:shiftx+=-sx*.035*math.sin(math.pi*b)*a*a
 if bits&2:shifty+=-sy*.055*math.sin(math.pi*a)*b*b
 return (u+shiftx,v+shifty,height(u+ox,v+oy))
