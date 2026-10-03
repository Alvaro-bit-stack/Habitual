"""Rig a Tripo T/A-pose character: fit a humanoid skeleton from mesh geometry, skin it with
bone-heat weights, key idle / wave / cheer actions, export one GLB.
Usage: blender -b -P rig.py -- <src dir with .fbx> <out.glb> [preview_dir] [--faces N]
--faces N: delete enclosed (never visible) faces (hits closer than 3 mm are ignored), then decimate to about N faces."""
import bpy, bmesh, sys, os, glob, math
from mathutils.bvhtree import BVHTree
from mathutils import Vector, Quaternion, Matrix

args = sys.argv[sys.argv.index("--") + 1:]
target_faces = None
if "--faces" in args:
    i = args.index("--faces"); target_faces = int(args[i + 1]); del args[i:i + 2]
src, out = args[0], args[1]
preview = args[2] if len(args) > 2 else None
FPS = 30

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.scene.render.fps = FPS
bpy.ops.import_scene.fbx(filepath=glob.glob(os.path.join(src, "*.fbx"))[0])
mesh = [o for o in bpy.data.objects if o.type == "MESH"][0]
for o in list(bpy.data.objects):
    if o is not mesh: bpy.data.objects.remove(o, do_unlink=True)
bpy.context.view_layer.objects.active = mesh; mesh.select_set(True)
bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# ---- normalize: 1.8 m tall, feet at z=0, centered on x/y
vs = [v.co.copy() for v in mesh.data.vertices]
zmin = min(v.z for v in vs); zmax = max(v.z for v in vs)
s = 1.8 / (zmax - zmin)
cx = (min(v.x for v in vs) + max(v.x for v in vs)) / 2
cy = (min(v.y for v in vs) + max(v.y for v in vs)) / 2
for v in mesh.data.vertices:
    v.co = Vector(((v.co.x - cx) * s, (v.co.y - cy) * s, (v.co.z - zmin) * s))
mesh.data.update()
H = 1.8

def cull_hidden(me):
    """Delete faces no ray can escape from: enclosed geometry nobody will ever see."""
    bm = bmesh.new(); bm.from_mesh(me)
    tree = BVHTree.FromBMesh(bm)
    n, golden = 32, math.pi * (3 - math.sqrt(5))
    dirs = []
    for k in range(n):  # even spread over the sphere; both hemispheres so flipped normals can't fool it
        z = 1 - 2 * (k + 0.5) / n; r = math.sqrt(1 - z * z)
        dirs.append(Vector((math.cos(golden * k) * r, math.sin(golden * k) * r, z)))
    hidden = []
    for f in bm.faces:
        c = f.calc_center_median()
        # start 3 mm out so Tripo's thin double-layer shells don't hide each other
        if all(tree.ray_cast(c + d * 0.003, d)[0] is not None for d in dirs): hidden.append(f)
    bmesh.ops.delete(bm, geom=hidden, context="FACES")
    bm.to_mesh(me); bm.free()
    return len(hidden)

if target_faces:
    before = len(mesh.data.polygons)
    culled = cull_hidden(mesh.data)
    left = len(mesh.data.polygons)
    if left > target_faces:
        dec = mesh.modifiers.new("dec", "DECIMATE"); dec.ratio = target_faces / left
        bpy.ops.object.modifier_apply(modifier="dec")
    print("FACES", before, "-> culled", culled, "->", len(mesh.data.polygons))

vs = [v.co.copy() for v in mesh.data.vertices]

def slice_(z0, z1): return [v for v in vs if z0 <= v.z < z1]

# torso half-width: median x-extent in the belly band (no arms there in T or A pose)
belly = slice_(0.30 * H, 0.42 * H)
torso_w = max(abs(v.x) for v in belly)

# neck = narrowest slice between 0.62H and 0.82H (ignoring arm verts)
best = None
for i in range(40):
    z0 = 0.62 * H + i * 0.005 * H
    sl = [v for v in slice_(z0, z0 + 0.01 * H) if abs(v.x) < torso_w * 1.3]
    if len(sl) < 20: continue
    w = max(abs(v.x) for v in sl)
    if best is None or w < best[0]: best = (w, z0 + 0.005 * H)
neck_z = best[1]

# arms: verts well outside the torso, above the belly. Fit per side via x-bin centroids.
def arm_line(sign):
    arm = [v for v in vs if sign * v.x > torso_w * 1.15 and 0.35 * H < v.z < neck_z]
    tip = max(arm, key=lambda v: sign * v.x)
    xs = sorted(sign * v.x for v in arm)
    x0, x1 = xs[0], xs[-1]
    pts = []
    for k in range(10):
        a = x0 + (x1 - x0) * k / 10; b = a + (x1 - x0) / 10
        b_ = [v for v in arm if a <= sign * v.x < b]
        if b_: pts.append(sum(b_, Vector()) / len(b_))
    d = (pts[-1] - pts[0]).normalized()
    # shoulder joint sits inside the torso, back along the arm line
    shoulder = pts[0] - d * ((pts[0].x * sign) - torso_w * 0.55) / abs(d.x)
    hand_tip = tip.copy(); hand_tip.y = pts[-1].y
    return shoulder, hand_tip

# legs: per-side centroid of shin band; ankles from foot band
def leg(sign):
    shin = [v for v in slice_(0.08 * H, 0.22 * H) if sign * v.x > 0]
    c = sum(shin, Vector()) / len(shin)
    foot = [v for v in slice_(0.0, 0.04 * H) if sign * v.x > 0]
    toe_y = min(v.y for v in foot)  # toes point toward -Y
    return c.x, c.y, toe_y

hip_z = 0.29 * H
arm_d = bpy.data.armatures.new("Rig")
rig = bpy.data.objects.new("Rig", arm_d)
bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode="EDIT")
E = arm_d.edit_bones

def bone(name, head, tail, parent=None, connect=False):
    b = E.new(name); b.head = Vector(head); b.tail = Vector(tail)
    if parent: b.parent = E[parent]; b.use_connect = connect
    b.roll = 0
    return b

cy0 = sum(v.y for v in belly) / len(belly)
bone("hips", (0, cy0, hip_z), (0, cy0, 0.40 * H))
bone("spine", (0, cy0, 0.40 * H), (0, cy0, 0.52 * H), "hips", True)
bone("chest", (0, cy0, 0.52 * H), (0, cy0, neck_z - 0.04 * H), "spine", True)
bone("neck", (0, cy0, neck_z - 0.04 * H), (0, cy0, neck_z + 0.03 * H), "chest", True)
bone("head", (0, cy0, neck_z + 0.03 * H), (0, cy0, H), "neck", True)

for sign, side in ((-1, "R"), (1, "L")):  # character's right is -X (faces -Y)
    sh, tip = arm_line(sign)
    root = Vector((sign * torso_w * 0.2, cy0, sh.z))
    wrist = sh.lerp(tip, 0.82)
    elbow = sh.lerp(wrist, 0.5)
    bone("shoulder." + side, root, sh, "chest")
    bone("upper_arm." + side, sh, elbow, "shoulder." + side, True)
    bone("forearm." + side, elbow, wrist, "upper_arm." + side, True)
    bone("hand." + side, wrist, tip, "forearm." + side, True)
    lx, ly, toe_y = leg(sign)
    bone("thigh." + side, (lx, ly, hip_z - 0.02 * H), (lx, ly, 0.15 * H), "hips")
    bone("shin." + side, (lx, ly, 0.15 * H), (lx, ly, 0.05 * H), "thigh." + side, True)
    bone("foot." + side, (lx, ly, 0.05 * H), (lx, toe_y + 0.02 * H, 0.015 * H), "shin." + side, True)
bpy.ops.object.mode_set(mode="OBJECT")

# ---- skin: bone heat, then fix any vertex the heat solver left unweighted
bpy.ops.object.select_all(action="DESELECT")
mesh.select_set(True); rig.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.parent_set(type="ARMATURE_AUTO")
unweighted = sum(1 for v in mesh.data.vertices if sum(g.weight for g in v.groups) < 1e-4)
if unweighted > 0.01 * len(mesh.data.vertices):
    # Bone heat fails on meshes with holes / overlapping shells. Weight a watertight voxel copy instead,
    # then copy its weights onto the real mesh by nearest surface.
    print("HEAT FAILED on", unweighted, "verts; using voxel proxy")
    proxy = mesh.copy(); proxy.data = mesh.data.copy(); bpy.context.collection.objects.link(proxy)
    proxy.parent = None; proxy.modifiers.clear(); proxy.vertex_groups.clear()
    rm = proxy.modifiers.new("remesh", "REMESH"); rm.mode = "VOXEL"; rm.voxel_size = 0.012
    bpy.ops.object.select_all(action="DESELECT"); proxy.select_set(True); bpy.context.view_layer.objects.active = proxy
    bpy.ops.object.modifier_apply(modifier="remesh")
    rig.select_set(True); bpy.context.view_layer.objects.active = rig
    bpy.ops.object.parent_set(type="ARMATURE_AUTO")
    mesh.vertex_groups.clear()
    bpy.ops.object.select_all(action="DESELECT"); mesh.select_set(True); bpy.context.view_layer.objects.active = mesh
    dt = mesh.modifiers.new("xfer", "DATA_TRANSFER"); dt.object = proxy
    dt.use_vert_data = True; dt.data_types_verts = {"VGROUP_WEIGHTS"}; dt.vert_mapping = "POLYINTERP_NEAREST"
    dt.layers_vgroup_select_src = "ALL"; dt.layers_vgroup_select_dst = "NAME"
    bpy.ops.object.datalayout_transfer(modifier="xfer")
    bpy.ops.object.modifier_move_to_index(modifier="xfer", index=0)
    bpy.ops.object.modifier_apply(modifier="xfer")
    bpy.data.objects.remove(proxy, do_unlink=True)
groups = {g.index: g.name for g in mesh.vertex_groups}
bones = {b.name: (b.head_local, b.tail_local) for b in arm_d.bones}
def seg_dist(p, a, b):
    ab = b - a; t = max(0.0, min(1.0, (p - a).dot(ab) / ab.length_squared))
    return (p - (a + ab * t)).length
orphans = 0
for v in mesh.data.vertices:
    if sum(g.weight for g in v.groups) < 1e-4:
        orphans += 1
        name = min(bones, key=lambda n: seg_dist(v.co, *bones[n]))
        mesh.vertex_groups[name].add([v.index], 1.0, "REPLACE")
print("ORPHANS", orphans, "of", len(mesh.data.vertices))

# ---- animation helpers: rotate a pose bone about a WORLD axis (armature has identity transform)
P = rig.pose.bones
for pb in P: pb.rotation_mode = "QUATERNION"
def wrot(name, axis, deg):
    q_rest = arm_d.bones[name].matrix_local.to_quaternion()
    return q_rest.inverted() @ Quaternion(Vector(axis).normalized(), math.radians(deg)) @ q_rest

def arm_angle(side):  # current downward angle of the upper arm from horizontal, degrees
    b = arm_d.bones["upper_arm." + side]; d = (b.tail_local - b.head_local).normalized()
    return math.degrees(math.asin(-d.z))

def pose(frame, rots, loc=None):
    for pb in P: pb.rotation_quaternion = Quaternion(); pb.location = Vector()
    for name, q in rots.items(): P[name].rotation_quaternion = q
    if loc: P["hips"].location = loc
    for pb in P:
        pb.keyframe_insert("rotation_quaternion", frame=frame)
        pb.keyframe_insert("location", frame=frame)

# Arms rest along -X (R) / +X (L). About +Y: positive raises R, lowers L.
# Elbow bend in the bone's rest frame: about Z bends forward (R +, L -); about Y bends up/down like the upper arm.
def elev(side):  # current elevation of the upper arm above horizontal
    return -arm_angle(side)
def arm(side, target_elev, extra=0):
    d = target_elev - elev(side) + extra
    return wrot("upper_arm." + side, (0, 1, 0), d if side == "R" else -d)
def fore_fwd(side, deg): return wrot("forearm." + side, (0, 0, 1), deg if side == "R" else -deg)
def arms_down(extra_r=0, extra_l=0, target=72):
    return {"upper_arm.R": arm("R", -target, extra_r), "upper_arm.L": arm("L", -target, extra_l),
            "forearm.R": fore_fwd("R", 12), "forearm.L": fore_fwd("L", 12)}

ad = rig.animation_data_create()
def make_action(name, keys, length):
    act = bpy.data.actions.new(name); ad.action = act
    for f, rots, loc in keys: pose(f, rots, loc)
    for fc in act.fcurves if hasattr(act, "fcurves") else []: pass
    tr = ad.nla_tracks.new(); tr.name = name
    st = tr.strips.new(name, 1, act)
    if hasattr(st, "action_slot") and len(getattr(act, "slots", [])): st.action_slot = act.slots[0]
    ad.action = None
    return act

# idle: breathing, gentle head turn, arms relaxed at the sides (loops: last key == first key)
def idle_pose(t):
    b = math.sin(t * 2 * math.pi)
    r = arms_down(extra_r=2 * b, extra_l=2 * b)
    r["spine"] = wrot("spine", (1, 0, 0), 1.5 * b)
    r["chest"] = wrot("chest", (1, 0, 0), 1.5 * b)
    r["head"] = wrot("head", (0, 0, 1), 6 * math.sin(t * math.pi * 2)) @ wrot("head", (1, 0, 0), -2 * b)
    return r
make_action("idle", [(1 + i * 15, idle_pose(i / 6), Vector((0, 0, 0.004 * math.sin(i / 6 * 2 * math.pi)))) for i in range(7)], 90)

# wave: right arm up, forearm swings 3 times, back down
def wave_pose(up, swing):
    r = arms_down()
    if up:
        r["upper_arm.R"] = arm("R", 15 * up - 72 * (1 - up))
        r["forearm.R"] = wrot("forearm.R", (0, 1, 0), (85 + swing) * up)
        r["hand.R"] = wrot("hand.R", (0, 1, 0), swing * 0.4 * up)
        r["head"] = wrot("head", (0, 0, 1), -8 * up) @ wrot("head", (0, 1, 0), 5 * up)
    return r
wave_keys = [(1, wave_pose(0, 0), None), (10, wave_pose(1, 0), None)]
for i in range(6): wave_keys.append((16 + i * 7, wave_pose(1, 28 if i % 2 == 0 else -28), None))
wave_keys += [(62, wave_pose(1, 0), None), (75, wave_pose(0, 0), None)]
make_action("wave", wave_keys, 75)

# cheer: crouch, jump with both arms thrown up in a V, land
def cheer_pose(up, crouch):
    r = arms_down()
    if up:
        r["upper_arm.R"] = arm("R", 55 * up - 72 * (1 - up))
        r["upper_arm.L"] = arm("L", 55 * up - 72 * (1 - up))
        r["forearm.R"] = fore_fwd("R", 8)
        r["forearm.L"] = fore_fwd("L", 8)
        r["head"] = wrot("head", (1, 0, 0), -10 * up)
    if crouch:
        for s_ in "RL":
            r["thigh." + s_] = wrot("thigh." + s_, (1, 0, 0), -25 * crouch)
            r["shin." + s_] = wrot("shin." + s_, (1, 0, 0), 45 * crouch)
            r["foot." + s_] = wrot("foot." + s_, (1, 0, 0), -20 * crouch)
        r["spine"] = wrot("spine", (1, 0, 0), 8 * crouch)
    return r
make_action("cheer", [
    (1, cheer_pose(0, 0), Vector()), (8, cheer_pose(0, 1), Vector((0, 0, -0.08))),
    (16, cheer_pose(1, 0), Vector((0, 0, 0.22))), (22, cheer_pose(1, 0), Vector((0, 0, 0.25))),
    (30, cheer_pose(1, 0.6), Vector((0, 0, -0.04))), (38, cheer_pose(1, 0), Vector()),
    (50, cheer_pose(1, 0), Vector()), (62, cheer_pose(0, 0), Vector())], 62)

# ---- optional preview renders of key frames
if preview:
    os.makedirs(preview, exist_ok=True)
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_WORKBENCH"
    sc.display.shading.color_type = "TEXTURE"
    sc.render.resolution_x = 360; sc.render.resolution_y = 480
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    sc.collection.objects.link(cam); sc.camera = cam
    cam.location = (0.0, -4.2, 1.0); cam.rotation_euler = (math.radians(90), 0, 0)
    cam.data.lens = 50
    for t2 in ad.nla_tracks: t2.mute = True
    for tr in ad.nla_tracks:
        act = bpy.data.actions[tr.name]; ad.action = act
        if hasattr(ad, "action_slot") and len(getattr(act, "slots", [])): ad.action_slot = act.slots[0]
        for f in {"idle": [1], "wave": [24], "cheer": [8, 22]}[tr.name]:
            sc.frame_set(f)
            sc.render.filepath = os.path.join(preview, f"{tr.name}_{f}.png")
            bpy.ops.render.render(write_still=True)
    for t2 in ad.nla_tracks: t2.mute = False
    ad.action = None
    sc.frame_set(1)

for p in P: p.rotation_quaternion = Quaternion(); p.location = Vector()
for img in bpy.data.images:
    if img.size[0] > 1024: img.scale(1024, 1024)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_image_format="JPEG", export_jpeg_quality=85,
                          export_animation_mode="NLA_TRACKS", export_skins=True, export_def_bones=False)
print("DONE", out, "neck", round(neck_z / H, 3), "torso_w", round(torso_w, 3))
