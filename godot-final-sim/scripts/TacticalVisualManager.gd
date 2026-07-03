class_name TacticalVisualManager
extends RefCounted

var enabled_minimal: bool = true

func draw(canvas: Control, pitch: Rect2, pitch_mgr: PitchManager, home: TeamController, away: TeamController, ball: MatchBall, current_event: Dictionary, debug_enabled: bool) -> void:
	if not enabled_minimal and not debug_enabled:
		return
	_draw_defensive_line(canvas, pitch, pitch_mgr, home, debug_enabled)
	_draw_defensive_line(canvas, pitch, pitch_mgr, away, debug_enabled)
	if debug_enabled:
		_draw_current_lane(canvas, pitch, pitch_mgr, current_event)
		_draw_scheme_compactness(canvas, pitch, pitch_mgr, home)
		_draw_scheme_compactness(canvas, pitch, pitch_mgr, away)
	_draw_set_piece_marker(canvas, pitch, pitch_mgr, current_event)
	_draw_run_hints(canvas, pitch, pitch_mgr, home.players)
	_draw_run_hints(canvas, pitch, pitch_mgr, away.players)
	_draw_sequence_hints(canvas, pitch, pitch_mgr, home.players)
	_draw_sequence_hints(canvas, pitch, pitch_mgr, away.players)

func _draw_defensive_line(canvas: Control, pitch: Rect2, pitch_mgr: PitchManager, team: TeamController, debug_enabled: bool) -> void:
	var col: Color = Color("#f6c453", 0.30 if debug_enabled else 0.16)
	if team.side == 1:
		col = Color("#7dd3fc", 0.30 if debug_enabled else 0.16)
	var y: float = team.defensive_line_y
	canvas.draw_line(pitch_mgr.to_screen(pitch, Vector2(0.10, y)), pitch_mgr.to_screen(pitch, Vector2(0.90, y)), col, 2.0 if debug_enabled else 1.0)

func _draw_current_lane(canvas: Control, pitch: Rect2, pitch_mgr: PitchManager, ev: Dictionary) -> void:
	if ev.is_empty():
		return
	var action: String = str(ev.get("action", ""))
	if not action in ["THROUGH_BALL", "PASS_TO_WING", "CROSS", "LONG_PASS", "CORNER", "THROW_IN", "GOAL_KICK_SHORT", "GOAL_KICK_LONG", "KEEPER_BUILD_UP", "KEEPER_LONG", "KICK_OFF", "ONE_TWO", "WALL_PASS", "SIDEWAYS_PASS", "SWITCH_PLAY", "CUTBACK", "VERTICAL_PASS", "PRESSURED_BACK_PASS", "SAFE_RECYCLE", "FREE_KICK_SHORT"]:
		return
	var start: Vector2 = _dict_to_vec(ev.get("start", {}))
	var end: Vector2 = _dict_to_vec(ev.get("end", {}))
	var col: Color = Color("#ffffff", 0.10)
	if action == "CROSS":
		col = Color("#7dd3fc", 0.15)
	elif action == "CORNER":
		col = Color("#facc15", 0.25)
	elif action in ["GOAL_KICK_LONG", "KEEPER_LONG"]:
		col = Color("#c084fc", 0.18)
	elif action == "THROW_IN":
		col = Color("#fb923c", 0.18)
	elif action == "THROUGH_BALL":
		col = Color("#a7f3d0", 0.15)
	elif action in ["ONE_TWO", "WALL_PASS"]:
		col = Color("#a7f3d0", 0.22)
	elif action == "SWITCH_PLAY":
		col = Color("#fde68a", 0.18)
	elif action == "CUTBACK":
		col = Color("#f9a8d4", 0.20)
	elif action in ["PRESSURED_BACK_PASS", "SAFE_RECYCLE"]:
		col = Color("#cbd5e1", 0.16)
	canvas.draw_line(pitch_mgr.to_screen(pitch, start), pitch_mgr.to_screen(pitch, end), col, 2.0)

func _draw_set_piece_marker(canvas: Control, pitch: Rect2, pitch_mgr: PitchManager, ev: Dictionary) -> void:
	if ev.is_empty():
		return
	var action: String = str(ev.get("action", ""))
	if not action in ["CORNER", "THROW_IN", "GOAL_KICK_SHORT", "GOAL_KICK_LONG", "KEEPER_BUILD_UP", "KEEPER_LONG", "KICK_OFF"]:
		return
	var start: Vector2 = _dict_to_vec(ev.get("start", {}))
	var pos: Vector2 = pitch_mgr.to_screen(pitch, start)
	var col: Color = Color("#facc15", 0.30)
	if action == "THROW_IN":
		col = Color("#fb923c", 0.28)
	elif action in ["GOAL_KICK_SHORT", "GOAL_KICK_LONG", "KEEPER_BUILD_UP", "KEEPER_LONG"]:
		col = Color("#c084fc", 0.24)
	elif action == "KICK_OFF":
		col = Color("#ffffff", 0.20)
	canvas.draw_circle(pos, 22.0, col, false, 2.5)
	canvas.draw_circle(pos, 5.0, col)

func _draw_scheme_compactness(canvas: Control, pitch: Rect2, pitch_mgr: PitchManager, team: TeamController) -> void:
	if not team.team_phase == "DEFEND":
		return
	if not team.current_defensive_scheme in [DefensiveScheme.BALL_SIDE_PRESS, DefensiveScheme.BOX_DEFENSE, DefensiveScheme.MID_BLOCK]:
		return
	var y: float = team.defensive_line_y
	var col: Color = Color("#60a5fa", 0.08) if team.side == 1 else Color("#f6c453", 0.08)
	canvas.draw_rect(Rect2(pitch_mgr.to_screen(pitch, Vector2(0.18, y - 0.08)), Vector2(pitch.size.x * 0.64, pitch.size.y * 0.16)), col, false, 1.0)

func _draw_run_hints(canvas: Control, pitch: Rect2, pitch_mgr: PitchManager, players: Array[PlayerAgent]) -> void:
	for p in players:
		if not p.current_state in ["MAKE_RUN", "ANTICIPATE_PASS", "OFFER_PASSING_ANGLE", "OVERLAP_RUN", "BYLINE_DRIVE", "BOX_NEAR_POST", "BOX_FAR_POST", "PENALTY_SPOT_RUN", "CUTBACK_ZONE_ATTACK", "REBOUND_RUN", "KEEPER_DIVE", "KEEPER_CLAIM_CROSS"] and p.sequence_role != SequenceRole.DEPTH_RUNNER:
			continue
		var a: Vector2 = pitch_mgr.to_screen(pitch, p.pos)
		var b: Vector2 = pitch_mgr.to_screen(pitch, p.target)
		if a.distance_to(b) < 10.0:
			continue
		var col: Color = Color("#a7f3d0", 0.20)
		if p.current_state == "ANTICIPATE_PASS":
			col = Color("#7dd3fc", 0.28)
		elif p.current_state in ["OVERLAP_RUN", "BYLINE_DRIVE"]:
			col = Color("#c084fc", 0.24)
		elif p.current_state in ["BOX_NEAR_POST", "BOX_FAR_POST", "PENALTY_SPOT_RUN", "CUTBACK_ZONE_ATTACK"]:
			col = Color("#facc15", 0.22)
		elif p.current_state in ["KEEPER_DIVE", "KEEPER_CLAIM_CROSS"]:
			col = Color("#7dd3fc", 0.30)
		canvas.draw_line(a, b, col, 2.0)
		var dir: Vector2 = (b - a).normalized()
		var side: Vector2 = dir.orthogonal() * 4.0
		canvas.draw_line(b - dir * 9.0 + side, b, col, 2.0)
		canvas.draw_line(b - dir * 9.0 - side, b, col, 2.0)

func _draw_sequence_hints(canvas: Control, pitch: Rect2, pitch_mgr: PitchManager, players: Array[PlayerAgent]) -> void:
	for p in players:
		if p.sequence_role == SequenceRole.NONE or p.sequence_role == SequenceRole.GOALKEEPER:
			continue
		var pos: Vector2 = pitch_mgr.to_screen(pitch, p.pos)
		if p.sequence_role == SequenceRole.PRIMARY_PRESSER:
			canvas.draw_circle(pos, 17.0, Color("#ff6555", 0.22), false, 2.0)
		elif p.sequence_role == SequenceRole.COVER_SHADOW or p.sequence_role == SequenceRole.SECONDARY_COVER:
			canvas.draw_circle(pos, 15.0, Color("#60a5fa", 0.20), false, 1.8)
		elif p.sequence_role == SequenceRole.WIDTH_HOLDER:
			canvas.draw_line(pos + Vector2(-9.0, 0.0), pos + Vector2(9.0, 0.0), Color("#93c5fd", 0.22), 2.0)
		elif p.sequence_role == SequenceRole.REST_DEFENSE:
			canvas.draw_circle(pos, 13.0, Color("#cbd5e1", 0.12), false, 1.2)

func _dict_to_vec(v) -> Vector2:
	if typeof(v) == TYPE_DICTIONARY:
		return Vector2(float(v.get("x", 0.5)), float(v.get("y", 0.5)))
	return Vector2(0.5, 0.5)
