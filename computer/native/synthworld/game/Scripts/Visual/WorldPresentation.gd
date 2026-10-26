extends Node3D
## Native presentation layer for the existing Godot World; does not replace the swarm/agent logic.
var follow_enabled: bool = true
var style_index: int = 0
var styles: Array[String] = ["violet", "aether", "rose", "solar"]
var camera: Camera3D
var cynthia: CharacterBody3D
var ground: MeshInstance3D
var world: Node3D
var hud_label: Label
var follow_button: Button
var _hud_clock: float = 0.0
var _beacons: Array[MeshInstance3D] = []
func _ready() -> void:
    world = get_parent() as Node3D
    camera = world.get_node("Camera3D") as Camera3D
    cynthia = world.get_node("Cynthia") as CharacterBody3D
    ground = world.get_node("Ground") as MeshInstance3D
    _make_environment()
    _make_beacons()
    _make_hud()
    _set_style("violet")
    print("SYNTHWORLD_PRESENTATION_READY=true")
func _make_environment() -> void:
    var env := Environment.new()
    env.background_mode = Environment.BG_COLOR
    env.background_color = Color("#101020")
    env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
    env.ambient_light_color = Color("#806aa4")
    env.ambient_light_energy = 0.6
    var world_env := WorldEnvironment.new()
    world_env.name = "LivingAtmosphere"
    world_env.environment = env
    add_child(world_env)
    var fill := OmniLight3D.new()
    fill.name = "AetherFill"
    fill.position = Vector3(-4, 5, 2)
    fill.light_color = Color("#bd80f8")
    fill.light_energy = 0.9
    fill.omni_range = 20.0
    add_child(fill)
func _make_beacons() -> void:
    for i in range(5):
        var crystal := MeshInstance3D.new()
        crystal.name = "DimensionBeacon_%d" % i
        var shape := SphereMesh.new()
        shape.radius = 0.2
        shape.height = 0.62
        crystal.mesh = shape
        crystal.position = Vector3(cos(float(i) * TAU / 5.0) * 6.5, 0.45, sin(float(i) * TAU / 5.0) * 6.5)
        var mat := StandardMaterial3D.new()
        mat.albedo_color = Color("#b482f5")
        mat.emission_enabled = true
        mat.emission = Color("#8b50d6")
        mat.emission_energy_multiplier = 1.25
        crystal.material_override = mat
        add_child(crystal)
        _beacons.append(crystal)
func _make_button(title: String, target: HBoxContainer, callback: Callable) -> Button:
    var btn := Button.new()
    btn.text = title
    btn.custom_minimum_size = Vector2(82, 46)
    btn.add_theme_font_size_override("font_size", 15)
    btn.pressed.connect(callback)
    target.add_child(btn)
    return btn
func _make_hud() -> void:
    var layer := CanvasLayer.new()
    layer.name = "ResponsiveWorldHUD"
    add_child(layer)
    var frame := Control.new()
    frame.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
    frame.mouse_filter = Control.MOUSE_FILTER_IGNORE
    layer.add_child(frame)
    var card := PanelContainer.new()
    card.anchor_left = 0.0
    card.anchor_top = 0.0
    card.offset_left = 12.0
    card.offset_top = 14.0
    card.offset_right = 284.0
    card.offset_bottom = 94.0
    card.mouse_filter = Control.MOUSE_FILTER_IGNORE
    frame.add_child(card)
    var text_column := VBoxContainer.new()
    text_column.mouse_filter = Control.MOUSE_FILTER_IGNORE
    card.add_child(text_column)
    var heading := Label.new()
    heading.text = "SYNTHWORLD · LIVING WORLD"
    heading.add_theme_color_override("font_color", Color("#dfbaff"))
    text_column.add_child(heading)
    hud_label = Label.new()
    hud_label.text = "Loading observed state…"
    hud_label.add_theme_font_size_override("font_size", 12)
    text_column.add_child(hud_label)
    var controls := HBoxContainer.new()
    controls.anchor_left = 1.0
    controls.anchor_right = 1.0
    controls.anchor_top = 1.0
    controls.anchor_bottom = 1.0
    controls.offset_left = -186.0
    controls.offset_right = -12.0
    controls.offset_top = -62.0
    controls.offset_bottom = -12.0
    controls.alignment = BoxContainer.ALIGNMENT_END
    frame.add_child(controls)
    follow_button = _make_button("Follow", controls, _toggle_follow)
    _make_button("Morph", controls, _cycle_style)
func _toggle_follow() -> void:
    follow_enabled = not follow_enabled
    follow_button.text = "Follow" if follow_enabled else "Free"
func _cycle_style() -> void:
    style_index = (style_index + 1) % styles.size()
    _set_style(styles[style_index])
func _set_style(style: String) -> void:
    var schemes: Dictionary = {
        "violet": [Color("#1c132c"), Color("#9162b8"), Color("#bf80fc")],
        "aether": [Color("#0b2528"), Color("#44b9b0"), Color("#82efe0")],
        "rose": [Color("#28121e"), Color("#d66399"), Color("#fb7ab0")],
        "solar": [Color("#302018"), Color("#d39e55"), Color("#f7cb87")]
    }
    if not schemes.has(style):
        return
    var colors: Array = schemes[style]
    var mat := StandardMaterial3D.new()
    mat.albedo_color = colors[0]
    mat.roughness = 0.8
    ground.material_override = mat
    var atmosphere := get_node_or_null("LivingAtmosphere") as WorldEnvironment
    if atmosphere != null:
        atmosphere.environment.background_color = colors[0]
        atmosphere.environment.ambient_light_color = colors[1]
    for crystal in _beacons:
        var crystal_mat := crystal.material_override as StandardMaterial3D
        if crystal_mat != null:
            crystal_mat.albedo_color = colors[2]
            crystal_mat.emission = colors[1]
    for name in ["Cynthia", "Generator"]:
        var actor: Node = world.get_node_or_null(name)
        if actor != null:
            var visual: Node = actor.get_node_or_null("RiggedAvatar")
            if visual != null and visual.has_method("apply_skin"):
                visual.apply_skin(style)
func _process(delta: float) -> void:
    if camera == null or cynthia == null:
        return
    if follow_enabled:
        var point: Vector3 = cynthia.global_position
        var target: Vector3 = point + Vector3(0, 6.0, 9.0)
        camera.global_position = camera.global_position.lerp(target, clampf(delta * 4.0, 0.0, 1.0))
        camera.look_at(point + Vector3.UP * 1.2, Vector3.UP)
    _hud_clock += delta
    if _hud_clock > 0.35:
        _hud_clock = 0.0
        _update_hud()
        _style_tree_props()
    for i in range(_beacons.size()):
        var beacon: MeshInstance3D = _beacons[i]
        beacon.position.y = 0.45 + sin(Time.get_ticks_msec() * 0.0013 + i) * 0.09
func _update_hud() -> void:
    var state: Dictionary = world.get("world_state")
    var harmony: float = clampf(float(state.get("mood.harmony", 0)), 0.0, 1.0)
    var traits: Node = cynthia.get_node_or_null("Traits")
    var count := 0
    if traits != null:
        count = traits.get("trait_ids").size()
    hud_label.text = "Harmony %.2f  •  Traits %d  •  Skin %s" % [harmony, count, styles[style_index]]
func _style_tree_props() -> void:
    var props: Node = world.get_node_or_null("Props")
    if props == null:
        return
    for prop in props.get_children():
        if prop.has_node("LivingCanopy"):
            continue
        var foliage := MeshInstance3D.new()
        foliage.name = "LivingCanopy"
        var sphere := SphereMesh.new()
        sphere.radius = 0.88
        sphere.height = 1.5
        foliage.mesh = sphere
        foliage.position = Vector3(0, 2.0, 0)
        var canopy := StandardMaterial3D.new()
        canopy.albedo_color = Color("#3f928b")
        canopy.roughness = 0.6
        foliage.material_override = canopy
        prop.add_child(foliage)
func _unhandled_input(event: InputEvent) -> void:
    var pos := Vector2.ZERO
    if event is InputEventScreenTouch and event.pressed:
        pos = event.position
    elif event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
        pos = event.position
    else:
        return
    if not cynthia.has_method("set_target"):
        return
    var ray_origin: Vector3 = camera.project_ray_origin(pos)
    var ray_direction: Vector3 = camera.project_ray_normal(pos)
    var hit: Variant = Plane(Vector3.UP, 0).intersects_ray(ray_origin, ray_direction)
    if hit is Vector3:
        cynthia.set_target(hit)
