"""Read-only verification of cover datums in shipped STEP and 3MF."""
from pathlib import Path
import hashlib,json,re,zipfile,xml.etree.ElementTree as ET
import numpy as np
root=Path(__file__).resolve().parents[1]/'hardware'
step=root/'cad/polargraph.step'
three=root/'3d-print/polargraph.3mf'
e={int(i):v for i,v in re.findall(r'#(\d+)\s*=\s*(.*?);',step.read_text(),re.S)}
def refs(i): return [int(x) for x in re.findall(r'#(\d+)',e[i])]
def xyz(i): return np.array([float(x) for x in re.search(r'\(([^()]+)\)\)$',e[i]).group(1).split(',')])
def walk(i):
 seen=set();todo=[i]
 while todo:
  n=todo.pop()
  if n in seen:continue
  seen.add(n);todo+=refs(n)
 return seen
z=zipfile.ZipFile(three)
config=ET.fromstring(z.read('Metadata/model_settings.config'))
model=ET.fromstring(z.read('3D/3dmodel.model'))
ns={'c':'http://schemas.microsoft.com/3dmanufacturing/core/2015/02'}
rows=[]
for side,body,part,assembly,shaft_surface,faces in [('left',5745,41,42,6911,[998188,998186]),('right',5747,43,44,6939,[998284,998282])]:
 obj=config.find(f"object[@id='{assembly}']")
 values={x.get('key'):x.get('value') for x in obj.find('part').findall('metadata')}
 offset=np.array([float(values['source_offset_'+a]) for a in 'xyz'])
 co=model.find(f"c:resources/c:object[@id='{assembly}']/c:components/c:component",ns)
 src=co.get('{http://schemas.microsoft.com/3dmanufacturing/production/2015/06}path').lstrip('/')
 mesh=ET.fromstring(z.read(src))
 v=np.array([[float(a.get(k)) for k in 'xyz'] for a in mesh.findall('.//c:vertex',ns)])+offset
 shaft=xyz(refs(refs(shaft_surface)[0])[0])
 row={'side':side,'step_body':body,'shaft_surface':shaft_surface,'shaft_origin_mm':shaft.tolist(),'3mf_part':part,'3mf_mesh_file':src,'3mf_source_offset_mm':offset.tolist(),'faces':[]}
 for face in faces:
  p=np.array([xyz(refs(j)[0]) for j in walk(face) if e[j].startswith('VERTEX_POINT(')])
  distances=np.linalg.norm(p[:,None,:]-v[None,:,:],axis=2).min(axis=1)
  rear=p[np.isclose(p[:,2],p[:,2].min())]
  datum_axis=0 if face in [998188,998284] else 1
  datum=rear[0,datum_axis]
  diff=abs(datum-shaft[datum_axis])
  assert abs(diff-28.5)<1e-8
  assert max(distances)<0.0001
  upper=p[np.isclose(p[:,2],p[:,2].max())]
  top_offset=abs(upper[0,datum_axis]-shaft[datum_axis])
  assert abs(top_offset-29.67014888431)<1e-8
  row['faces'].append({'face':face,'rear_vertices_mm':rear.tolist(),
      'shaft_offset_mm':diff,'top_seam_vertices_mm':upper.tolist(),
      'top_seam_shaft_offset_mm':top_offset,'draft_change_mm':top_offset-diff,
      'mesh_max_vertex_residual_mm':float(max(distances))})
 rows.append(row)
out={'sources':{str(p.relative_to(root.parent)):hashlib.sha256(p.read_bytes()).hexdigest() for p in [step,three,root/'cad/Polargraph.f3d']},'results':rows}
(root.parent/'docs/calibration/cover-datum-evidence.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps(out,indent=2))
