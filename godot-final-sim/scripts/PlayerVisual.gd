class_name PlayerVisual
extends RefCounted

var home_color: Color = Color("#f4f1e8")
var away_color: Color = Color("#d84b3f")
var keeper_color: Color = Color("#48c7e8")
var outline_color: Color = Color("#102018")
var possession_color: Color = Color("#f6c453")
var press_color: Color = Color("#ff6555")
var receive_color: Color = Color("#7dd3fc")
var contest_color: Color = Color("#f472b6")
var support_color: Color = Color("#a7f3d0")

func draw_team(canvas: Control, pitch: Rect2, pitch_mgr: PitchManager, players: Array[PlayerAgent], font: Font, debug_enabled: bool) -> void:
	for p in players:
		draw_player(canvas, pitch, pitch_mgr, p, font, debug_enabled)

func draw_player(canvas: Control, pitch: Rect2, pitch_mgr: PitchManager, player: PlayerAgent, font: Font, debug_enabled: bool) -> void:
	var pos: Vector2 = pitch_mgr.to_screen(pitch, player.pos)
	var target: Vector2 = pitch_mgr.to_screen(pitch, player.target)
	var dir: Vector2 = _facing_dir(player)
	var speed_ratio: float = clampf(player.vel.length() / maxf(player.speed, 0.01), 0.0, 1.0)
	var radius: float = 10.5 if not player.is_goalkeeper() else 12.0
	var body_color: Color = keeper_color if player.is_goalkeeper() else (home_color if player.team_id == 0 else away_color)
	var shadow_offset: Vector2 = -dir * 2.0 + Vector2(0.0, 3.0)

	canvas.draw_circle(pos + shadow_offset, radius * 0.78, Color("#000000", 0.22))
	if debug_enabled:
		canvas.draw_line(pos, target, Color(body_color, 0.20), 1.0)
	_draw_state_rings(canvas, pos, radius, player)
	canvas.draw_circle(pos, radius + speed_ratio * 1.0, body_color)
	canvas.draw_circle(pos, radius + speed_ratio * 1.0, outline_color, false, 2.0)
	_draw_direction(canvas, pos, dir, radius, body_color)
	_draw_number(canvas, pos, player, font)
	if debug_enabled:
		_draw_role(canvas, pos, player, font)

func _draw_state_rings(canvas: Control, pos: Vector2, radius: float, player: PlayerAgent) -> void:
	if player.has_ball:
		canvas.draw_circle(pos, radius + 7.0, Color(possession_color, 0.40), false, 3.0)
		return
	if player.is_receive_target or player.current_state in ["RECEIVE_PASS", "ANTICIPATE_PASS"]:
		canvas.draw_circle(pos, radius + 6.0, Color(receive_color, 0.34), false, 3.0)
		return
	if player.is_loose_contender or player.current_state == "CHASE_LOOSE_BALL":
		canvas.draw_circle(pos, radius + 6.0, Color(contest_color, 0.34), false, 3.0)
		return
	if player.is_primary_presser or player.current_state in ["PRESS", "PRESS_BALL_CARRIER"]:
		canvas.draw_circle(pos, radius + 6.0, Color(press_color, 0.36), false, 3.0)
		return
	if player.is_secondary_cover or player.current_state == "COVER_PASSING_LANE":
		canvas.draw_circle(pos, radius + 5.0, Color(receive_color, 0.24), false, 2.0)
		return
	if player.current_state in ["OFFER_PASSING_ANGLE", "SUPPORT_ATTACK", "MAKE_RUN"]:
		canvas.draw_circle(pos, radius + 5.0, Color(support_color, 0.22), false, 2.0)

func _draw_direction(canvas: Control, pos: Vector2, dir: Vector2, radius: float, color: Color) -> void:
	if dir.length() < 0.1:
		return
	var tip: Vector2 = pos + dir * (radius + 7.0)
	var side: Vector2 = dir.orthogonal() * 4.0
	canvas.draw_line(pos + dir * (radius * 0.35), tip, Color(color).lightened(0.20), 3.0)
	canvas.draw_circle(tip, 2.4, Color(color).lightened(0.20))

func _draw_number(canvas: Control, pos: Vector2, player: PlayerAgent, font: Font) -> void:
	var number: String = str(player.id + 1)
	var size: int = 12
	var text_pos: Vector2 = pos + Vector2(-4.0 if number.length() == 1 else -7.0, 4.0)
	canvas.draw_string(font, text_pos, number, HORIZONTAL_ALIGNMENT_LEFT, -1.0, size, Color("#102018"))

func _draw_role(canvas: Control, pos: Vector2, player: PlayerAgent, font: Font) -> void:
	canvas.draw_string(font, pos + Vector2(-11.0, 24.0), player.current_state, HORIZONTAL_ALIGNMENT_LEFT, -1.0, 9, Color("#ffffff", 0.72))

func _facing_dir(player: PlayerAgent) -> Vector2:
	if player.vel.length() > 0.015:
		return player.vel.normalized()
	var to_target: Vector2 = player.target - player.pos
	if to_target.length() > 0.015:
		return to_target.normalized()
	return Vector2(0.0, -1.0 if player.team_id == 0 else 1.0)
