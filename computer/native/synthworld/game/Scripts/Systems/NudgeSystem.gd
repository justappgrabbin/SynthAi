extends Node
var nudges:Array=[]
func _ready()->void:
    var path="res://data/nudges.json"
    if FileAccess.file_exists(path):
        var data=JSON.parse_string(FileAccess.get_file_as_string(path))
        if typeof(data)==TYPE_ARRAY:nudges=data
