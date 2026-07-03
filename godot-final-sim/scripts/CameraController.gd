class_name CameraController
extends RefCounted

enum Mode { FULL_PITCH, BALL_FOLLOW, BROADCAST_TACTICAL }

var mode: Mode = Mode.FULL_PITCH
var focus: Vector2 = Vector2(0.5, 0.5)
var zoom: float = 1.0

func cycle_mode() -> void:
	mode = Mode((int(mode) + 1) % 3)

func update(ball: MatchBall, possession_center: Vector2, delta: float) -> void:
	var target: Vector2 = Vector2(0.5, 0.5)
	var target_zoom: float = 1.0
	match mode:
		Mode.FULL_PITCH:
			target = Vector2(0.5, 0.5)
			target_zoom = 1.0
		Mode.BALL_FOLLOW:
			target = ball.pos
			target_zoom = 1.22
		Mode.BROADCAST_TACTICAL:
			target = ball.pos * 0.65 + possession_center * 0.35
			var final_third: bool = ball.pos.y < 0.24 or ball.pos.y > 0.76
			target_zoom = 1.16 if final_third else 1.08
	focus = focus.lerp(target, delta * 3.0)
	zoom = lerpf(zoom, target_zoom, delta * 2.5)

func mode_text() -> String:
	match mode:
		Mode.BALL_FOLLOW:
			return "Ball"
		Mode.BROADCAST_TACTICAL:
			return "Tactical"
		_:
			return "Full"
