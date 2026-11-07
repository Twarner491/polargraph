#!/usr/bin/env python3
"""CAD-derived measurement illustrations. No physical machine access.

Meshes: source part coordinates from the printable 3MF, independently checked
against STEP. Board/rail dimensions: STEP Backing and frame vertex bounds.
Render-only dependencies: numpy, Pillow, shapely; diagramkit from DIAGRAM_KIT.
"""
import os,sys,json,math,zipfile,hashlib
from pathlib import Path
import xml.etree.ElementTree as ET
import numpy as np
from PIL import Image,ImageDraw
from shapely.geometry import Polygon
from shapely.ops import unary_union
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,os.environ.get('DIAGRAM_KIT',str(Path.home()/'.agents/skills/diagram/scripts')))
import diagramkit as dk
OUT=ROOT/'src/static/calibration';OUT.mkdir(exist_ok=True)
ARCHIVE=ROOT/'hardware/3d-print/polargraph.3mf'
z=zipfile.ZipFile(ARCHIVE)
cfg=ET.fromstring(z.read('Metadata/model_settings.config'))
model=ET.fromstring(z.read('3D/3dmodel.model'))
ns={'c':'http://schemas.microsoft.com/3dmanufacturing/core/2015/02'}
def mesh(assembly):
    obj=cfg.find(f"object[@id='{assembly}']")
    m={x.get('key'):x.get('value') for x in obj.find('part').findall('metadata')}
    offset=np.array([float(m['source_offset_'+a]) for a in 'xyz'])
    co=model.find(f"c:resources/c:object[@id='{assembly}']/c:components/c:component",ns)
    src=co.get('{http://schemas.microsoft.com/3dmanufacturing/production/2015/06}path').lstrip('/')
    xml=ET.fromstring(z.read(src))
    v=np.array([[float(a.get(k)) for k in 'xyz'] for a in xml.findall('.//c:vertex',ns)])+offset
    f=np.array([[int(a.get(k)) for k in ('v1','v2','v3')] for a in xml.findall('.//c:triangle',ns)])
    return v,f
LEFT=mesh(42); RIGHT=mesh(44)
SHAFT=560.304145345515; AXIS_Y=715.398183181058
REAR=3.390644492291; EDGE=SHAFT+28.5; TOP=AXIS_Y+28.5
DATUM_BOTTOM=-750.0 # Inner edge of STEP bottom frame rail, not outside of frame.
INK=dk.INK

def silhouette(v,f,axes=(0,1)):
    polys=[Polygon(p) for p in v[f][:,:,axes] if abs((p[1,0]-p[0,0])*(p[2,1]-p[0,1])-(p[1,1]-p[0,1])*(p[2,0]-p[0,0]))>1e-7]
    return unary_union(polys).simplify(.06,preserve_topology=True)

def shape_path(poly,project):
    def ring(coords):
        return 'M'+' L'.join(f'{x:.3f},{y:.3f}' for x,y in map(project,coords))+' Z'
    geoms=list(poly.geoms) if hasattr(poly,'geoms') else [poly]
    return ' '.join(ring(p.exterior.coords)+' '+' '.join(ring(r.coords) for r in p.interiors) for p in geoms)

# A real oblique rendering: all cover triangles retain the same scale in XYZ.
def cover(side):
    v,f=LEFT if side=='left' else RIGHT
    center=np.array([-SHAFT if side=='left' else SHAFT,AXIS_Y,REAR])
    view=np.array([-.65 if side=='left' else .65,.42,1.]);view/=np.linalg.norm(view)
    right=np.cross([0,1,0],view);right/=np.linalg.norm(right)
    up=np.cross(view,right)
    basis=np.array([right,up,view]); q=(v-center)@basis.T
    def project(p):
        p=(np.array(p)-center)@basis.T
        return np.array([180+p[0]*4.05,172-p[1]*4.05])
    img=Image.new('RGB',(1080,1020),'white'); d=ImageDraw.Draw(img)
    def pt(p):return tuple(np.round(project(p)*3).astype(int))
    # Backing slab is deliberately local; it identifies the actual rear seam.
    x=center[0]; yy=center[1]
    board=[(x-48,yy+43,REAR-.15),(x+48,yy+43,REAR-.15),(x+48,yy-48,REAR-.15),(x-48,yy-48,REAR-.15)]
    d.polygon([pt(p) for p in board], fill=(247,247,248),outline=(218,218,220),width=2)
    normal=np.cross(v[f[:,1]]-v[f[:,0]],v[f[:,2]]-v[f[:,0]])
    norms=np.linalg.norm(normal,axis=1); normal/=np.maximum(norms[:,None],1e-12)
    facing=normal@view>1e-6
    # Feature edges omit tessellation diagonals on the smooth printed surface.
    adjacent={}
    for i,tri in enumerate(f):
        for a,b in zip(tri,np.roll(tri,-1)):
            key=tuple(sorted((tuple(np.round(v[a],4)),tuple(np.round(v[b],4)))))
            adjacent.setdefault(key,[]).append(i)
    features=set()
    for key,idx in adjacent.items():
        if len(idx)==1 or any(np.dot(normal[idx[0]],normal[j])<.94 for j in idx[1:]):features.add(key)
    order=np.argsort(q[f][:,:,2].mean(1))
    light=np.array([-.3,.8,1]);light/=np.linalg.norm(light)
    for i in order:
        if not facing[i]:continue
        tri=f[i]; points=[pt(v[j]) for j in tri]
        shade=int(213+33*max(0,float(normal[i]@light)))
        d.polygon(points,fill=(shade,shade,min(255,shade+1)))
        for a,b in zip(tri,np.roll(tri,-1)):
            key=tuple(sorted((tuple(np.round(v[a],4)),tuple(np.round(v[b],4)))))
            if key in features:d.line([pt(v[a]),pt(v[b])],fill=(128,128,132),width=2)
    img=img.resize((720,680),Image.Resampling.LANCZOS)
    img.save(OUT/f'cover-{side}.png',optimize=True)
    # Exact CAD datum segments, expressed in image-space logical 360x340.
    sx=-EDGE if side=='left' else EDGE
    datums={'side':[project((sx,AXIS_Y+1,REAR)).tolist(),project((sx,AXIS_Y+24,REAR)).tolist()],
            'top':[project((center[0]-18,TOP,REAR)).tolist(),project((center[0]+18,TOP,REAR)).tolist()]}
    return datums

def overview_svg():
    # Map CAD millimeters to a fixed 1000x1245 drawing; frame stays proportional.
    scale=.72
    def xy(p):return (500+p[0]*scale,625-p[1]*scale)
    def path(points):return 'M'+' L'.join(f'{a:.3f},{b:.3f}' for a,b in map(xy,points))
    svg=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1245">',
         '<g fill="none" stroke="#18181c" stroke-width="1.1">']
    for x,y,w,h in [(-623,-775.4,1246,1550.8),(-597.6,-750,1195.2,1500)]:
        a,b=xy((x,y+h));svg.append(f'<rect x="{a}" y="{b}" width="{w*scale}" height="{h*scale}" stroke-opacity=".35"/>')
    # Light crosshair is sufficient to locate the coordinate rectangle.
    svg.append(f'<path d="{path([(-597.6,0),(597.6,0)])} {path([(0,750),(0,-750)])}" stroke-opacity=".12" stroke-dasharray="5 7"/>')
    for side,(v,f) in [('left',LEFT),('right',RIGHT)]:
        outline=shape_path(silhouette(v,f),xy)
        svg.append(f'<path d="{outline}" fill="#f4f4f5" stroke-opacity=".65" fill-rule="evenodd"/>')
        x=-SHAFT if side=='left' else SHAFT; a,b=xy((x,AXIS_Y))
        svg.append(f'<circle cx="{a}" cy="{b}" r="{11*scale}" stroke-opacity=".35"/>')
    # Gondola outline is projected from its actual source mesh in X,-Z.
    v,f=mesh(18);v=v[:,[0,2,1]];v[:,1]*=-1
    svg.append(f'<path d="{shape_path(silhouette(v,f),xy)}" fill="#fbfbfb" stroke-opacity=".3"/>')
    svg.append(f'<path d="{path([(-SHAFT,AXIS_Y),(-20,30)])} {path([(SHAFT,AXIS_Y),(20,30)])}" stroke-opacity=".25"/>')
    svg.append('</g></svg>')
    (OUT/'machine-front.svg').write_text(''.join(svg))
    return {k:list(xy(v)) for k,v in {'widthStart':(-EDGE,AXIS_Y+12),'widthEnd':(EDGE,AXIS_Y+12),
            'heightStart':(SHAFT,TOP),'heightEnd':(SHAFT,DATUM_BOTTOM)}.items()}

if __name__=='__main__':
    datums={side:cover(side) for side in ('left','right')}
    datums['overview']=overview_svg()
    datums['source']={'mesh':'hardware/3d-print/polargraph.3mf','mesh_sha256':hashlib.sha256(ARCHIVE.read_bytes()).hexdigest(),
                      'cad':'hardware/cad/polargraph.step','rear_offset_mm':28.5,
                      'overview_note':'Nominal CAD proportions, not the dimensions of an assembled machine.',
                      'height_bottom':'Inner top edge of bottom frame rail at CAD y=-750 mm.'}
    (OUT/'measurement-datums.json').write_text(json.dumps(datums,indent=2)+'\n')
    print(json.dumps(datums,indent=2))
