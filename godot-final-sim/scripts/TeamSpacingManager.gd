class_name TeamSpacingManager
extends RefCounted

var max_active_near_ball: int = 4
var local_bubble_radius: float = 0.26

func apply_spacing_rules(team: TeamController, ball: MatchBall, director: TacticalDirector) -> void:
	limit_players_in_local_bubble(team, ball.pos, 4 if director.possession_team_id == team.side else 3)
	limit_active_players_near_ball(team, ball, max_active_near_ball)
	keep_width_holders_wide(team)
	maintain_rest_defense(team)
	prevent_midfield_blob(team)
	maintain_line_separation(team)
	maintain_defensive_line_integrity(team)
	maintain_team_block_compactness(team, ball)
	prevent_same_lane_blob(team)

func limit_players_in_local_bubble(team: TeamController, bubble_center: Vector2, max_players: int) -> void:
	var nearby: Array[PlayerAgent] = []
	for p in team.players:
		if p.is_goalkeeper():
			continue
		if p.pos.distance_to(bubble_center) < local_bubble_radius:
			nearby.append(p)
	nearby.sort_custom(func(a: PlayerAgent, b: PlayerAgent) -> bool:
		if a.sequence_active != b.sequence_active:
			return a.sequence_active
		return a.pos.distance_to(bubble_center) < b.pos.distance_to(bubble_center)
	)
	for i in range(max_players, nearby.size()):
		var p: PlayerAgent = nearby[i]
		if _is_ball_action_locked(p):
			continue
		if not p.sequence_active:
			p.current_state = "HOLD_SHAPE"

func limit_active_players_near_ball(team: TeamController, ball: MatchBall, max_count: int) -> void:
	var active: Array[PlayerAgent] = []
	for p in team.players:
		if p.sequence_active and p.pos.distance_to(ball.pos) < 0.34:
			active.append(p)
	active.sort_custom(func(a: PlayerAgent, b: PlayerAgent) -> bool:
		return a.pos.distance_to(ball.pos) < b.pos.distance_to(ball.pos)
	)
	for i in range(max_count, active.size()):
		var p: PlayerAgent = active[i]
		if _is_ball_action_locked(p):
			continue
		p.sequence_active = false
		p.current_state = "HOLD_SHAPE"

func keep_width_holders_wide(team: TeamController) -> void:
	for p in team.players:
		if p.sequence_role == SequenceRole.WIDTH_HOLDER or p.sequence_role == SequenceRole.FAR_SIDE_RUNNER:
			if _is_ball_action_locked(p):
				continue
			var wide_x: float = 0.08 if p.base_pos.x < 0.5 else 0.92
			if p.sequence_role == SequenceRole.FAR_SIDE_RUNNER:
				wide_x = 0.22 if p.base_pos.x < 0.5 else 0.78
			p.apply_tactical_target(Vector2(lerpf(p.target.x, wide_x, 0.22), p.target.y), 0.016)

func maintain_rest_defense(team: TeamController) -> void:
	for p in team.players:
		if p.sequence_role == SequenceRole.REST_DEFENSE:
			if _is_ball_action_locked(p):
				continue
			var safe_y: float = maxf(p.target.y, 0.68) if team.side == 0 else minf(p.target.y, 0.32)
			p.apply_tactical_target(Vector2(lerpf(p.target.x, p.base_pos.x, 0.18), safe_y), 0.018)

func prevent_midfield_blob(team: TeamController) -> void:
	var mids: Array[PlayerAgent] = []
	for p in team.players:
		if p.is_midfielder():
			mids.append(p)
	for i in range(mids.size()):
		var p: PlayerAgent = mids[i]
		for j in range(i + 1, mids.size()):
			var other: PlayerAgent = mids[j]
			if p.target.distance_to(other.target) < 0.08:
				var sign: float = -1.0 if p.id < other.id else 1.0
				p.apply_tactical_target(Vector2(clampf(p.target.x + sign * 0.012, 0.06, 0.94), p.target.y), 0.010)
				other.apply_tactical_target(Vector2(other.target.x, clampf(other.target.y + sign * 0.010, 0.06, 0.94)), 0.010)

func maintain_line_separation(team: TeamController) -> void:
	for p in team.players:
		if _is_ball_action_locked(p):
			continue
		if p.sequence_role in [SequenceRole.PRIMARY_PRESSER, SequenceRole.COVER_SHADOW, SequenceRole.SECONDARY_COVER, SequenceRole.DEPTH_RUNNER, SequenceRole.WIDTH_HOLDER]:
			continue
		if p.is_defender():
			p.apply_tactical_target(Vector2(p.target.x, lerpf(p.target.y, 0.72 if team.side == 0 else 0.28, 0.06)), 0.018)
		elif p.is_midfielder():
			p.apply_tactical_target(Vector2(p.target.x, clampf(p.target.y, 0.38, 0.66)), 0.018)
		elif p.is_forward():
			p.apply_tactical_target(Vector2(p.target.x, minf(p.target.y, 0.40) if team.side == 0 else maxf(p.target.y, 0.60)), 0.018)

func maintain_defensive_line_integrity(team: TeamController) -> void:
	for p in team.players:
		if _is_ball_action_locked(p):
			continue
		if p.sequence_role in [SequenceRole.DEFENSIVE_LINE_HOLDER, SequenceRole.LINE_HOLDER, SequenceRole.BOX_PROTECTOR]:
			p.apply_tactical_target(Vector2(lerpf(p.target.x, p.base_pos.x, 0.10), lerpf(p.target.y, 0.72 if team.side == 0 else 0.28, 0.16)), 0.018)

func maintain_team_block_compactness(team: TeamController, ball: MatchBall) -> void:
	var center_x: float = clampf(ball.pos.x, 0.18, 0.82)
	var max_depth: float = 0.34 if team.team_phase == "ATTACK" else 0.28
	var anchor_y: float = ball.pos.y
	for p in team.players:
		if _is_ball_action_locked(p):
			continue
		if p.is_goalkeeper() or p.sequence_role in [SequenceRole.WIDTH_HOLDER, SequenceRole.FAR_SIDE_RUNNER]:
			continue
		if abs(p.target.y - anchor_y) > max_depth:
			var y_sign: float = 1.0 if p.target.y >= anchor_y else -1.0
			p.apply_tactical_target(Vector2(p.target.x, lerpf(p.target.y, anchor_y + y_sign * max_depth, 0.10)), 0.018)
		if p.is_midfielder() or p.sequence_role in [SequenceRole.BALANCE_HOLDER, SequenceRole.MIDFIELD_SCREEN]:
			p.apply_tactical_target(Vector2(lerpf(p.target.x, center_x, 0.035), p.target.y), 0.018)

func prevent_same_lane_blob(team: TeamController) -> void:
	for i in range(team.players.size()):
		var a: PlayerAgent = team.players[i]
		if a.is_goalkeeper():
			continue
		if _is_ball_action_locked(a):
			continue
		for j in range(i + 1, team.players.size()):
			var b: PlayerAgent = team.players[j]
			if b.is_goalkeeper():
				continue
			if _is_ball_action_locked(b):
				continue
			if abs(a.target.x - b.target.x) < 0.035 and abs(a.target.y - b.target.y) < 0.13:
				var push: float = 0.035 if a.id < b.id else -0.035
				a.apply_tactical_target(Vector2(clampf(a.target.x - push * 0.35, 0.05, 0.95), a.target.y), 0.010)
				b.apply_tactical_target(Vector2(clampf(b.target.x + push * 0.35, 0.05, 0.95), b.target.y), 0.010)

func _is_ball_action_locked(player: PlayerAgent) -> bool:
	return player.current_state in [
		"PREPARE_ACTION",
		"DRIBBLE",
		"RECEIVE_PASS",
		"CHASE_LOOSE_BALL",
		"POST_ACTION_SUPPORT",
		"SHOOT"
	]
