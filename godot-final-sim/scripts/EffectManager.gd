class_name EffectManager
extends RefCounted

var effects: Array[Dictionary] = []

func update(delta: float) -> void:
	for e in effects:
		e["age"] = float(e.get("age", 0.0)) + delta
	for i in range(effects.size() - 1, -1, -1):
		if float(effects[i].get("age", 0.0)) >= float(effects[i].get("life", 0.25)):
			effects.remove_at(i)

func draw(canvas: Control, pitch: Rect2, pitch_mgr: PitchManager) -> void:
	for e in effects:
		var age: float = float(e.get("age", 0.0))
		var life: float = maxf(float(e.get("life", 0.25)), 0.01)
		var alpha: float = 1.0 - clampf(age / life, 0.0, 1.0)
		var kind: String = str(e.get("kind", "line"))
		if kind == "pulse":
			var pos: Vector2 = pitch_mgr.to_screen(pitch, e.get("pos", Vector2(0.5, 0.5)))
			canvas.draw_circle(pos, lerpf(8.0, 22.0, 1.0 - alpha), Color(e.get("color", Color.WHITE), alpha * 0.35), false, 2.0)
		else:
			var a: Vector2 = pitch_mgr.to_screen(pitch, e.get("from", Vector2(0.5, 0.5)))
			var b: Vector2 = pitch_mgr.to_screen(pitch, e.get("to", Vector2(0.5, 0.5)))
			canvas.draw_line(a, b, Color(e.get("color", Color.WHITE), alpha * float(e.get("alpha", 0.55))), float(e.get("width", 2.0)))

func on_pass_started(from_pos: Vector2, to_pos: Vector2, pass_type: String) -> void:
	var col: Color = Color("#ffffff")
	var width: float = 2.0
	var life: float = 0.22
	if pass_type in ["LONG_PASS", "THROUGH_BALL"]:
		col = Color("#a7f3d0")
		width = 2.6
		life = 0.32
	elif pass_type == "CROSS":
		col = Color("#7dd3fc")
		width = 2.8
		life = 0.36
	effects.append({"kind": "line", "from": from_pos, "to": to_pos, "color": col, "width": width, "life": life, "age": 0.0, "alpha": 0.55})

func on_pass_received(receiver) -> void:
	if receiver != null:
		effects.append({"kind": "pulse", "pos": receiver.pos, "color": Color("#f6c453"), "life": 0.28, "age": 0.0})

func on_pass_failed(target_pos: Vector2) -> void:
	effects.append({"kind": "pulse", "pos": target_pos, "color": Color("#f472b6"), "life": 0.34, "age": 0.0})

func on_shot_taken(from_pos: Vector2, target_pos: Vector2) -> void:
	effects.append({"kind": "line", "from": from_pos, "to": target_pos, "color": Color("#ffe08a"), "width": 3.5, "life": 0.28, "age": 0.0, "alpha": 0.75})

func on_ball_lost(position: Vector2) -> void:
	effects.append({"kind": "pulse", "pos": position, "color": Color("#f472b6"), "life": 0.32, "age": 0.0})

func on_goal_scored(team_id: int) -> void:
	var pos: Vector2 = Vector2(0.5, 0.06 if team_id == 0 else 0.94)
	effects.append({"kind": "pulse", "pos": pos, "color": Color("#4ade80"), "life": 0.80, "age": 0.0})
