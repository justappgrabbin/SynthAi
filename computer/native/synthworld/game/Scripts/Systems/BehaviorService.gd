extends Node
var _actions:Array=[]
func _ready()->void:_load_actions()
func _load_actions()->void:
    _actions.clear()
    var dir:=DirAccess.open("res://data/behaviors")
    if dir:
        dir.list_dir_begin()
        var f=dir.get_next()
        while f!="":
            if f.ends_with(".json"):
                var data=JSON.parse_string(FileAccess.get_file_as_string("res://data/behaviors/%s"%f))
                if typeof(data)==TYPE_DICTIONARY:_actions.append(data)
                elif typeof(data)==TYPE_ARRAY:
                    for it in data:_actions.append(it)
            f=dir.get_next()
        dir.list_dir_end()
func get_available_actions()->Array:return _actions
