class_name PitchVisual
extends RefCounted

var grass_dark: Color = Color("#15552f")
var grass_light: Color = Color("#1f6b3d")
var line_color: Color = Color("#e8f3df", 0.86)
var vignette_color: Color = Color("#06140c", 0.22)

func draw(canvas: Control, pitch: Rect2) -> void:
	canvas.draw_rect(pitch, grass_dark)
	_draw_stripes(canvas, pitch)
	_draw_soft_texture(canvas, pitch)
	_draw_lines(canvas, pitch)
	_draw_goals(canvas, pitch)
	_draw_vignette(canvas, pitch)

func _draw_stripes(canvas: Control, pitch: Rect2) -> void:
	var stripes: int = 10
	var stripe_h: float = pitch.size.y / float(stripes)
	for i in range(stripes):
		var col: Color = grass_light if i % 2 == 0 else grass_dark
		col.a = 0.62
		canvas.draw_rect(Rect2(pitch.position + Vector2(0.0, stripe_h * i), Vector2(pitch.size.x, stripe_h)), col)

func _draw_soft_texture(canvas: Control, pitch: Rect2) -> void:
	for i in range(28):
		var x: float = pitch.position.x + fmod(float(i * 97), pitch.size.x)
		var y: float = pitch.position.y + fmod(float(i * 53), pitch.size.y)
		canvas.draw_line(Vector2(x, y), Vector2(x + 34.0, y + 2.0), Color("#ffffff", 0.025), 1.0)

func _draw_lines(canvas: Control, pitch: Rect2) -> void:
	canvas.draw_rect(pitch, line_color, false, 3.0)
	var mid_y: float = pitch.get_center().y
	canvas.draw_line(Vector2(pitch.position.x, mid_y), Vector2(pitch.end.x, mid_y), line_color, 2.0)
	canvas.draw_circle(pitch.get_center(), pitch.size.y * 0.12, line_color, false, 2.0)
	canvas.draw_circle(pitch.get_center(), 3.5, line_color)
	_draw_penalty_area(canvas, pitch, true)
	_draw_penalty_area(canvas, pitch, false)

func _draw_penalty_area(canvas: Control, pitch: Rect2, top_side: bool) -> void:
	var box_w: float = pitch.size.x * 0.42
	var box_h: float = pitch.size.y * 0.16
	var six_w: float = pitch.size.x * 0.22
	var six_h: float = pitch.size.y * 0.065
	var x: float = pitch.get_center().x - box_w * 0.5
	var sx: float = pitch.get_center().x - six_w * 0.5
	var y: float = pitch.position.y if top_side else pitch.end.y - box_h
	var sy: float = pitch.position.y if top_side else pitch.end.y - six_h
	canvas.draw_rect(Rect2(Vector2(x, y), Vector2(box_w, box_h)), line_color, false, 2.0)
	canvas.draw_rect(Rect2(Vector2(sx, sy), Vector2(six_w, six_h)), line_color, false, 2.0)
	var spot_y: float = pitch.position.y + pitch.size.y * (0.105 if top_side else 0.895)
	canvas.draw_circle(Vector2(pitch.get_center().x, spot_y), 3.0, line_color)

func _draw_goals(canvas: Control, pitch: Rect2) -> void:
	var goal_w: float = pitch.size.x * 0.18
	var goal_d: float = 12.0
	var x: float = pitch.get_center().x - goal_w * 0.5
	canvas.draw_rect(Rect2(Vector2(x, pitch.position.y - goal_d), Vector2(goal_w, goal_d)), Color("#d7e9d2", 0.42), false, 2.0)
	canvas.draw_rect(Rect2(Vector2(x, pitch.end.y), Vector2(goal_w, goal_d)), Color("#d7e9d2", 0.42), false, 2.0)

func _draw_vignette(canvas: Control, pitch: Rect2) -> void:
	canvas.draw_rect(Rect2(pitch.position, Vector2(pitch.size.x, 18.0)), vignette_color)
	canvas.draw_rect(Rect2(Vector2(pitch.position.x, pitch.end.y - 18.0), Vector2(pitch.size.x, 18.0)), vignette_color)
	canvas.draw_rect(Rect2(pitch.position, Vector2(18.0, pitch.size.y)), vignette_color)
	canvas.draw_rect(Rect2(Vector2(pitch.end.x - 18.0, pitch.position.y), Vector2(18.0, pitch.size.y)), vignette_color)
