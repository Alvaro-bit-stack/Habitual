"""Model the Me-stage props in Blender and export them as one GLB.
Usage: blender -b -P tools/build_props.py -- <out.glb> [preview.png]
Every prop is one object named prop_<id> (bike, running, soccer, basketball, tennis, guitar, painting,
photography, journaling, piano, sewing) with its origin on the ground at its centre (Blender: z up, so in
three.js y = 0 is the floor). Sizes are in metres next to a 1.8 m chibi character, a little oversized so they
read on a phone. Untextured materials keep the file small."""
import bpy, bmesh, sys, math
from mathutils import Vector, Matrix

args = sys.argv[sys.argv.index("--") + 1:]
OUT = args[0]
PREVIEW = args[1] if len(args) > 1 else None
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
PHI = (1 + 5 ** 0.5) / 2

# ---------------------------------------------------------------- helpers
MATS = {}
def mat(name, rgb, rough=0.55, metal=0.0):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    MATS[name] = m; return m

def hexc(h):  # "#rrggbb" -> linear rgb
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)

def active(o):
    bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o

def setmat(o, m):
    o.data.materials.clear(); o.data.materials.append(m); return o

def cyl(r, depth, loc, m, rot=(0, 0, 0), verts=16, r2=None):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc, rotation=rot)
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r2, depth=depth, location=loc, rotation=rot)
    return setmat(bpy.context.active_object, m)

def tube(a, b, r, m, verts=8, r2=None):
    a, b = Vector(a), Vector(b); d = b - a
    rot = Vector((0, 0, 1)).rotation_difference(d.normalized()).to_euler()
    return cyl(r, d.length, (a + b) / 2, m, rot, verts, r2)

def box(size, loc, m, rot=(0, 0, 0), bevel=0.0, seg=3):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.active_object; o.scale = size
    active(o); bpy.ops.object.transform_apply(scale=True)
    if bevel: bev(o, bevel, seg)
    return setmat(o, m)

def sphere(r, loc, m, scale=(1, 1, 1), seg=24, rings=14):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, radius=r, location=loc)
    o = bpy.context.active_object; o.scale = scale; active(o); bpy.ops.object.transform_apply(scale=True)
    return setmat(o, m)

def torus(R, r, loc, m, rot=(0, 0, 0), seg=32, mseg=8, arc=None):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=seg, minor_segments=mseg, location=loc, rotation=rot)
    o = setmat(bpy.context.active_object, m)
    if arc is not None:  # keep only the part of the ring between angles arc=(a0, a1), in the ring's own plane
        bm = bmesh.new(); bm.from_mesh(o.data)
        a0, a1 = arc
        kill = [v for v in bm.verts if not (a0 <= math.atan2(v.co.y, v.co.x) <= a1)]
        bmesh.ops.delete(bm, geom=kill, context="VERTS"); bm.to_mesh(o.data); bm.free()
    return o

def bev(o, w, seg=3):
    mod = o.modifiers.new("bev", "BEVEL"); mod.width = w; mod.segments = seg; mod.limit_method = "ANGLE"
    active(o); bpy.ops.object.modifier_apply(modifier=mod.name)

def subsurf(o, lv=2):
    mod = o.modifiers.new("sub", "SUBSURF"); mod.levels = lv; mod.render_levels = lv
    active(o); bpy.ops.object.modifier_apply(modifier=mod.name)

def extrude_outline(pts, depth, m, z0=0.0):
    """Polygon (list of (x, y)) extruded up by depth from z0."""
    me = bpy.data.meshes.new("outline"); bm = bmesh.new()
    vs = [bm.verts.new((x, y, z0)) for x, y in pts]
    f = bm.faces.new(vs)
    ext = bmesh.ops.extrude_face_region(bm, geom=[f])
    for v in ext["geom"]:
        if isinstance(v, bmesh.types.BMVert): v.co.z += depth
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new("outline", me); scene.collection.objects.link(o)
    return setmat(o, m)

def finish(name, parts, angle=40):
    bpy.ops.object.select_all(action="DESELECT")
    for p in parts: p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    # Bake every part's transform first: join keeps the active part's transform, and a rotated first part
    # (an upright wheel) would otherwise carry its rotation onto the whole prop.
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.join()
    o = bpy.context.active_object; o.name = name; o.data.name = name
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(angle))
    return o

# palette of colours (chibi-friendly, saturated enough for the night street)
C = {k: mat(k, hexc(v), r, mt) for k, v, r, mt in [
    ("frame", "#2BB3A6", 0.35, 0.25), ("tire", "#1F2226", 0.85, 0), ("steel", "#C9D1D8", 0.25, 0.9), ("dark", "#2A2E33", 0.5, 0.2),
    ("leather", "#7A4A2B", 0.6, 0), ("cream", "#F3EBD8", 0.7, 0), ("white", "#F6F6F2", 0.55, 0), ("black", "#16181B", 0.5, 0),
    ("wood", "#C9874A", 0.55, 0), ("spruce", "#E8C98F", 0.5, 0), ("wood_dark", "#6B3F22", 0.5, 0), ("gold", "#E2B65A", 0.3, 0.8), ("coral", "#E5484D", 0.55, 0),
    ("orange_ball", "#D4501A", 0.85, 0), ("yellow", "#F5CF4A", 0.5, 0), ("blue", "#3E8FD8", 0.45, 0), ("green", "#46A758", 0.55, 0),
    ("navy", "#1F2F57", 0.5, 0), ("lime", "#D7E84A", 0.85, 0), ("glass", "#20314A", 0.08, 0.3), ("red", "#C93A3A", 0.5, 0),
    ("purple", "#8E4EC6", 0.45, 0), ("pink", "#F28CB8", 0.5, 0), ("wicker", "#B98A4E", 0.75, 0)]}

made = []

# ---------------------------------------------------------------- bike (along x, wheels upright)
def bike():
    P = []; R = 0.33; WX = 0.46
    for x in (-WX, WX):
        P.append(torus(R, 0.034, (x, 0, R + 0.0), C["tire"], rot=(math.pi / 2, 0, 0), seg=40, mseg=10))
        P.append(torus(R - 0.034, 0.012, (x, 0, R), C["steel"], rot=(math.pi / 2, 0, 0), seg=40, mseg=6))
        P.append(cyl(0.028, 0.09, (x, 0, R), C["steel"], rot=(math.pi / 2, 0, 0), verts=12))
        for i in range(24):  # spokes, alternating sides of the hub
            a = 2 * math.pi * i / 24; side = 0.03 if i % 2 else -0.03
            P.append(tube((x, side, R), (x + math.cos(a) * (R - 0.04), 0, R + math.sin(a) * (R - 0.04)), 0.0025, C["steel"], verts=4))
        # fender arc over the top of each wheel
        P.append(torus(R + 0.05, 0.012, (x, 0, R), C["frame"], rot=(math.pi / 2, 0, 0), seg=40, mseg=6, arc=(0.35, 2.6)))
    rh, cr, st, ht, hb, fh = (Vector((-WX, 0, R)), Vector((-0.03, 0, 0.30)), Vector((-0.15, 0, 0.78)),
                              Vector((0.30, 0, 0.80)), Vector((0.35, 0, 0.62)), Vector((WX, 0, R)))
    for a, b, r in [(rh, cr, 0.016), (rh, st, 0.014), (cr, st, 0.024), (st, ht, 0.024), (cr, hb, 0.026), (hb, ht, 0.03)]:
        P.append(tube(a, b, r, C["frame"], verts=12))
    for s in (-0.035, 0.035):  # fork legs
        P.append(tube(hb + Vector((0, s, 0)), fh + Vector((0, s, 0)), 0.013, C["frame"], verts=10))
    # stem and swept-back handlebars with grips
    P.append(tube(ht, ht + Vector((0.02, 0, 0.12)), 0.016, C["steel"], verts=10))
    bar = ht + Vector((0.02, 0, 0.12))
    for s in (-1, 1):
        mid = bar + Vector((-0.04, 0.12 * s, 0.02)); end = bar + Vector((-0.14, 0.22 * s, 0.03))
        P.append(tube(bar, mid, 0.012, C["steel"], verts=10)); P.append(tube(mid, end, 0.012, C["steel"], verts=10))
        P.append(tube(end, end + Vector((-0.09, 0.03 * s, 0)), 0.018, C["leather"], verts=10))
    P.append(cyl(0.02, 0.025, bar + Vector((-0.05, 0.07, 0.025)), C["gold"], verts=14))           # bell
    # seat post + sprung saddle
    P.append(tube(st, st + Vector((-0.03, 0, 0.1)), 0.013, C["steel"], verts=10))
    sad = sphere(0.1, st + Vector((-0.05, 0, 0.13)), C["leather"], scale=(1.25, 0.75, 0.32))
    P.append(sad)
    for s in (-0.03, 0.03): P.append(torus(0.018, 0.004, st + Vector((-0.08, s, 0.1)), C["steel"], rot=(math.pi / 2, 0, 0), seg=12, mseg=4))
    # drivetrain: chainring, cranks, pedals, chain loop, rear cog
    P.append(cyl(0.085, 0.012, cr + Vector((0, 0.05, 0)), C["steel"], rot=(math.pi / 2, 0, 0), verts=32))
    P.append(cyl(0.035, 0.014, rh + Vector((0, 0.05, 0)), C["steel"], rot=(math.pi / 2, 0, 0), verts=20))
    for s, ang in ((0.07, 0.6), (-0.07, 0.6 + math.pi)):
        tip = cr + Vector((math.cos(ang) * 0.15, s, math.sin(ang) * 0.15))
        P.append(tube(cr + Vector((0, s, 0)), tip, 0.011, C["dark"], verts=8))
        P.append(box((0.09, 0.06, 0.018), tip + Vector((0, s * 0.6, 0)), C["dark"], bevel=0.004))
    top = (rh + Vector((0, 0.05, 0.035)), cr + Vector((0, 0.05, 0.085))); bot = (rh + Vector((0, 0.05, -0.035)), cr + Vector((0, 0.05, -0.085)))
    for a, b in (top, bot): P.append(tube(a, b, 0.006, C["dark"], verts=6))
    # front basket (woven box) + headlamp, kickstand
    bc = fh + Vector((0.06, 0, 0.42))
    P.append(box((0.24, 0.3, 0.16), bc, C["wicker"], bevel=0.015))
    P.append(box((0.21, 0.27, 0.02), bc + Vector((0, 0, 0.075)), C["wood_dark"]))
    for i in range(5): P.append(torus(0.001, 0.006, (0, 0, 0), C["wood_dark"]) if False else box((0.245, 0.305, 0.006), bc + Vector((0, 0, -0.06 + i * 0.03)), C["wood_dark"]))
    P.append(tube(hb + Vector((0.02, 0, 0.0)), bc + Vector((-0.11, 0, -0.08)), 0.008, C["steel"], verts=6))
    P.append(cyl(0.035, 0.05, hb + Vector((0.07, 0, 0.06)), C["steel"], rot=(0, math.pi / 2, 0), verts=16, r2=0.045))
    P.append(cyl(0.04, 0.004, hb + Vector((0.097, 0, 0.06)), C["yellow"], rot=(0, math.pi / 2, 0), verts=16))
    P.append(tube(cr + Vector((0.02, 0.06, 0)), Vector((0.05, 0.18, 0.005)), 0.01, C["steel"], verts=8))
    o = finish("prop_bike", P)
    o.rotation_euler = (math.radians(4), 0, 0)  # leaning on the kickstand
    active(o); bpy.ops.object.transform_apply(location=True, rotation=True)
    return o

# ---------------------------------------------------------------- acoustic guitar (lying on its back, along x)
def guitar():
    P = []
    lo, up, rl, ru = Vector((0, 0)), Vector((0.27, 0)), 0.2, 0.155
    pts = []
    N = 72
    for i in range(N):  # union outline of two bouts, walked by angle around the body centre
        a = 2 * math.pi * i / N; d = Vector((math.cos(a), math.sin(a)))
        best = 0
        for c, r in ((lo, rl), (up, ru)):
            # ray from the body centre (0.12, 0) to each circle
            o = Vector((0.12, 0)) - c; b = o.dot(d); cc = o.dot(o) - r * r; disc = b * b - cc
            if disc >= 0: best = max(best, -b + math.sqrt(disc))
        pts.append((0.12 + d.x * best, d.y * best))
    body = extrude_outline(pts, 0.09, C["wood_dark"]); bev(body, 0.012, 3); P.append(body)       # back and sides
    P.append(extrude_outline([(0.12 + (x - 0.12) * 0.965, y * 0.965) for x, y in pts], 0.004, C["spruce"], z0=0.088))  # light top
    P.append(cyl(0.058, 0.006, (0.17, 0, 0.094), C["black"], verts=32))                      # sound hole
    P.append(torus(0.07, 0.006, (0.17, 0, 0.094), C["gold"], seg=32, mseg=6))                 # rosette
    P.append(box((0.04, 0.16, 0.012), (-0.08, 0, 0.098), C["wood_dark"], bevel=0.004))        # bridge
    P.append(box((0.1, 0.07, 0.003), (0.24, -0.08, 0.095), C["wood_dark"]))                   # pickguard
    neck0, neck1 = 0.4, 0.86
    P.append(box((neck1 - neck0, 0.055, 0.03), ((neck0 + neck1) / 2, 0, 0.09), C["wood_dark"], bevel=0.008))
    P.append(box((neck1 - neck0, 0.05, 0.006), ((neck0 + neck1) / 2, 0, 0.108), C["black"]))  # fretboard
    for i in range(14): P.append(box((0.003, 0.05, 0.004), (neck0 + 0.02 + i * 0.031, 0, 0.112), C["steel"]))
    P.append(box((0.17, 0.085, 0.022), (neck1 + 0.08, 0, 0.088), C["wood_dark"], bevel=0.01))  # headstock
    for i in range(3):
        for s in (-1, 1):
            P.append(cyl(0.006, 0.05, (neck1 + 0.035 + i * 0.045, s * 0.065, 0.09), C["steel"], rot=(math.pi / 2, 0, 0), verts=8))
            P.append(cyl(0.012, 0.008, (neck1 + 0.035 + i * 0.045, s * 0.095, 0.09), C["cream"], rot=(math.pi / 2, 0, 0), verts=12))
    for i in range(6):  # strings from bridge to nut
        y = -0.022 + i * 0.0088
        P.append(tube((-0.07, y, 0.106), (neck1, y * 0.85, 0.114), 0.0011, C["steel"], verts=4))
    return finish("prop_guitar", P)

# ---------------------------------------------------------------- running shoes (pair, toes toward +x)
def shoe(m_upper, flip):
    P = []
    s = -1 if flip else 1
    sole = []
    for i in range(40):  # foot-shaped outline: wide toe, narrow waist
        a = 2 * math.pi * i / 40; x = 0.14 * math.cos(a)
        w = 0.05 + 0.012 * math.cos(a) - 0.008 * math.cos(2 * a)
        sole.append((x, s * (w * math.sin(a) + 0.004 * math.sin(2 * a))))
    o = extrude_outline(sole, 0.026, C["white"]); bev(o, 0.008, 2); P.append(o)
    o = extrude_outline([(x * 0.99, y * 0.99) for x, y in sole], 0.006, C["dark"], z0=-0.002); P.append(o)  # outsole tread
    def top(x):  # height of the upper along the foot: high at the heel, sloping to a low toe
        t = min(1.0, max(0.0, (x + 0.12) / 0.24)); t = t * t * (3 - 2 * t)
        return 0.115 - 0.06 * t
    up = extrude_outline([(x * 0.95, y * 0.97) for x, y in sole], 0.06, m_upper, z0=0.022)
    for v in up.data.vertices:
        if v.co.z > 0.05:
            v.co.z = top(v.co.x); v.co.y *= 0.8
    subsurf(up, 2); P.append(up)
    collar = sphere(0.035, (-0.075, 0, top(-0.075) - 0.006), C["black"], scale=(1.35, 0.8, 0.25), seg=20, rings=10); P.append(collar)
    P.append(box((0.08, 0.05, 0.012), (-0.02, 0, top(-0.02) + 0.004), C["white"], rot=(0, math.radians(18), 0), bevel=0.004))  # tongue
    for i in range(4):  # laces across the instep, following its slope
        x = 0.055 - i * 0.022; z = top(x) + 0.004  # the smoothed upper sits a little below top()
        P.append(box((0.008, 0.046, 0.005), (x, 0, z), C["white"], rot=(0, math.radians(-14), 0), bevel=0.002))
    for side in (1, -1):  # side stripe sweeping up toward the heel
        P.append(tube((0.06, side * 0.042, 0.045), (-0.07, side * 0.04, 0.085), 0.006, C["white"], verts=6))
    return P

def running():
    a = finish("tmp_l", shoe(C["coral"], False)); a.location = (0, -0.075, 0); a.rotation_euler = (0, 0, math.radians(-6))
    b = finish("tmp_r", shoe(C["coral"], True)); b.location = (0.03, 0.075, 0); b.rotation_euler = (0, 0, math.radians(12))
    for o in (a, b): active(o); bpy.ops.object.transform_apply(location=True, rotation=True)
    return finish("prop_running", [a, b])

# ---------------------------------------------------------------- soccer ball: truncated icosahedron, rounded
def soccer():
    r = 0.11
    pts = []
    def cyc(p):
        x, y, z = p; return [(x, y, z), (y, z, x), (z, x, y)]
    for base in [(0, 1, 3 * PHI), (1, 2 + PHI, 2 * PHI), (PHI, 2, 2 * PHI + 1)]:
        for sx in (-1, 1):
            for sy in (-1, 1):
                for sz in (-1, 1):
                    p = (base[0] * sx, base[1] * sy, base[2] * sz)
                    for q in cyc(p):
                        if q not in pts: pts.append(q)
    bm = bmesh.new()
    for p in pts: bm.verts.new(p)
    bmesh.ops.convex_hull(bm, input=bm.verts)
    bmesh.ops.dissolve_limit(bm, angle_limit=math.radians(1), verts=bm.verts, edges=bm.edges)
    me = bpy.data.meshes.new("ball"); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new("ball", me); scene.collection.objects.link(o)
    me.materials.append(C["white"]); me.materials.append(C["black"])
    for f in me.polygons: f.material_index = 1 if len(f.vertices) == 5 else 0
    s = r / max(Vector(p).length for p in pts)
    o.scale = (s, s, s); active(o); bpy.ops.object.transform_apply(scale=True)
    mod = o.modifiers.new("sub", "SUBSURF"); mod.levels = 2
    cast = o.modifiers.new("cast", "CAST"); cast.factor = 1.0; cast.use_radius_as_size = False
    for m_ in ("sub", "cast"): active(o); bpy.ops.object.modifier_apply(modifier=m_)
    o.location = (0, 0, r); active(o); bpy.ops.object.transform_apply(location=True)
    return finish("prop_soccer", [o], angle=60)

# ---------------------------------------------------------------- basketball with its seam pattern
def basketball():
    r = 0.12; P = [sphere(r, (0, 0, r), C["orange_ball"], seg=32, rings=20)]
    P.append(torus(r - 0.0004, 0.0024, (0, 0, r), C["black"], seg=48, mseg=6))
    P.append(torus(r - 0.0004, 0.0024, (0, 0, r), C["black"], rot=(math.pi / 2, 0, 0), seg=48, mseg=6))
    for s in (-1, 1):  # the two side curves are small circles on the sphere
        P.append(torus(r * 0.8 - 0.0003, 0.0024, (s * r * 0.6, 0, r), C["black"], rot=(0, math.pi / 2, 0), seg=40, mseg=6))
    return finish("prop_basketball", P, angle=60)

# ---------------------------------------------------------------- tennis racket + ball, lying flat
def tennis():
    P = []; hx, hy, hz = 0.0, 0.0, 0.018
    head = torus(0.12, 0.012, (hx, hy, hz), C["blue"], seg=48, mseg=8); head.scale = (1.0, 1.32, 1); active(head); bpy.ops.object.transform_apply(scale=True); P.append(head)
    for i in range(-7, 8):  # string grid clipped to the oval
        x = i * 0.014
        if abs(x) < 0.118:
            h = 0.158 * math.sqrt(1 - (x / 0.12) ** 2); P.append(tube((x, -h, hz), (x, h, hz), 0.0011, C["white"], verts=4))
    for j in range(-10, 11):
        y = j * 0.0145
        if abs(y) < 0.156:
            w = 0.118 * math.sqrt(1 - (y / 0.158) ** 2); P.append(tube((-w, y, hz), (w, y, hz), 0.0011, C["white"], verts=4))
    for s in (-1, 1): P.append(tube((s * 0.06, -0.15, hz), (0, -0.25, hz), 0.011, C["blue"], verts=8))  # throat
    P.append(cyl(0.017, 0.2, (0, -0.35, hz), C["dark"], rot=(math.pi / 2, 0, 0), verts=8))           # grip
    for i in range(6): P.append(torus(0.0175, 0.002, (0, -0.27 - i * 0.03, hz), C["white"], rot=(math.pi / 2, 0, 0), seg=12, mseg=4))
    P.append(cyl(0.02, 0.012, (0, -0.455, hz), C["blue"], rot=(math.pi / 2, 0, 0), verts=12))
    ball = sphere(0.034, (0.17, -0.07, 0.034), C["lime"]); P.append(ball)
    pts = [Vector((0.17, -0.07, 0.034)) + 0.0345 * Vector((math.cos(t), math.sin(t) * math.cos(2 * t) * 0.9, math.sin(2 * t) * 0.4)).normalized()
           for t in [i * 2 * math.pi / 24 for i in range(25)]]
    for a, b in zip(pts, pts[1:]): P.append(tube(a, b, 0.0018, C["white"], verts=4))
    return finish("prop_tennis", P)

# ---------------------------------------------------------------- painter's palette + brush
def painting():
    P = []; pts = []
    for i in range(48):
        a = 2 * math.pi * i / 48
        rr = 0.17 + 0.02 * math.cos(3 * a) - (0.06 if abs(math.atan2(math.sin(a - 2.6), math.cos(a - 2.6))) < 0.35 else 0)  # notch
        pts.append((1.25 * rr * math.cos(a), rr * math.sin(a)))
    pal = extrude_outline(pts, 0.014, C["wood"]); bev(pal, 0.004, 2); P.append(pal)
    P.append(cyl(0.028, 0.004, (-0.12, 0.06, 0.016), C["wood_dark"], verts=20))  # thumb hole (dark inset)
    for (x, y), m in zip([(-0.06, -0.09), (0.03, -0.11), (0.11, -0.06), (0.14, 0.04), (0.08, 0.11), (-0.01, 0.12)],
                         ["coral", "yellow", "green", "blue", "purple", "white"]):
        P.append(sphere(0.026, (x, y, 0.02), C[m], scale=(1.1, 1, 0.45), seg=16, rings=8))
    a, b = Vector((-0.2, -0.17, 0.03)), Vector((0.1, 0.02, 0.03))
    d = (b - a).normalized()
    P.append(tube(a, b, 0.009, C["red"], verts=10, r2=0.006))
    P.append(tube(b, b + d * 0.035, 0.0065, C["steel"], verts=10))
    P.append(tube(b + d * 0.035, b + d * 0.075, 0.0068, C["blue"], verts=10, r2=0.001))
    return finish("prop_painting", P)

# ---------------------------------------------------------------- camera
def photography():
    P = [box((0.2, 0.075, 0.12), (0, 0, 0.06), C["black"], bevel=0.015)]
    P.append(box((0.045, 0.085, 0.1), (0.085, 0, 0.055), C["dark"], bevel=0.018))          # grip
    P.append(box((0.07, 0.06, 0.04), (-0.005, 0, 0.13), C["black"], bevel=0.01))           # viewfinder hump
    P.append(cyl(0.018, 0.012, (0.07, 0.01, 0.126), C["steel"], verts=24))                  # mode dial
    P.append(cyl(0.008, 0.008, (0.085, -0.02, 0.124), C["coral"], verts=12))                # shutter
    for z, rr, m in [(0.045, 0.05, "dark"), (0.075, 0.046, "black"), (0.1, 0.047, "steel")]:
        P.append(cyl(rr, 0.03, (0, -0.0375 - z, 0.06), C[m], rot=(math.pi / 2, 0, 0), verts=32))
    P.append(cyl(0.039, 0.004, (0, -0.1545, 0.06), C["glass"], rot=(math.pi / 2, 0, 0), verts=32))       # front glass
    P.append(torus(0.04, 0.004, (0, -0.1545, 0.06), C["black"], rot=(math.pi / 2, 0, 0), seg=32, mseg=6))
    for s in (-1, 1): P.append(torus(0.008, 0.003, (s * 0.1, 0, 0.1), C["steel"], rot=(0, math.pi / 2, 0), seg=12, mseg=4))
    return finish("prop_photography", P)

# ---------------------------------------------------------------- notebook + pen
def journaling():
    P = [box((0.2, 0.27, 0.035), (0, 0, 0.0175), C["green"], bevel=0.006)]
    P.append(box((0.19, 0.26, 0.026), (0.006, 0, 0.0175), C["cream"]))
    P.append(box((0.01, 0.272, 0.037), (0.075, 0, 0.0185), C["black"]))                    # elastic band
    P.append(box((0.012, 0.06, 0.002), (-0.03, 0.15, 0.002), C["coral"]))                   # ribbon
    P.append(tube((0.14, -0.12, 0.01), (0.16, 0.12, 0.01), 0.008, C["navy"], verts=12))
    P.append(tube((0.16, 0.12, 0.01), (0.162, 0.14, 0.01), 0.008, C["gold"], verts=12, r2=0.001))
    P.append(box((0.003, 0.06, 0.004), (0.148, -0.09, 0.02), C["gold"]))                    # clip
    return finish("prop_journaling", P)

# ---------------------------------------------------------------- two-octave keyboard
def piano():
    P = [box((0.6, 0.2, 0.05), (0, 0, 0.025), C["dark"], bevel=0.01)]
    n, kw = 15, 0.034
    x0 = -kw * n / 2 + kw / 2
    for i in range(n): P.append(box((kw - 0.003, 0.11, 0.016), (x0 + i * kw, -0.035, 0.058), C["white"], bevel=0.002))
    for i in range(n - 1):
        if i % 7 in (0, 1, 3, 4, 5):  # black keys after C, D, F, G, A
            P.append(box((0.018, 0.065, 0.016), (x0 + i * kw + kw / 2, -0.0125, 0.072), C["black"], bevel=0.002))
    for i in range(3): P.append(cyl(0.012, 0.012, (-0.24 + i * 0.04, 0.06, 0.056), C["steel"], verts=16))
    for s in (-1, 1):
        for j in range(4): P.append(box((0.045, 0.004, 0.003), (s * 0.22, 0.05 + j * 0.01 - 0.015, 0.051), C["black"]))
    return finish("prop_piano", P)

# ---------------------------------------------------------------- thread spool + tomato pincushion
def sewing():
    P = [cyl(0.055, 0.016, (0, 0, 0.008), C["wood"], verts=24), cyl(0.055, 0.016, (0, 0, 0.132), C["wood"], verts=24)]
    for i in range(10): P.append(torus(0.044, 0.0065, (0, 0, 0.022 + i * 0.0106), C["purple"], seg=24, mseg=6))
    P.append(cyl(0.012, 0.142, (0, 0, 0.07), C["wood_dark"], verts=12))
    tom = sphere(0.075, (0.13, 0.04, 0.05), C["red"], scale=(1, 1, 0.68)); P.append(tom)
    for i in range(6):
        a = i * math.pi / 3
        P.append(tube((0.13, 0.04, 0.1), (0.13 + 0.03 * math.cos(a), 0.04 + 0.03 * math.sin(a), 0.098), 0.006, C["green"], verts=6))
    for (dx, dy), m in zip([(0.03, -0.02), (-0.025, 0.03), (0.0, -0.045), (0.045, 0.03)], ["yellow", "blue", "pink", "white"]):
        base = Vector((0.13 + dx, 0.04 + dy, 0.075)); tip = base + Vector((dx, dy, 0.045)).normalized() * 0.045
        P.append(tube(base, tip, 0.0015, C["steel"], verts=4)); P.append(sphere(0.007, tip, C[m], seg=10, rings=6))
    return finish("prop_sewing", P)

for f in (bike, guitar, running, soccer, basketball, tennis, painting, photography, journaling, piano, sewing):
    made.append(f())
for o in made:
    print("PROP", o.name, len(o.data.polygons), "faces", tuple(round(d, 2) for d in o.dimensions))

# ---------------------------------------------------------------- preview: lay them out in a row and render
if PREVIEW:  # one close-up tile per prop, from a raised three-quarter angle
    scene.render.engine = "BLENDER_WORKBENCH"; scene.display.shading.light = "STUDIO"; scene.display.shading.color_type = "MATERIAL"
    for m in MATS.values(): m.diffuse_color = tuple(m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value)
    scene.render.resolution_x = 420; scene.render.resolution_y = 360
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); scene.collection.objects.link(cam); scene.camera = cam
    cam.data.type = "ORTHO"
    for o in made:
        for p in made: p.hide_render = p is not o
        cs = [o.matrix_world @ Vector(c) for c in o.bound_box]
        ctr = sum(cs, Vector()) / 8; size = max((max(c[i] for c in cs) - min(c[i] for c in cs)) for i in range(3))
        cam.data.ortho_scale = size * 1.35
        d = Vector((0.55, -1.0, 0.75)).normalized()
        cam.location = ctr + d * 5; cam.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = PREVIEW.replace(".png", "_" + o.name + ".png"); bpy.ops.render.render(write_still=True)
    for p in made: p.hide_render = False

bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_apply=True, export_materials="EXPORT")
print("DONE", OUT)
