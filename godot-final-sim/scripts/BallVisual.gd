class_name BallVisual
extends RefCounted

var trail_points: Array[Vector2] = []
var max_trail_points: int = 12

func update(ball: MatchBall, delta: float) -> void:
	if trail_points.is_empty() or trail_points[trail_points.size() - 1].distance_to(ball.pos) > 0.006:
		trail_points.append(ball.pos)
	while trail_points.size() > max_trail_points:
		trail_points.pop_front()
	if ball.owner != null or ball.vel.length() < 0.03:
		if trail_points.size() > 4:
			trail_points.pop_front()

func draw(canvas: Control, pitch: Rect2, pitch_mgr: PitchManager, ball: MatchBall, action: String, progress: float) -> void:
	var pos: Vector2 = pitch_mgr.to_screen(pitch, ball.pos)
	var height: float = _height_for(ball, action, progress)
	var shadow_alpha: float = lerpf(0.38, 0.15, clampf(height / 42.0, 0.0, 1.0))
	var shadow_scale: float = lerpf(1.0, 0.62, clampf(height / 42.0, 0.0, 1.0))
	_draw_trail(canvas, pitch, pitch_mgr, ball, action)
	canvas.draw_circle(pos, 5.5 * shadow_scale, Color("#000000", shadow_alpha))
	if ball.ball_state == "LOOSE":
		canvas.draw_circle(pos, 15.0, Color("#f472b6", 0.28), false, 2.0)
	var ball_pos: Vector2 = pos + Vector2(0.0, -height)
	canvas.draw_circle(ball_pos, 6.3, Color("#ffffff"))
	canvas.draw_circle(ball_pos, 6.3, Color("#111111"), false, 1.4)
	canvas.draw_circle(ball_pos + Vector2(1.8, -1.8), 1.4, Color("#111111", 0.75))

func _draw_trail(canvas: Control, pitch: Rect2, pitch_mgr: PitchManager, ball: MatchBall, action: String) -> void:
	if trail_points.size() < 2 or ball.owner != null:
		return
	var col: Color = Color("#ffffff", 0.34)
	var width: float = 2.0
	if ball.ball_state == "SHOOTING" or action == "SHOOT":
		col = Color("#ffe08a", 0.52)
		width = 3.2
	elif ball.ball_state == "CROSSING" or action == "CROSS":
		col = Color("#9be7ff", 0.42)
	for i in range(1, trail_points.size()):
		var a: Vector2 = pitch_mgr.to_screen(pitch, trail_points[i - 1])
		var b: Vector2 = pitch_mgr.to_screen(pitch, trail_points[i])
		var alpha: float = float(i) / float(trail_points.size())
		canvas.draw_line(a, b, Color(col, col.a * alpha), width * alpha)

func _height_for(ball: MatchBall, action: String, progress: float) -> float:
	if ball.ball_state == "CROSSING" or action in ["CROSS", "LONG_PASS"]:
		return sin(clampf(progress, 0.0, 1.0) * PI) * 34.0
	if action == "THROUGH_BALL":
		return sin(clampf(progress, 0.0, 1.0) * PI) * 10.0
	return 0.0
