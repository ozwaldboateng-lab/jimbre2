import math, os, sys, subprocess, concurrent.futures as cf
Z=int(sys.argv[1]); OUT=sys.argv[2]
LAT0,LAT1,LON0,LON1=29.5,43.0,127.5,143.0
n=2**Z
def tx(lon): return int((lon+180)/360*n)
def ty(lat): r=math.radians(lat); return int((1-math.log(math.tan(r)+1/math.cos(r))/math.pi)/2*n)
xs=range(tx(LON0),tx(LON1)+1); ys=range(ty(LAT1),ty(LAT0)+1)
jobs=[(x,y) for x in xs for y in ys]
print(len(jobs),'tiles', xs, ys)
def get(j):
    x,y=j; p=f'{OUT}/{x}_{y}.png'
    if os.path.exists(p) and os.path.getsize(p)>0: return 0
    r=subprocess.run(['curl','-sS','-f','--max-time','60','-o',p,f'https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{Z}/{x}/{y}.png'])
    return r.returncode
with cf.ThreadPoolExecutor(8) as ex: res=list(ex.map(get,jobs))
print('failed', sum(1 for r in res if r))
