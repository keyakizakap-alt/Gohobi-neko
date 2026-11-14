"""試作：茶トラねこをプリミティブ＋パーティクル毛で組み、Cycles(CPU)でレンダリングする

使い方: pip install bpy のあと
  python blender/cat_proto.py --out cat.png --samples 32 --res 480
"""
import bpy, math, sys, time
from mathutils import Vector

out = sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else "/tmp/cat.png"
samples = int(sys.argv[sys.argv.index("--samples") + 1]) if "--samples" in sys.argv else 64

bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene

def mat_fur():
    m = bpy.data.materials.new("Fur")
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes): nt.nodes.remove(n)
    outn = nt.nodes.new("ShaderNodeOutputMaterial")
    hair = nt.nodes.new("ShaderNodeBsdfHairPrincipled")
    hair.parametrization = "MELANIN"
    info = nt.nodes.new("ShaderNodeHairInfo")
    # トラ模様：オブジェクト座標の縞を毛のメラニン量に
    tex = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    wave = nt.nodes.new("ShaderNodeTexWave")
    wave.inputs["Scale"].default_value = 2.2
    wave.inputs["Distortion"].default_value = 6
    wave.inputs["Detail"].default_value = 3
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.35
    ramp.color_ramp.elements[0].color = (0.55, 0.55, 0.55, 1)
    ramp.color_ramp.elements[1].position = 0.75
    ramp.color_ramp.elements[1].color = (0.80, 0.80, 0.80, 1)
    # お腹（-Y側・下側）は白っぽく
    belly = nt.nodes.new("ShaderNodeMapRange")
    belly.inputs["From Min"].default_value = -0.40
    belly.inputs["From Max"].default_value = -0.30
    belly.inputs["To Min"].default_value = 0.12
    belly.inputs["To Max"].default_value = 1.0
    mul = nt.nodes.new("ShaderNodeMath"); mul.operation = "MULTIPLY"
    nt.links.new(tex.outputs["Object"], wave.inputs["Vector"])
    nt.links.new(wave.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(tex.outputs["Object"], sep.inputs[0])
    nt.links.new(sep.outputs["Y"], belly.inputs["Value"])
    nt.links.new(ramp.outputs["Color"], mul.inputs[0])
    nt.links.new(belly.outputs["Result"], mul.inputs[1])
    nt.links.new(mul.outputs["Value"], hair.inputs["Melanin"])
    hair.inputs["Melanin Redness"].default_value = 0.95
    hair.inputs["Roughness"].default_value = 0.35
    hair.inputs["Radial Roughness"].default_value = 0.4
    nt.links.new(hair.outputs[0], outn.inputs[0])
    return m

def mat_skin(color):
    m = bpy.data.materials.new("Skin")
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = 0.6
    return m

def mat_eye():
    m = bpy.data.materials.new("Eye")
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    tex = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    e = ramp.color_ramp.elements
    e[0].position = 0.80; e[0].color = (0.55, 0.42, 0.06, 1)  # 琥珀色の虹彩
    e[1].position = 0.93; e[1].color = (0.01, 0.01, 0.01, 1)  # 瞳孔
    nt.links.new(tex.outputs["Object"], sep.inputs[0])
    nt.links.new(sep.outputs["Y"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.02
    b.inputs["Coat Weight"].default_value = 1.0
    return m

def uv_sphere(name, loc, scale, rot=(0, 0, 0), seg=48):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=seg // 2, location=loc, rotation=rot)
    o = bpy.context.object; o.name = name; o.scale = scale
    bpy.ops.object.shade_smooth()
    return o

FUR, NOSE = mat_fur(), mat_skin((0.75, 0.35, 0.33))
EYE = mat_eye()

# 体：おすわりの姿勢（Zが上、-Yがカメラ側）
body = uv_sphere("Body", (0, 0.05, 0.42), (0.36, 0.42, 0.46))
chest = uv_sphere("Chest", (0, -0.12, 0.62), (0.28, 0.26, 0.30))
haunchL = uv_sphere("HaunchL", (0.22, 0.12, 0.25), (0.20, 0.30, 0.22))
haunchR = uv_sphere("HaunchR", (-0.22, 0.12, 0.25), (0.20, 0.30, 0.22))
pawL = uv_sphere("PawL", (0.11, -0.30, 0.06), (0.085, 0.13, 0.06))
pawR = uv_sphere("PawR", (-0.11, -0.30, 0.06), (0.085, 0.13, 0.06))
legL = uv_sphere("LegL", (0.11, -0.24, 0.28), (0.075, 0.08, 0.26))
legR = uv_sphere("LegR", (-0.11, -0.24, 0.28), (0.075, 0.08, 0.26))
head = uv_sphere("Head", (0, -0.18, 1.0), (0.30, 0.27, 0.26))
muzzle = uv_sphere("Muzzle", (0, -0.40, 0.92), (0.13, 0.09, 0.08))
cheekL = uv_sphere("CheekL", (0.14, -0.30, 0.92), (0.13, 0.12, 0.11))
cheekR = uv_sphere("CheekR", (-0.14, -0.30, 0.92), (0.13, 0.12, 0.11))
parts = [body, chest, haunchL, haunchR, pawL, pawR, legL, legR, head, muzzle, cheekL, cheekR]
for side in (1, -1):
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=0.12, depth=0.24,
        location=(0.17 * side, -0.14, 1.27), rotation=(math.radians(-8), math.radians(18 * side), 0))
    ear = bpy.context.object; ear.scale = (1, 0.45, 1); bpy.ops.object.shade_smooth(); parts.append(ear)
# しっぽ：カーブをメッシュ化
bpy.ops.curve.primitive_bezier_curve_add(location=(0, 0, 0))
tail = bpy.context.object
sp = tail.data.splines[0]
sp.bezier_points[0].co = (0.18, 0.40, 0.08); sp.bezier_points[0].handle_left = (0.0, 0.5, 0.05); sp.bezier_points[0].handle_right = (0.36, 0.30, 0.04)
sp.bezier_points[1].co = (0.42, -0.18, 0.06); sp.bezier_points[1].handle_left = (0.50, 0.10, 0.04); sp.bezier_points[1].handle_right = (0.36, -0.40, 0.08)
tail.data.bevel_depth = 0.05; tail.data.bevel_resolution = 6
bpy.ops.object.convert(target="MESH"); parts.append(tail)

# 体のパーツを1つのメッシュにまとめ、リメッシュで継ぎ目をなくす
bpy.ops.object.select_all(action="DESELECT")
for p in parts: p.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.join()
cat = bpy.context.object; cat.name = "Cat"
rm = cat.modifiers.new("Remesh", "REMESH"); rm.mode = "VOXEL"; rm.voxel_size = 0.012
bpy.ops.object.modifier_apply(modifier="Remesh")
sm = cat.modifiers.new("Smooth", "CORRECTIVE_SMOOTH"); sm.iterations = 12; sm.factor = 0.8
bpy.ops.object.modifier_apply(modifier="Smooth")
bpy.ops.object.shade_smooth()
cat.data.materials.append(FUR)
vg = cat.vertex_groups.new(name="length")
for v in cat.data.vertices:
    co = v.co
    w = 1.0
    if co.z > 0.78: w = 0.32                      # 頭
    if co.z > 1.15: w = 0.16                      # 耳
    if co.z < 0.14 and co.y < -0.15: w = 0.35     # 前足の先
    if co.z > 0.78 and co.y < -0.36: w = 0.18     # 鼻先
    vg.add([v.index], w, "REPLACE")
dens = cat.vertex_groups.new(name="density")
for v in cat.data.vertices:
    dens.add([v.index], 0.35 if v.co.z > 0.85 and v.co.y < -0.30 else 1.0, "REPLACE")

# 毛（パーティクル・ヘア）
ps = cat.modifiers.new("Fur", "PARTICLE_SYSTEM").particle_system
st = ps.settings
st.type = "HAIR"; st.count = 16000; st.hair_length = 0.05
st.child_type = "INTERPOLATED"; st.child_percent = 22; st.rendered_child_count = 22
st.clump_factor = 0.15; st.roughness_1 = 0.012; st.roughness_endpoint = 0.01; st.kink = "NO"
st.root_radius = 0.6; st.tip_radius = 0.0; st.radius_scale = 0.012
st.use_hair_bspline = True; st.display_step = 3; st.render_step = 4
st.factor_random = 0.003
st.material_slot = "Fur"
ps.vertex_group_length = "length"
ps.vertex_group_density = "density"

# 目と鼻（毛の上に出す）
for side in (1, -1):
    e = uv_sphere(f"Eye{side}", (0.108 * side, -0.425, 1.035), (0.062, 0.035, 0.064), seg=32)
    e.rotation_euler = (math.radians(-90), 0, math.radians(14 * side)); e.data.materials.append(EYE)
nose = uv_sphere("Nose", (0, -0.505, 0.95), (0.034, 0.02, 0.022), seg=24); nose.data.materials.append(NOSE)

# 床・照明・カメラ
bpy.ops.mesh.primitive_plane_add(size=8, location=(0, 0, 0))
floor = bpy.context.object
fm = mat_skin((0.86, 0.72, 0.58)); floor.data.materials.append(fm)
world = bpy.data.worlds.new("W"); scn.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (1.0, 0.92, 0.82, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.6
bpy.ops.object.light_add(type="AREA", location=(-1.6, -2.2, 2.6)); key = bpy.context.object
key.data.energy = 520; key.data.size = 2.0; key.rotation_euler = (math.radians(55), 0, math.radians(-35))
bpy.ops.object.light_add(type="AREA", location=(1.8, 1.4, 2.0)); rim = bpy.context.object
rim.data.energy = 300; rim.data.size = 1.0; rim.rotation_euler = (math.radians(-50), 0, math.radians(140))
bpy.ops.object.camera_add(location=(0.55, -3.3, 1.05)); cam = bpy.context.object
cam.data.lens = 70
d = Vector((0, -0.05, 0.62)) - cam.location; cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
scn.camera = cam

scn.render.engine = "CYCLES"; scn.cycles.device = "CPU"; scn.cycles.samples = samples
scn.cycles.use_denoising = True
res = int(sys.argv[sys.argv.index("--res") + 1]) if "--res" in sys.argv else 640
scn.render.resolution_x = res; scn.render.resolution_y = res
scn.render.film_transparent = False
scn.render.filepath = out
t = time.time()
bpy.ops.render.render(write_still=True)
print(f"RENDER_SECONDS {time.time() - t:.1f}")
