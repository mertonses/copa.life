extends Control

func _ready() -> void:
	if OS.has_feature("web"):
		_try_url_params()
		return
	_build_manual_ui()

func _try_url_params() -> void:
	var query: String = str(JavaScriptBridge.eval("window.location.search || ''", true))
	var input: Dictionary = _parse_query(query)
	if not input.is_empty():
		get_tree().set_meta("godot_match_input", input)
		get_tree().change_scene_to_file("res://scenes/FinalSim.tscn")
		return
	_build_manual_ui()

func _parse_query(query: String) -> Dictionary:
	if query.is_empty():
		return {}
	var d_start: int = query.find("d=")
	if d_start < 0:
		return {}
	var b64: String = query.substr(d_start + 2)
	var amp: int = b64.find("&")
	if amp >= 0:
		b64 = b64.substr(0, amp)
	b64 = b64.uri_decode()
	if b64.is_empty():
		return {}
	var json_str: String = Marshalls.base64_to_utf8(b64)
	var parsed = JSON.parse_string(json_str)
	if typeof(parsed) == TYPE_DICTIONARY:
		return parsed
	return {}

func _build_manual_ui() -> void:
	var box: VBoxContainer = VBoxContainer.new()
	box.set_anchors_preset(Control.PRESET_FULL_RECT)
	box.alignment = BoxContainer.ALIGNMENT_CENTER
	box.add_theme_constant_override("separation", 18)
	add_child(box)
	var label: Label = Label.new()
	label.text = "Kopa Final Sim"
	label.add_theme_font_size_override("font_size", 32)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(label)
	var hint: Label = Label.new()
	hint.text = "Test modunda çalışıyor. data/test_match.json üzerinden maç başlatılacak."
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(hint)
	var start_button: Button = Button.new()
	start_button.text = "Final Sim'i Başlat"
	start_button.pressed.connect(_start_final_sim)
	box.add_child(start_button)

func _start_final_sim() -> void:
	get_tree().change_scene_to_file("res://scenes/FinalSim.tscn")
