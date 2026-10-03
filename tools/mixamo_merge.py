"""Merge Mixamo FBX downloads of one character into a single GLB for the app.
Usage: blender -b -P mixamo_merge.py -- <out.glb> <textures dir> <clip.fbx> [<clip.fbx> ...] [--target <tripo src dir>]
- --target: put these clips on a DIFFERENT character with the same body type and pose. Its Tripo FBX
  (in <tripo src dir>) is fitted with a copy of the Mixamo skeleton (joints moved to its neck, shoulder
  line, torso width and arm span) and skinned to it; <textures dir> should then be the target's textures.
- The first FBX must be downloaded "With Skin"; the others may be "Without Skin".
- Clip names come from the file names minus the character prefix: neoJoyfulJump.fbx -> "JoyfulJump".
- Hips travel along the floor is removed (vertical motion kept) so clips play in place.
- Mixamo only gets the color map (it rejects roughness/metallic), so the full Tripo material is
  rebuilt here from <textures dir> (Color.jpg, Normal.png, *_roughness.*, *_metallic.*)."""
import bpy, sys, os, glob, re

args = sys.argv[sys.argv.index("--") + 1:]
target = None
if "--target" in args:
    i = args.index("--target"); target = args[i + 1]; del args[i:i + 2]
out, texdir, files = args[0], args[1], args[2:]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.scene.render.fps = 30
arm = mesh = None
actions = []
for i, f in enumerate(files):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=f)
    new = [o for o in bpy.data.objects if o not in before]
    a = next(o for o in new if o.type == "ARMATURE")
    act = a.animation_data.action
    act.name = re.sub(r"^[a-z]+", "", os.path.splitext(os.path.basename(f))[0]) or act.name  # neoJoyfulJump -> JoyfulJump
    act.use_fake_user = True
    actions.append(act)
    if i == 0:
        arm = a; mesh = next(o for o in new if o.type == "MESH")
        arm.animation_data.action = None
    else:
        for o in new: bpy.data.objects.remove(o, do_unlink=True)

# Keep clips in place: flatten hips travel on the two horizontal axes of the hips bone's rest frame.
hips = next(b for b in arm.data.bones if b.parent is None)
rest = (arm.matrix_world.to_3x3() @ hips.matrix_local.to_3x3()).normalized()
up_axis = max(range(3), key=lambda k: abs(rest.col[k].z))  # which local axis points at world up
path = 'pose.bones["%s"].location' % hips.name
for act in actions:
    curves = act.fcurves if hasattr(act, "fcurves") and len(act.fcurves) else [fc for l in act.layers for s in l.strips for cb in s.channelbags for fc in cb.fcurves]
    for fc in curves:
        if fc.data_path == path and fc.array_index != up_axis:
            v0 = fc.keyframe_points[0].co.y
            for k in fc.keyframe_points: k.co.y = v0; k.handle_left.y = v0; k.handle_right.y = v0
print("IN-PLACE up axis", up_axis, "clips", [a.name for a in actions])

# Human scale: 1.8 tall (Mixamo hands back a centimetre-scaled rig).
bpy.context.view_layer.update()
zs = [(mesh.matrix_world @ v.co).z for v in mesh.data.vertices]
s = 1.8 / (max(zs) - min(zs))
arm.scale = [v * s for v in arm.scale]

if target:
    from mathutils import Vector, Matrix
    bpy.context.view_layer.update()

    def landmarks(vs):
        zmin = min(v.z for v in vs); H = max(v.z for v in vs) - zmin
        cy = (min(v.y for v in vs) + max(v.y for v in vs)) / 2
        z = lambda f: zmin + f * H
        tw = max(abs(v.x) for v in vs if z(0.30) <= v.z < z(0.42))       # torso half-width (belly band)
        armv = [v for v in vs if abs(v.x) > tw * 1.15 and z(0.35) < v.z < z(0.85)]
        arm_z = sum(v.z for v in armv) / len(armv)                         # shoulder line
        span = max(abs(v.x) for v in armv)
        neck = min((max([abs(v.x) for v in vs if z(f) <= v.z < z(f + 0.01) and abs(v.x) < tw * 1.3] or [9]), z(f + 0.005))
                   for f in [0.62 + k * 0.005 for k in range(40)])[1]       # narrowest slice = neck
        return dict(z=[zmin, arm_z, neck, zmin + H], tw=tw, span=span, cy=cy)

    src_l = landmarks([mesh.matrix_world @ v.co for v in mesh.data.vertices])
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=glob.glob(os.path.join(target, "*.fbx"))[0])
    new = [o for o in bpy.data.objects if o not in before]
    tmesh = next(o for o in new if o.type == "MESH")
    for o in new:
        if o is not tmesh: bpy.data.objects.remove(o, do_unlink=True)
    bpy.ops.object.select_all(action="DESELECT"); tmesh.select_set(True); bpy.context.view_layer.objects.active = tmesh
    bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
    tmesh.modifiers.clear(); tmesh.vertex_groups.clear()
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    # Match Neo's height and floor, centre on x, keep depth centre aligned.
    sz = [mesh.matrix_world @ v.co for v in mesh.data.vertices]
    H0 = max(v.z for v in sz) - min(v.z for v in sz); z0 = min(v.z for v in sz)
    tv = [v.co.copy() for v in tmesh.data.vertices]
    tz = min(v.z for v in tv); th = max(v.z for v in tv) - tz
    tcx = (min(v.x for v in tv) + max(v.x for v in tv)) / 2; tcy = (min(v.y for v in tv) + max(v.y for v in tv)) / 2
    k = H0 / th
    for v in tmesh.data.vertices:
        v.co = Vector(((v.co.x - tcx) * k, (v.co.y - tcy) * k + src_l["cy"], (v.co.z - tz) * k + z0))
    tmesh.data.update()
    tgt_l = landmarks([v.co.copy() for v in tmesh.data.vertices])
    # Decimate like the app's other models.
    if len(tmesh.data.polygons) > 20000:
        dec = tmesh.modifiers.new("dec", "DECIMATE"); dec.ratio = 20000 / len(tmesh.data.polygons)
        bpy.ops.object.modifier_apply(modifier="dec")
    print("LANDMARKS src", {k_: (round(v, 3) if not isinstance(v, list) else [round(x, 3) for x in v]) for k_, v in src_l.items()})
    print("LANDMARKS tgt", {k_: (round(v, 3) if not isinstance(v, list) else [round(x, 3) for x in v]) for k_, v in tgt_l.items()})

    def piecewise(x, xs, ys):
        if x <= xs[0]: return ys[0] + (x - xs[0])
        for i in range(len(xs) - 1):
            if x <= xs[i + 1]:
                t = (x - xs[i]) / (xs[i + 1] - xs[i]); return ys[i] + t * (ys[i + 1] - ys[i])
        return ys[-1] + (x - xs[-1])
    def warp(p):
        ax = abs(p.x); sgn = 1 if p.x >= 0 else -1
        if ax <= src_l["tw"]: nx = ax * tgt_l["tw"] / src_l["tw"]
        else: nx = tgt_l["tw"] + (ax - src_l["tw"]) * (tgt_l["span"] - tgt_l["tw"]) / (src_l["span"] - src_l["tw"])
        return Vector((sgn * nx, p.y - src_l["cy"] + tgt_l["cy"], piecewise(p.z, src_l["z"], tgt_l["z"])))

    # Copy the skeleton and move its joints onto the new body. Bone directions barely change (same
    # T-pose), so Neo's clips play on it unchanged.
    rig = arm.copy(); rig.data = arm.data.copy(); rig.animation_data_clear()
    bpy.context.collection.objects.link(rig)
    bpy.ops.object.select_all(action="DESELECT"); rig.select_set(True); bpy.context.view_layer.objects.active = rig
    M = rig.matrix_world.copy(); Mi = M.inverted()
    bpy.ops.object.mode_set(mode="EDIT")
    for eb in rig.data.edit_bones:
        h, t = warp(M @ eb.head), warp(M @ eb.tail)
        eb.head = Mi @ h; eb.tail = Mi @ t
    bpy.ops.object.mode_set(mode="OBJECT")

    # Skin: copy Mixamo's own weights from Neo's mesh. Warp a copy of it onto the new body with the
    # same mapping as the skeleton, then transfer weights by nearest surface.
    src = mesh.copy(); src.data = mesh.data.copy(); bpy.context.collection.objects.link(src)
    mw = mesh.matrix_world.copy()
    src.parent = None; src.modifiers.clear(); src.matrix_world = Matrix.Identity(4)
    for v in src.data.vertices: v.co = warp(mw @ v.co)
    src.data.update()
    tmesh.parent = rig
    tmesh.matrix_parent_inverse = rig.matrix_world.inverted()
    am = tmesh.modifiers.new("Armature", "ARMATURE"); am.object = rig
    bpy.ops.object.select_all(action="DESELECT"); tmesh.select_set(True); bpy.context.view_layer.objects.active = tmesh
    dt = tmesh.modifiers.new("xfer", "DATA_TRANSFER"); dt.object = src
    dt.use_vert_data = True; dt.data_types_verts = {"VGROUP_WEIGHTS"}; dt.vert_mapping = "POLYINTERP_NEAREST"
    dt.layers_vgroup_select_src = "ALL"; dt.layers_vgroup_select_dst = "NAME"
    bpy.ops.object.datalayout_transfer(modifier="xfer")
    bpy.ops.object.modifier_move_to_index(modifier="xfer", index=0)
    bpy.ops.object.modifier_apply(modifier="xfer")
    bpy.data.objects.remove(src, do_unlink=True)
    left = sum(1 for v in tmesh.data.vertices if sum(g.weight for g in v.groups) < 1e-4)
    print("UNWEIGHTED", left, "of", len(tmesh.data.vertices))
    bpy.data.objects.remove(mesh, do_unlink=True); bpy.data.objects.remove(arm, do_unlink=True)
    arm, mesh = rig, tmesh

# Same face budget as the other characters (the Decimate modifier keeps vertex weights).
if len(mesh.data.polygons) > 21000:
    bpy.ops.object.select_all(action="DESELECT"); mesh.select_set(True); bpy.context.view_layer.objects.active = mesh
    dec = mesh.modifiers.new("dec", "DECIMATE"); dec.ratio = 20000 / len(mesh.data.polygons)
    bpy.ops.object.modifier_move_to_index(modifier="dec", index=0)
    bpy.ops.object.modifier_apply(modifier="dec")

# Rebuild the full material.
def tex(pattern):
    hit = sorted(glob.glob(os.path.join(texdir, pattern)))
    return bpy.data.images.load(hit[0]) if hit else None
mat = bpy.data.materials.new("skin"); mat.use_nodes = True
nt = mat.node_tree; bsdf = nt.nodes["Principled BSDF"]
for pat, sock, noncolor in (("Color.*", "Base Color", False), ("*roughness*", "Roughness", True), ("*metallic*", "Metallic", True)):
    img = tex(pat)
    if img:
        if noncolor: img.colorspace_settings.name = "Non-Color"
        n = nt.nodes.new("ShaderNodeTexImage"); n.image = img
        nt.links.new(n.outputs["Color"], bsdf.inputs[sock])
nimg = tex("Normal.*")
if nimg:
    nimg.colorspace_settings.name = "Non-Color"
    n = nt.nodes.new("ShaderNodeTexImage"); n.image = nimg
    nm = nt.nodes.new("ShaderNodeNormalMap"); nt.links.new(n.outputs["Color"], nm.inputs["Color"]); nt.links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])
mesh.data.materials.clear(); mesh.data.materials.append(mat)
for img in bpy.data.images:
    if img.size[0] > 1024: img.scale(1024, 1024)

# None of the downloaded clips is a calm idle, so key one: arms relaxed at the sides from the T-pose,
# gentle breathing and a slow head turn. Rotations are given about WORLD axes and converted per bone.
import math
from mathutils import Quaternion, Vector
bpy.context.view_layer.update()
W = arm.matrix_world.to_3x3().normalized()
def wrot(name, axis, deg):
    q_rest = (W @ arm.data.bones[name].matrix_local.to_3x3()).to_quaternion()
    return q_rest.inverted() @ Quaternion(Vector(axis).normalized(), math.radians(deg)) @ q_rest
def bone(n): return "mixamorig:" + n
idle = bpy.data.actions.new("idle"); idle.use_fake_user = True
ad0 = arm.animation_data or arm.animation_data_create(); ad0.action = idle
for pb in arm.pose.bones: pb.rotation_mode = "QUATERNION"
for i in range(7):  # 6 keys over 3 s; last == first so it loops
    t = i / 6; b_ = math.sin(t * 2 * math.pi)
    rots = {
        bone("RightArm"): wrot(bone("RightArm"), (0, 1, 0), -72 - 2 * b_),  # about +Y: - lowers the -X arm
        bone("LeftArm"): wrot(bone("LeftArm"), (0, 1, 0), 72 + 2 * b_),
        bone("RightForeArm"): wrot(bone("RightForeArm"), (0, 0, 1), 10),
        bone("LeftForeArm"): wrot(bone("LeftForeArm"), (0, 0, 1), -10),
        bone("Spine1"): wrot(bone("Spine1"), (1, 0, 0), 1.5 * b_),
        bone("Head"): wrot(bone("Head"), (0, 0, 1), 6 * math.sin(t * 2 * math.pi)),
    }
    for pb in arm.pose.bones:
        pb.rotation_quaternion = rots.get(pb.name, Quaternion())
        pb.keyframe_insert("rotation_quaternion", frame=1 + i * 15)
ad0.action = None
for pb in arm.pose.bones: pb.rotation_quaternion = Quaternion()
actions.insert(0, idle)

# One NLA track per clip so the glTF exporter writes each as a named animation.
ad = arm.animation_data or arm.animation_data_create()
for act in actions:
    tr = ad.nla_tracks.new(); tr.name = act.name
    st = tr.strips.new(act.name, int(act.frame_range[0]), act)
    if hasattr(st, "action_slot") and len(getattr(act, "slots", [])): st.action_slot = act.slots[0]
ad.action = None

bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_image_format="JPEG", export_jpeg_quality=85,
                          export_animation_mode="NLA_TRACKS", export_skins=True, export_def_bones=False)
print("DONE", out, len(mesh.data.polygons), "faces")
