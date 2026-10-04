"""Render the checked-in Showcase GLBs into transparent community sprites. Blender 5.x.
Usage: blender -b -P render-community-avatars.py -- <repo root> <out dir> [character ...]
With no characters listed, renders every one in <out dir>/manifest.json. The manifest always lists
every character that has sprites. Works with rig.py rigs and Mixamo rigs (bone names mapped)."""
import bpy,sys,math,json
from pathlib import Path
from mathutils import Vector,Quaternion
import numpy as np
args=sys.argv[sys.argv.index('--')+1:]
root=Path(args[0]);out=Path(args[1]);out.mkdir(parents=True,exist_ok=True)
W,H,N=128,160,8
MANIFEST=out/'manifest.json'
known=json.loads(MANIFEST.read_text())['characters'] if MANIFEST.exists() else []
todo=args[2:] or known
MIXAMO={'upper_arm':'Arm','forearm':'ForeArm','thigh':'UpLeg','shin':'Leg'}
for ident in todo:
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.gltf(filepath=str(root/'assets/models'/f'{ident}.glb'))
 rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
 # Discard imported animation playback; pose the same bones without changing the source GLBs.
 rig.animation_data_clear();rig.rotation_mode='XYZ'
 base_z=rig.rotation_euler.z
 # Mixamo rigs: map the rig.py bone names used below. B turns armature space into the rest world frame,
 # so "world" axes stay right when the armature object is rotated (glTF imports of Mixamo rigs are).
 mix='mixamorig:Hips' in rig.data.bones
 def bn(name):
  if not mix:return name
  if name=='hips':return 'mixamorig:Hips'
  if name=='spine':return 'mixamorig:Spine'
  part,side=name.split('.');return 'mixamorig:'+('Right' if side=='R' else 'Left')+MIXAMO[part]
 bpy.context.view_layer.update();B=rig.matrix_world.to_3x3().normalized()
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=10
 scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True
 scene.world=bpy.data.worlds.new('World');scene.world.use_nodes=True
 scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.8,.85,1,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.6
 bpy.ops.object.camera_add(location=(0,-5,1.05));cam=bpy.context.object
 cam.rotation_euler=(Vector((0,0,.95))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=2.15;scene.camera=cam
 for loc,power,size in [((-3,-4,5),450,4),((3,-2,3),250,3),((1,3,4),350,3)]:
  bpy.ops.object.light_add(type='AREA',location=loc);light=bpy.context.object;light.data.energy=power;light.data.shape='DISK';light.data.size=size;light.rotation_euler=(Vector((0,0,1))-light.location).to_track_quat('-Z','Y').to_euler()
 scene.view_settings.view_transform='Standard'
 def worldrot(name,axis,deg):
  name=bn(name);q=(B@rig.data.bones[name].matrix_local.to_3x3()).to_quaternion()
  return q.inverted()@Quaternion(Vector(axis),math.radians(deg))@q
 def pose(run=None):
  for p in rig.pose.bones:p.rotation_mode='QUATERNION';p.rotation_quaternion=Quaternion();p.location=Vector()
  for side,sign in [('R',1),('L',-1)]:
   name='upper_arm.'+side;b=rig.data.bones[bn(name)];d=(B@(b.tail_local-b.head_local)).normalized();elev=math.degrees(math.asin(d.z))
   rig.pose.bones[bn(name)].rotation_quaternion=worldrot(name,(0,1,0),(-72-elev)*sign)
   rig.pose.bones[bn('forearm.'+side)].rotation_quaternion=worldrot('forearm.'+side,(0,0,1),12*sign)
  rig.rotation_euler.z=base_z
  if run is not None:
   # Turn toward the direction of travel, with opposite arm/leg swing and a short stride.
   rig.rotation_euler.z=base_z+math.radians(58)
   t=run*2*math.pi
   for side,phase in [('R',0),('L',math.pi)]:
    swing=math.sin(t+phase)
    name='thigh.'+side;rig.pose.bones[bn(name)].rotation_quaternion=worldrot(name,(1,0,0),32*swing-8)
    name='shin.'+side;rig.pose.bones[bn(name)].rotation_quaternion=worldrot(name,(1,0,0),35+28*math.sin(t+phase-.7))
    name='upper_arm.'+side;rig.pose.bones[bn(name)].rotation_quaternion=worldrot(name,(1,0,0),-30*swing)@rig.pose.bones[bn(name)].rotation_quaternion
    name='forearm.'+side;rig.pose.bones[bn(name)].rotation_quaternion=worldrot(name,(0,0,1),65*(1 if side=='R' else -1))
   hb=rig.data.bones[bn('hips')];up=max(range(3),key=lambda k:abs((B@hb.matrix_local.to_3x3()).col[k].z))
   rig.pose.bones[bn('hips')].location[up if mix else 2]=(.045+.035*math.cos(t*2))/(rig.scale.x if mix else 1)
   rig.pose.bones[bn('spine')].rotation_quaternion=worldrot('spine',(1,0,0),8)
  bpy.context.view_layer.update()
 pose();scene.render.resolution_x=256;scene.render.resolution_y=320
 scene.render.filepath=str(out/f'{ident}-idle.png');bpy.ops.render.render(write_still=True)
 atlas=np.zeros((H,W*N,4),dtype=np.float32)
 for i in range(N):
  pose(i/N);scene.render.resolution_x=W;scene.render.resolution_y=H
  scene.render.filepath=str(out/f'{ident}-frame-{i}.png');bpy.ops.render.render(write_still=True)
  im=bpy.data.images.load(scene.render.filepath,check_existing=False)
  px=np.empty(W*H*4,dtype=np.float32);im.pixels.foreach_get(px);atlas[:,i*W:(i+1)*W,:]=px.reshape(H,W,4)
  bpy.data.images.remove(im)
 sheet=bpy.data.images.new(f'{ident}-run',width=W*N,height=H,alpha=True)
 sheet.pixels.foreach_set(atlas.ravel());sheet.filepath_raw=str(out/f'{ident}-run.png');sheet.file_format='PNG';sheet.save()
 print('SPRITE_DONE',ident,flush=True)
chars=known+[c for c in todo if c not in known]
MANIFEST.write_text(json.dumps({'frames':N,'frameWidth':W,'frameHeight':H,'source':'assets/models/*.glb','characters':chars},indent=2)+'\n')

