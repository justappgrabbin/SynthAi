extends Node
class_name SentenceExecutor
static func execute(ast:Dictionary,world:Node)->bool:
    var agent_id:=String(ast.get("agent","Cynthia"))
    if not _condition_allows(String(ast.get("when","")),world,agent_id):return false
    var verb:=String(ast.get("verb",""))
    var object_id:=String(ast.get("object",""))
    var position_text:=String(ast.get("at","(0,0,0)"))
    if not SentenceParser.valid_position(position_text):return false
    var pos:=SentenceParser.parse_position(position_text)
    var applied:=false
    match verb:
        "build","spawn":
            if object_id=="prop/tree":applied=world.place_tree(pos)!=null
        "repair":
            if object_id!="prop/tree":return false
            var agent=world.get_node_or_null(agent_id)
            if not agent is Node3D:return false
            applied=world.repair_props_near(agent.global_position,1.5)>0
        "move":
            var agent=world.get_node_or_null(agent_id)
            if agent and agent.has_method("set_target"):
                agent.set_target(pos)
                applied=true
        "emote","light","play","set":
            var key:String=object_id if verb=="set" else {"emote":"emotion","light":"light","play":"sound"}[verb]
            applied=world.set_world_state(key,ast.get("with","") if verb=="set" else object_id)
        _:return false
    var scene_id:=String(ast.get("scene",""))
    if applied and not scene_id.is_empty():YiJingResolver.apply_scene(scene_id,world)
    return applied
static func _condition_allows(expr:String,world:Node,agent_id:String="Cynthia")->bool:
    if expr.strip_edges().is_empty():return true
    for raw_clause in expr.split("&"):
        var clause:=raw_clause.strip_edges()
        if clause=="prop.health<prop.max":
            if not world.has_damaged_props():return false
        elif clause=="distance(agent,object)<=1.5":
            var agent=world.get_node_or_null(agent_id)
            if not agent is Node3D or not world.has_damaged_props_near(agent.global_position,1.5):return false
        elif clause=="mood.harmony>=0.7":
            if float(world.world_state.get("mood.harmony",0.0))<0.7:return false
        else:return false
    return true
