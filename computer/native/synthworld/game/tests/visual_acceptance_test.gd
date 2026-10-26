extends SceneTree
## Run inside the Godot 4.6 project:
## godot --headless --path computer/native/synthworld/game --script res://tests/visual_acceptance_test.gd
var failures: int = 0
func check(condition: bool, description: String) -> void:
    if not condition:
        failures += 1
        push_error("SYNTHWORLD_VISUAL_FAIL: " + description)
func _initialize() -> void:
    call_deferred("_run")
func _run() -> void:
    var world_resource := load("res://Scenes/World.tscn") as PackedScene
    check(world_resource != null, "native world scene resolves")
    if world_resource == null:
        quit(1)
        return
    var world := world_resource.instantiate()
    root.add_child(world)
    current_scene = world
    await process_frame
    await process_frame
    var cynthia: Node = world.get_node_or_null("Cynthia")
    var presentation: Node = world.get_node_or_null("WorldPresentation")
    check(cynthia != null, "Cynthia exists")
    check(presentation != null, "presentation attached")
    if cynthia != null:
        var visual: Node = cynthia.get_node_or_null("RiggedAvatar")
        check(visual != null, "Cynthia has rig layer")
        if visual != null:
            check(visual.get("skeleton") is Skeleton3D, "Cynthia skeleton initialized")
            visual.apply_skin("aether")
            check(visual.get("_skin") == "aether", "actual rig skin switched")
            visual.apply_skin("violet")
        check(cynthia.has_method("set_target"), "original Cynthia navigation preserved")
    if presentation != null:
        check(presentation.get("hud_label") is Label, "interactive HUD created")
        var prior_follow: bool = presentation.get("follow_enabled")
        presentation._toggle_follow()
        check(presentation.get("follow_enabled") != prior_follow, "follow camera toggle works")
        presentation._toggle_follow()
        presentation._cycle_style()
        check(presentation.get("style_index") == 1, "morph button changes world palette")
    var agent: Node = world.get_node_or_null("Generator")
    check(agent != null, "original simulation Generator spawned")
    if agent != null:
        var agent_visual: Node = agent.get_node_or_null("RiggedAvatar")
        check(agent_visual != null, "simulation agent has rig layer")
        if agent_visual != null:
            check(agent_visual.get("skeleton") is Skeleton3D, "simulation agent has live skeleton")
    print("SYNTHWORLD_VISUAL_ACCEPTANCE=", "FAIL" if failures else "PASS")
    quit(1 if failures else 0)
