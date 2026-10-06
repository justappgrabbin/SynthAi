extends CharacterBody3D
const BASE_SPEED:=3.0
const BASE_REPAIR_AMOUNT:=10
const REPAIR_RADIUS:=1.5
const SCAN_PERIOD:=0.5
const PACKAGED_BUILD_QUEUE:="res://data/commands/build.json"
const RUNTIME_BUILD_QUEUE:="user://build.json"
@onready var trait_comp:=$Traits
var _scan_accum:=0.0
var _target_pos:=Vector3.ZERO
var _has_target:=false
var rng:=RandomNumberGenerator.new()
func _ready()->void:
    rng.randomize(); global_transform.origin=Vector3.ZERO; _load_traits_for_cynthia(); _ensure_runtime_build_queue()
func _physics_process(delta:float)->void:
    var speed=BASE_SPEED*trait_comp.get_stat_mult("speedMult")
    if _has_target:
        var to=(_target_pos-global_transform.origin)
        if to.length()>0.1:velocity=to.normalized()*speed
        else:velocity=Vector3.ZERO;_has_target=false
    elif rng.randf()<0.01:_target_pos=global_transform.origin+Vector3(rng.randf_range(-3,3),0,rng.randf_range(-3,3));_has_target=true
    move_and_slide()
    _scan_accum+=delta
    if _scan_accum>=SCAN_PERIOD:
        _scan_accum=0.0
        if _try_process_build_order():return
        if _try_repair_nearby():return
func _ensure_runtime_build_queue()->void:
    if FileAccess.file_exists(RUNTIME_BUILD_QUEUE):return
    var seed:="[]"
    if FileAccess.file_exists(PACKAGED_BUILD_QUEUE):seed=FileAccess.get_file_as_string(PACKAGED_BUILD_QUEUE)
    var f:=FileAccess.open(RUNTIME_BUILD_QUEUE,FileAccess.WRITE)
    if f:f.store_string(seed);f.close()
func _try_process_build_order()->bool:
    if not FileAccess.file_exists(RUNTIME_BUILD_QUEUE):return false
    var arr=JSON.parse_string(FileAccess.get_file_as_string(RUNTIME_BUILD_QUEUE))
    if typeof(arr)!=TYPE_ARRAY or arr.size()==0:return false
    var order=arr.pop_front();_execute_order(order)
    var f=FileAccess.open(RUNTIME_BUILD_QUEUE,FileAccess.WRITE)
    if f:f.store_string(JSON.stringify(arr,"  "));f.close()
    return true
func _execute_order(order:Dictionary)->void:
    var pos_arr=order.get("pos",[0,0,0]);var pos=Vector3(pos_arr[0],pos_arr[1],pos_arr[2])
    if String(order.get("cmd",""))=="place_tree":
        var inst=load("res://Scenes/Props/Tree.tscn").instantiate()
        get_tree().current_scene.get_node("Props").add_child(inst);inst.global_transform.origin=pos;_target_pos=pos;_has_target=true
func _try_repair_nearby()->bool:
    var props=get_tree().current_scene.get_node("Props");var closest=null;var best:=1e9
    for c in props.get_children():
        if c.has_method("is_damaged") and c.is_damaged():
            var d=c.global_transform.origin.distance_to(global_transform.origin)
            if d<best:best=d;closest=c
    if closest:
        if best>REPAIR_RADIUS:_target_pos=closest.global_transform.origin;_has_target=true
        else:closest.repair(int(BASE_REPAIR_AMOUNT*trait_comp.get_stat_mult("repairAmountMult")))
        return true
    return false
func _load_traits_for_cynthia()->void:
    var path="res://data/agents/cynthia_traits.json"
    if FileAccess.file_exists(path):
        var arr=JSON.parse_string(FileAccess.get_file_as_string(path))
        if typeof(arr)==TYPE_ARRAY:trait_comp.set_traits(arr)
func set_target(pos:Vector3)->void:_target_pos=pos;_has_target=true
