extends Node
class_name Utility
static func score(expr: String, context: Dictionary) -> float:
    var e := Expression.new()
    var vars := context.keys()
    if e.parse(expr,vars) != OK: return 0.0
    var values := []
    for v in vars: values.append(float(context.get(v,0.0)))
    var res=e.execute(values,null,true)
    if typeof(res)!=TYPE_FLOAT and typeof(res)!=TYPE_INT: return 0.0
    return float(res)
