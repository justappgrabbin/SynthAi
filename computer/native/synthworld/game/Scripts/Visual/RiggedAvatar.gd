extends Node3D
## Visual-only skeletal layer. Gameplay, identity and authorization stay on the parent CharacterBody3D.
## Optional skinned GLB from user-supplied donor. Fallback has a real Skeleton3D with bone attachments.
@export_file("*.glb") var rig_resource: String = "res://Assets/Characters/Thanh.glb"
@export var initial_skin: String = "violet"
var skeleton: Skeleton3D
var avatar: Node3D
var _time: float = 0.0
var _skin: String = "violet"
var _overlay: StandardMaterial3D
const PALETTES := {
    "violet": Color(0.67, 0.35, 0.99, 0.19),
    "aether": Color(0.16, 0.93, 0.84, 0.19),
    "rose": Color(0.98, 0.30, 0.69, 0.19),
    "solar": Color(1.0, 0.70, 0.31, 0.19)
}
func _ready() -> void:
    _skin = initial_skin
    if ResourceLoader.exists(rig_resource):
        var source: Resource = load(rig_resource)
        if source is PackedScene:
            avatar = (source as PackedScene).instantiate() as Node3D
            if avatar != null:
                add_child(avatar)
                skeleton = _find_skeleton(avatar)
    if skeleton == null:
        if avatar != null:
            avatar.queue_free()
        _build_skeletal_fallback()
    var old_visual: Node3D = get_parent().get_node_or_null("Look") as Node3D
    if old_visual != null:
        old_visual.visible = false
    var construction: MeshInstance3D = get_parent().get_node_or_null("ConstructionSkin") as MeshInstance3D
    if construction != null:
        construction.visible = false
    apply_skin(_skin)
    print("SYNTHWORLD_RIG_READY=", skeleton != null, " asset=", avatar != null)
func _find_skeleton(node: Node) -> Skeleton3D:
    if node is Skeleton3D:
        return node as Skeleton3D
    for child in node.get_children():
        var found: Skeleton3D = _find_skeleton(child)
        if found != null:
            return found
    return null
func _add_bone(name: String, parent_index: int, translation: Vector3) -> int:
    var index: int = skeleton.get_bone_count()
    skeleton.add_bone(name)
    if parent_index >= 0:
        skeleton.set_bone_parent(index, parent_index)
    skeleton.set_bone_rest(index, Transform3D(Basis.IDENTITY, translation))
    return index
func _attach_shape(name: String, bone: String, shape: Mesh, position: Vector3, color: Color) -> void:
    var attachment := BoneAttachment3D.new()
    attachment.name = name + "Attachment"
    attachment.bone_name = bone
    skeleton.add_child(attachment)
    var mesh := MeshInstance3D.new()
    mesh.name = name
    mesh.mesh = shape
    mesh.position = position
    var mat := StandardMaterial3D.new()
    mat.albedo_color = color
    mat.metallic = 0.18
    mat.roughness = 0.46
    mesh.material_override = mat
    attachment.add_child(mesh)
func _build_skeletal_fallback() -> void:
    avatar = Node3D.new()
    avatar.name = "ProceduralSkeletalAvatar"
    add_child(avatar)
    skeleton = Skeleton3D.new()
    skeleton.name = "Skeleton3D"
    avatar.add_child(skeleton)
    var hips := _add_bone("Hips", -1, Vector3(0, 0.94, 0))
    var spine := _add_bone("Spine", hips, Vector3(0, 0.31, 0))
    _add_bone("Head", spine, Vector3(0, 0.45, 0))
    _add_bone("LeftArm", spine, Vector3(-0.34, 0.24, 0))
    _add_bone("RightArm", spine, Vector3(0.34, 0.24, 0))
    _add_bone("LeftUpLeg", hips, Vector3(-0.17, -0.14, 0))
    _add_bone("RightUpLeg", hips, Vector3(0.17, -0.14, 0))
    var torso := CapsuleMesh.new()
    torso.radius = 0.28
    torso.height = 0.64
    _attach_shape("Torso", "Spine", torso, Vector3(0, 0.13, 0), Color(0.38, 0.14, 0.57))
    var head := SphereMesh.new()
    head.radius = 0.24
    head.height = 0.48
    _attach_shape("HeadMesh", "Head", head, Vector3(0, 0.04, 0), Color(0.62, 0.35, 0.27))
    var arm := CapsuleMesh.new()
    arm.radius = 0.09
    arm.height = 0.53
    _attach_shape("LeftSleeve", "LeftArm", arm, Vector3(0, -0.24, 0), Color(0.48, 0.24, 0.69))
    _attach_shape("RightSleeve", "RightArm", arm, Vector3(0, -0.24, 0), Color(0.48, 0.24, 0.69))
    var leg := CapsuleMesh.new()
    leg.radius = 0.12
    leg.height = 0.79
    _attach_shape("LeftLegMesh", "LeftUpLeg", leg, Vector3(0, -0.39, 0), Color(0.20, 0.15, 0.35))
    _attach_shape("RightLegMesh", "RightUpLeg", leg, Vector3(0, -0.39, 0), Color(0.20, 0.15, 0.35))
func apply_skin(name: String) -> void:
    if not PALETTES.has(name):
        return
    _skin = name
    # The material overlay preserves original skinning, UVs, clothing textures and materials.
    _overlay = StandardMaterial3D.new()
    _overlay.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
    _overlay.albedo_color = PALETTES[name]
    _overlay.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
    _apply_overlay_recursive(avatar)
func _apply_overlay_recursive(node: Node) -> void:
    if node is MeshInstance3D:
        (node as MeshInstance3D).material_overlay = _overlay
    for child in node.get_children():
        _apply_overlay_recursive(child)
func set_semantic_state(state: Dictionary) -> void:
    # Display only: not an authority to mutate identity, traits or world physics.
    var next_skin := String(state.get("skin", _skin))
    if PALETTES.has(next_skin):
        apply_skin(next_skin)
func _process(delta: float) -> void:
    if skeleton == null:
        return
    _time += delta
    var actor := get_parent() as CharacterBody3D
    if actor == null:
        return
    var speed: float = Vector2(actor.velocity.x, actor.velocity.z).length()
    var stride: float = clampf(speed / 3.5, 0.0, 1.0)
    var phase: float = _time * (4.0 + speed * 1.6)
    _pose("LeftUpLeg", sin(phase) * stride * 0.46)
    _pose("RightUpLeg", -sin(phase) * stride * 0.46)
    _pose("LeftArm", -sin(phase) * stride * 0.34)
    _pose("RightArm", sin(phase) * stride * 0.34)
    _pose("Spine", sin(_time * 1.6) * 0.018)
    if speed > 0.12:
        var heading: float = atan2(-actor.velocity.x, -actor.velocity.z)
        avatar.rotation.y = lerp_angle(avatar.rotation.y, heading, clampf(delta * 8.0, 0.0, 1.0))
func _pose(bone_name: String, angle: float) -> void:
    var index := skeleton.find_bone(bone_name)
    if index >= 0:
        skeleton.set_bone_pose_rotation(index, Quaternion(Vector3.RIGHT, angle))
