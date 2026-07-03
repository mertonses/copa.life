extends Control

const TEST_INPUT_PATH: String = "res://data/test_match.json"

var engine: MatchEngine = MatchEngine.new()
var result: Dictionary = {}
var events: Array = []
var event_index: int = 0
var playback_time: float = 0.0
var playback_speed: float = 1.0
var running: bool = true
var ball_pos: Vector2 = Vector2(0.5, 0.5)
var target_pos: Vector2 = Vector2(0.5, 0.5)
var current_path: Array[Vector2] = [Vector2(0.5, 0.5)]
var current_type: String = ""
var current_side: String = ""
var event_duration: float = 2.6
var field: Control
var score_label: Label
var minute_label: Label
var event_label: Label
var stats_label: Label
var log_box: RichTextLabel
var speed_button: Button

func _ready() -> void:
	_build_ui()
	_run_simulation()

func _process(delta: float) -> void:
	if events.is_empty() or not running:
		return
	playback_time += delta * playback_speed
	if playback_time >= event_duration:
		playback_time = 0.0
		_advance_event()
	_update_ball_on_path()
	if field:
		field.queue_redraw()

func _build_ui() -> void:
	var root: VBoxContainer = VBoxContainer.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.add_theme_constant_override("separation", 10)
	root.offset_left = 18
	root.offset_top = 14
	root.offset_right = -18
	root.offset_bottom = -14
	add_child(root)

	var header: HBoxContainer = HBoxContainer.new()
	header.add_theme_constant_override("separation", 16)
	root.add_child(header)

	var title: Label = Label.new()
	title.text = "Kopa Final Sim - Godot Prototype"
	title.add_theme_font_size_override("font_size", 24)
	header.add_child(title)

	var spacer: Control = Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(spacer)

	var rerun: Button = Button.new()
	rerun.text = "Re-simulate"
	rerun.pressed.connect(_run_simulation)
	header.add_child(rerun)

	speed_button = Button.new()
	speed_button.text = "Speed: 1x"
	speed_button.pressed.connect(_cycle_speed)
	header.add_child(speed_button)

	var pause: Button = Button.new()
	pause.text = "Pause/Play"
	pause.pressed.connect(func(): running = not running)
	header.add_child(pause)

	var body: HBoxContainer = HBoxContainer.new()
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	body.add_theme_constant_override("separation", 14)
	root.add_child(body)

	var left: VBoxContainer = VBoxContainer.new()
	left.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	left.size_flags_vertical = Control.SIZE_EXPAND_FILL
	body.add_child(left)

	score_label = Label.new()
	score_label.text = "0 - 0"
	score_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	score_label.add_theme_font_size_override("font_size", 42)
	left.add_child(score_label)

	minute_label = Label.new()
	minute_label.text = "00'"
	minute_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	minute_label.add_theme_font_size_override("font_size", 18)
	left.add_child(minute_label)

	field = Control.new()
	field.custom_minimum_size = Vector2(820, 500)
	field.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	field.size_flags_vertical = Control.SIZE_EXPAND_FILL
	field.draw.connect(_draw_field)
	left.add_child(field)

	event_label = Label.new()
	event_label.text = "Kick-off"
	event_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	event_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	event_label.add_theme_font_size_override("font_size", 20)
	left.add_child(event_label)

	var right: VBoxContainer = VBoxContainer.new()
	right.custom_minimum_size = Vector2(330, 0)
	right.size_flags_vertical = Control.SIZE_EXPAND_FILL
	body.add_child(right)

	stats_label = Label.new()
	stats_label.text = ""
	stats_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	stats_label.add_theme_font_size_override("font_size", 16)
	right.add_child(stats_label)

	log_box = RichTextLabel.new()
	log_box.bbcode_enabled = true
	log_box.fit_content = false
	log_box.size_flags_vertical = Control.SIZE_EXPAND_FILL
	right.add_child(log_box)

func _run_simulation() -> void:
	var input: Dictionary = _load_test_input()
	result = engine.simulate(input)
	events = result.get("events", [])
	event_index = -1
	playback_time = 1.3
	running = true
	ball_pos = Vector2(0.5, 0.5)
	target_pos = ball_pos
	current_path = [ball_pos]
	current_type = ""
	current_side = ""
	log_box.clear()
	_update_score(0, 0, 0)
	_update_stats()

func _load_test_input() -> Dictionary:
	if not FileAccess.file_exists(TEST_INPUT_PATH):
		return {}
	var text: String = FileAccess.get_file_as_string(TEST_INPUT_PATH)
	var parsed = JSON.parse_string(text)
	return parsed if typeof(parsed) == TYPE_DICTIONARY else {}

func _advance_event() -> void:
	event_index += 1
	if event_index >= events.size():
		running = false
		event_label.text = "Full time"
		return

	var ev: Dictionary = events[event_index]
	var minute: int = int(ev.get("minute", 0))
	var hg: int = int(ev.get("home_goals", 0))
	var ag: int = int(ev.get("away_goals", 0))
	_update_score(hg, ag, minute)

	var pos: Dictionary = ev.get("pos", {"x": 0.5, "y": 0.5})
	target_pos = Vector2(float(pos.get("x", 0.5)), float(pos.get("y", 0.5)))
	current_path = _read_path(ev)
	current_type = str(ev.get("type", ""))
	current_side = str(ev.get("side", ""))
	if current_path.size() > 0:
		ball_pos = current_path[0]
	var label: String = str(ev.get("label", ""))
	event_label.text = label
	_append_log(ev)
	_update_stats()

func _read_path(ev: Dictionary) -> Array[Vector2]:
	var out: Array[Vector2] = []
	var raw: Array = ev.get("path", [])
	for item in raw:
		if typeof(item) == TYPE_DICTIONARY:
			out.append(Vector2(float(item.get("x", 0.5)), float(item.get("y", 0.5))))
	if out.is_empty():
		var pos: Dictionary = ev.get("pos", {"x": 0.5, "y": 0.5})
		out.append(ball_pos)
		out.append(Vector2(float(pos.get("x", 0.5)), float(pos.get("y", 0.5))))
	return out

func _update_ball_on_path() -> void:
	if current_path.size() <= 1:
		return
	var t: float = clampf(playback_time / event_duration, 0.0, 1.0)
	var scaled: float = t * float(current_path.size() - 1)
	var idx: int = mini(int(floorf(scaled)), current_path.size() - 2)
	var local_t: float = scaled - float(idx)
	local_t = local_t * local_t * (3.0 - 2.0 * local_t)
	ball_pos = current_path[idx].lerp(current_path[idx + 1], local_t)

func _update_score(home_goals: int, away_goals: int, minute: int) -> void:
	score_label.text = "%s  %d - %d  %s" % [
		str(result.get("home_name", "Home")),
		home_goals,
		away_goals,
		str(result.get("away_name", "Away"))
	]
	minute_label.text = "%02d'" % minute

func _update_stats() -> void:
	var s: Dictionary = result.get("stats", {})
	stats_label.text = "Power: %.0f - %.0f\nShots: %d - %d\nSaves: %d - %d\nDanger: %d - %d\nCorners: %d - %d" % [
		float(result.get("home_power", 0)),
		float(result.get("away_power", 0)),
		int(s.get("home_shots", 0)),
		int(s.get("away_shots", 0)),
		int(s.get("home_saves", 0)),
		int(s.get("away_saves", 0)),
		int(s.get("home_danger", 0)),
		int(s.get("away_danger", 0)),
		int(s.get("home_corners", 0)),
		int(s.get("away_corners", 0))
	]

func _append_log(ev: Dictionary) -> void:
	var minute: int = int(ev.get("minute", 0))
	var type: String = str(ev.get("type", "chance"))
	var color: String = "#e6ad2e"
	if type == "goal":
		color = "#4ade80"
	elif type == "save":
		color = "#60a5fa"
	elif type == "miss":
		color = "#d6c8a8"
	elif type == "penalty":
		color = "#f472b6"
	log_box.append_text("[color=%s]%02d'[/color] %s\n" % [color, minute, str(ev.get("label", ""))])
	log_box.scroll_to_line(maxi(0, log_box.get_line_count() - 1))

func _cycle_speed() -> void:
	if playback_speed == 1.0:
		playback_speed = 2.0
	elif playback_speed == 2.0:
		playback_speed = 5.0
	else:
		playback_speed = 1.0
	speed_button.text = "Speed: %sx" % playback_speed

func _draw_field() -> void:
	var r: Rect2 = Rect2(Vector2.ZERO, field.size)
	field.draw_rect(r, Color("#163820"))
	var margin: float = 34.0
	var pitch: Rect2 = Rect2(Vector2(margin, margin), r.size - Vector2(margin * 2.0, margin * 2.0))
	field.draw_rect(pitch, Color("#1d5730"))
	field.draw_rect(pitch, Color("#d8ead4"), false, 3.0)
	field.draw_line(Vector2(pitch.position.x, pitch.get_center().y), Vector2(pitch.end.x, pitch.get_center().y), Color("#d8ead4"), 2.0)
	field.draw_circle(pitch.get_center(), min(pitch.size.x, pitch.size.y) * 0.12, Color("#d8ead4"), false, 2.0)
	_draw_box(pitch, true)
	_draw_box(pitch, false)
	_draw_team_tokens(pitch, true)
	_draw_team_tokens(pitch, false)
	_draw_current_path(pitch)
	var bp: Vector2 = pitch.position + Vector2(ball_pos.x * pitch.size.x, ball_pos.y * pitch.size.y)
	var glow_color: Color = Color("#4ade80") if current_side == "home" else Color("#d95040")
	if current_type == "goal":
		glow_color = Color("#e6ad2e")
	var glow: Color = glow_color
	glow.a = 0.20
	field.draw_circle(bp, 18.0, glow)
	field.draw_circle(bp, 8.0, Color.WHITE)
	field.draw_circle(bp, 3.0, Color.BLACK)

func _draw_current_path(pitch: Rect2) -> void:
	if current_path.size() < 2:
		return
	var col: Color = Color("#f5f0e8", 0.30) if current_side == "home" else Color("#ff8a75", 0.30)
	if current_type == "goal":
		col = Color("#e6ad2e", 0.45)
	for i in range(current_path.size() - 1):
		var a: Vector2 = pitch.position + Vector2(current_path[i].x * pitch.size.x, current_path[i].y * pitch.size.y)
		var b: Vector2 = pitch.position + Vector2(current_path[i + 1].x * pitch.size.x, current_path[i + 1].y * pitch.size.y)
		field.draw_line(a, b, col, 2.0)

func _draw_box(pitch: Rect2, top: bool) -> void:
	var box_w: float = pitch.size.x * 0.42
	var box_h: float = pitch.size.y * 0.17
	var x: float = pitch.get_center().x - box_w * 0.5
	var y: float = pitch.position.y if top else pitch.end.y - box_h
	field.draw_rect(Rect2(Vector2(x, y), Vector2(box_w, box_h)), Color("#d8ead4"), false, 2.0)

func _draw_team_tokens(pitch: Rect2, home: bool) -> void:
	var color: Color = Color("#f5f0e8") if home else Color("#d95040")
	var rows: Array = [
		[0.50],
		[0.24, 0.42, 0.58, 0.76],
		[0.30, 0.50, 0.70],
		[0.38, 0.62]
	]
	var ys: Array = [0.88, 0.70, 0.52, 0.34] if home else [0.12, 0.30, 0.48, 0.66]
	for row_i in rows.size():
		for x in rows[row_i]:
			var p: Vector2 = pitch.position + Vector2(float(x) * pitch.size.x, float(ys[row_i]) * pitch.size.y)
			field.draw_circle(p, 10.0, color)
			field.draw_circle(p, 10.0, Color("#102018"), false, 2.0)
