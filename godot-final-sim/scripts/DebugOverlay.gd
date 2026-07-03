class_name DebugOverlay
extends RefCounted

var enabled: bool = false

func draw(canvas: Control, pitch: Rect2, pitch_mgr: PitchManager, home: TeamController, away: TeamController, ball: MatchBall, match_state: String) -> void:
	if not enabled:
		return
	_draw_team_debug(canvas, pitch, pitch_mgr, home, Color("#f5f0e8", 0.24))
	_draw_team_debug(canvas, pitch, pitch_mgr, away, Color("#ff8a75", 0.24))
	_draw_defensive_line(canvas, pitch, pitch_mgr, home)
	_draw_defensive_line(canvas, pitch, pitch_mgr, away)
	_draw_ball_debug(canvas, pitch, pitch_mgr, ball)

func _draw_team_debug(canvas: Control, pitch: Rect2, pitch_mgr: PitchManager, team: TeamController, color: Color) -> void:
	var font: Font = canvas.get_theme_default_font()
	var label: String = "attack/%s" % team.current_attack_pattern if team.team_phase == "ATTACK" else "defend/%s" % team.current_defensive_scheme
	canvas.draw_string(font, pitch_mgr.to_screen(pitch, Vector2(0.08, 0.08 if team.side == 0 else 0.13)), label, HORIZONTAL_ALIGNMENT_LEFT, -1.0, 12, Color("#ffffff", 0.72))
	for p in team.players:
		var a: Vector2 = pitch_mgr.to_screen(pitch, p.pos)
		var b: Vector2 = pitch_mgr.to_screen(pitch, p.target)
		canvas.draw_line(a, b, color, 1.0)
		canvas.draw_string(font, a + Vector2(10.0, -9.0), "%s/%s" % [p.current_state, p.sequence_role], HORIZONTAL_ALIGNMENT_LEFT, -1.0, 9, Color("#ffffff", 0.58))
		if p.current_state == "PRESS":
			canvas.draw_circle(a, 16.0, Color("#e6ad2e", 0.34), false, 2.0)
		elif p.current_state in ["COVER_PASSING_LANE", "BLOCK_PASSING_LANE"]:
			canvas.draw_circle(a, 15.0, Color("#60a5fa", 0.34), false, 2.0)
		elif p.current_state == "CHASE_LOOSE_BALL":
			canvas.draw_circle(a, 15.0, Color("#f472b6", 0.34), false, 2.0)
		if p.has_ball:
			canvas.draw_circle(a, 19.0, Color("#e6ad2e", 0.42), false, 3.0)

func _draw_defensive_line(canvas: Control, pitch: Rect2, pitch_mgr: PitchManager, team: TeamController) -> void:
	var y: float = team.defensive_line_y
	var col: Color = Color("#e6ad2e", 0.26) if team.side == 0 else Color("#60a5fa", 0.26)
	canvas.draw_line(pitch_mgr.to_screen(pitch, Vector2(0.08, y)), pitch_mgr.to_screen(pitch, Vector2(0.92, y)), col, 2.0)
	if team.pressing_player != null and team.cover_player != null:
		var a: Vector2 = pitch_mgr.to_screen(pitch, team.pressing_player.pos)
		var b: Vector2 = pitch_mgr.to_screen(pitch, team.cover_player.pos)
		canvas.draw_line(a, b, Color("#ffffff", 0.10), 1.0)

func _draw_ball_debug(canvas: Control, pitch: Rect2, pitch_mgr: PitchManager, ball: MatchBall) -> void:
	var bp: Vector2 = pitch_mgr.to_screen(pitch, ball.pos)
	var tv: Vector2 = pitch_mgr.to_screen(pitch, ball.target_position)
	canvas.draw_line(bp, bp + ball.vel * pitch.size.y * 0.25, Color("#ffffff", 0.34), 2.0)
	canvas.draw_line(bp, tv, Color("#7dd3fc", 0.22), 1.0)
	canvas.draw_circle(tv, 5.0, Color("#7dd3fc", 0.26), false, 1.5)
