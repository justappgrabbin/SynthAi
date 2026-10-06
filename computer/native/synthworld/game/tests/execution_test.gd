extends SceneTree
var failures:=0
func _initialize()->void:call_deferred("run")
func check(condition:bool,message:String)->void:
    if not condition:
        push_error(message)
        failures+=1
func run()->void:
    var world=load("res://Scenes/World.tscn").instantiate()
    root.add_child(world)
    current_scene=world
    await process_frame
    check(not SentenceExecutor.execute({"verb":"spawn","object":"vfx/missing"},world),"Unknown spawn reported success")
    check(not SentenceExecutor.execute({"verb":"move","agent":"Missing","at":"(0,0,0)"},world),"Missing agent reported success")
    check(not SentenceExecutor.execute({"verb":"build","object":"prop/tree","at":"(garbage,0,0)"},world),"Invalid position accepted")
    check(SentenceExecutor.execute({"verb":"light","object":"sky/storm"},world),"Lighting failed")
    check(is_equal_approx(world.get_node("Sun").light_energy,0.3),"Lighting did not reach actual scene")
    check(not SentenceExecutor.execute({"verb":"play","object":"sfx/missing"},world),"Missing audio reported playback")
    var tree=world.place_tree(Vector3(50,0,0));tree.damage(20)
    check(not SentenceExecutor.execute({"agent":"Cynthia","verb":"repair","object":"prop/tree","when":"prop.health<prop.max & distance(agent,object)<=1.5"},world),"Repair ignored distance")
    world.get_node("Cynthia").global_position=Vector3(50,0,0)
    check(SentenceExecutor.execute({"agent":"Cynthia","verb":"repair","object":"prop/tree","when":"prop.health<prop.max & distance(agent,object)<=1.5"},world),"Nearby repair failed")
    check(tree.health==90,"Repair did not alter actual health")
    print("PASS: real lighting/repair, distance conditions, invalid actions and coordinates")
    quit(1 if failures else 0)
