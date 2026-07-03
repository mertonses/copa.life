class_name TeamController
extends RefCounted

var side: int = 0
var team_name: String = "Team"
var formation: String = "4-4-2"
var players: Array[PlayerAgent] = []
var tactic: TacticManager = TacticManager.new()
var keeper_ai: GoalkeeperAI = GoalkeeperAI.new()
var phase: String = "defense"
var team_phase: String = "DEFEND"
var defensive_line_y: float = 0.70
var offside_line_y: float = 0.70
var attacking_rest_line_y: float = 0.68
var team_compactness: float = 0.0
var pressing_player: PlayerAgent = null
var cover_player: PlayerAgent = null
var current_attack_pattern: String = "BUILD_UP_CENTER"
var forced_attack_pattern: String = ""
var tactical_director = null
var current_defensive_scheme: String = "MID_BLOCK"

func setup(new_side: int, new_name: String, new_formation: String, style: String) -> void:
	side = new_side
	team_name = new_name
	formation = new_formation
	tactic.configure(style)
	var fm: FormationManager = FormationManager.new()
	var roles: Array[String] = fm.roles_for(formation)
	var positions: Array[Vector2] = fm.positions_for(formation, side)
	players.clear()
	for i in range(roles.size()):
		var p: PlayerAgent = PlayerAgent.new()
		p.setup(i, side, roles[i], positions[i])
		players.append(p)

func has_ball(ball: MatchBall) -> bool:
	return ball.owner != null and ball.owner.team_id == side

func update_shape(ball: MatchBall, opponent: TeamController, delta: float, match_phase: String = "") -> void:
	team_phase = _strict_team_phase(ball)
	phase = match_phase if match_phase != "" else team_phase.to_lower()
	var in_possession: bool = team_phase == "ATTACK"
	var defending: bool = team_phase == "DEFEND" or team_phase == "TRANSITION_TO_DEFENSE"
	var loose_transition: bool = team_phase == "TRANSITION_TO_ATTACK"
	defensive_line_y = _defensive_line_y(ball)
	offside_line_y = OffsideManager.line_for(self)
	attacking_rest_line_y = _attacking_rest_line_y(ball)
	team_compactness = _team_compactness(ball)
	pressing_player = null
	cover_player = null
	_clear_player_frame_flags()
	if defending:
		if tactical_director != null:
			current_defensive_scheme = tactical_director.current_defensive_scheme
		assign_defensive_responsibilities(ball, opponent)
	if in_possession:
		if tactical_director != null:
			current_attack_pattern = tactical_director.current_attacking_sequence
		else:
			current_attack_pattern = forced_attack_pattern if forced_attack_pattern != "" else _attack_pattern(ball)

	for p in players:
		p.intent_label = phase
		if p.is_goalkeeper():
			keeper_ai.update_keeper(p, ball, in_possession)
			continue
		if p.assigned_slot != "" and p.slot_target_position != Vector2.ZERO:
			var slot_target: Vector2 = _slot_based_target(p, ball, opponent)
			slot_target = OffsideManager.clamp_attacking_target(slot_target, p, ball.pos, opponent)
			p.apply_tactical_target(_clamp_target(slot_target), _target_dead_zone(p))
			_apply_state_priority(p, ball)
			continue
		var target: Vector2 = get_formation_anchor(p)
		target = _apply_team_compactness(p, target, ball)
		var sequence_offset: Vector2 = get_sequence_role_offset(p, ball)
		var sequence_weight: float = _sequence_weight(p)
		target += sequence_offset
		target += get_ball_oriented_shift(p, ball) * (1.0 - sequence_weight * 0.55)
		target += get_team_phase_offset(p, ball)
		target += get_role_offset(p, ball) * (1.0 - sequence_weight * 0.45)
		target += get_attack_pattern_offset(p, ball) * (1.0 - sequence_weight * 0.65)
		target += get_local_behavior_offset(p, ball, opponent)
		target = OffsideManager.clamp_attacking_target(target, p, ball.pos, opponent)
		target += get_separation_offset(p) * 0.45
		p.apply_tactical_target(_clamp_target(target), _target_dead_zone(p))
		_apply_state_priority(p, ball)

func _clear_player_frame_flags() -> void:
	for p in players:
		p.clear_frame_flags()

func get_formation_anchor(player: PlayerAgent) -> Vector2:
	if team_phase == "DEFEND" or team_phase == "TRANSITION_TO_DEFENSE":
		var compact_x: float = lerpf(0.5, player.base_pos.x, _role_defensive_width(player))
		return Vector2(compact_x, player.base_pos.y)
	if team_phase == "ATTACK":
		var width: float = _role_attacking_width(player)
		return Vector2(lerpf(0.5, player.base_pos.x, width), player.base_pos.y)
	return player.base_pos

func get_sequence_role_offset(player: PlayerAgent, ball: MatchBall) -> Vector2:
	if tactical_director != null:
		var offset: Vector2 = tactical_director.sequence_offset(player, ball)
		player.sequence_target_offset = offset
		return offset
	return player.sequence_target_offset

func _sequence_weight(player: PlayerAgent) -> float:
	match player.sequence_role:
		SequenceRole.ACTIVE_BALL_CARRIER:
			return 0.35
		SequenceRole.PRIMARY_SUPPORT, SequenceRole.SECONDARY_SUPPORT, SequenceRole.WIDTH_HOLDER, SequenceRole.DEPTH_RUNNER, SequenceRole.FAR_SIDE_RUNNER, SequenceRole.CUTBACK_OPTION:
			return 0.85
		SequenceRole.REST_DEFENSE, SequenceRole.LINE_HOLDER, SequenceRole.DEFENSIVE_LINE_HOLDER, SequenceRole.BOX_PROTECTOR, SequenceRole.MIDFIELD_SCREEN, SequenceRole.WEAK_SIDE_COMPACT:
			return 0.70
		SequenceRole.PRIMARY_PRESSER, SequenceRole.SECONDARY_COVER, SequenceRole.COVER_SHADOW, SequenceRole.PASS_LANE_BLOCKER, SequenceRole.BALL_SIDE_FULLBACK_PRESS:
			return 0.90
	return 0.0

func get_ball_oriented_shift(player: PlayerAgent, ball: MatchBall) -> Vector2:
	var x_ratio: float = ball.pos.x * 2.0 - 1.0
	var y_ratio: float = ball.pos.y * 2.0 - 1.0
	var x_strength: float = _role_shift_x(player)
	var y_strength: float = _role_shift_y(player)
	if team_phase == "DEFEND":
		x_strength *= 0.70
		y_strength *= 0.55
	elif team_phase == "ATTACK":
		x_strength *= 1.05
		y_strength *= 0.85
	return Vector2(x_ratio * x_strength, y_ratio * y_strength)

func get_team_phase_offset(player: PlayerAgent, ball: MatchBall) -> Vector2:
	var dir: float = _attack_dir()
	match team_phase:
		"ATTACK":
			if player.is_forward():
				return Vector2(0.0, dir * 0.13)
			if player.is_midfielder():
				return Vector2(0.0, dir * 0.075)
			if player.is_defender():
				return Vector2(0.0, attacking_rest_line_y - player.base_pos.y)
		"DEFEND":
			if player.is_defender():
				return Vector2(0.0, defensive_line_y - player.base_pos.y)
			if player.is_midfielder():
				return Vector2(0.0, -dir * 0.09)
			if player.is_forward():
				return Vector2(0.0, -dir * 0.045)
		"TRANSITION_TO_ATTACK":
			if _is_one_of_two_nearest_to_ball(player, ball.pos):
				return ball.pos - player.base_pos
			return (ball.pos - player.base_pos) * 0.16
	return Vector2.ZERO

func get_role_offset(player: PlayerAgent, ball: MatchBall) -> Vector2:
	var dir: float = _attack_dir()
	var ball_on_own_side: bool = (ball.pos.x < 0.5 and player.base_pos.x < 0.5) or (ball.pos.x >= 0.5 and player.base_pos.x >= 0.5)
	match player.role:
		"LB", "LWB":
			if team_phase == "ATTACK" and ball_on_own_side:
				return Vector2(-0.04, dir * 0.075)
			if team_phase == "DEFEND" and not ball_on_own_side:
				return Vector2(0.08, 0.0)
		"RB", "RWB":
			if team_phase == "ATTACK" and ball_on_own_side:
				return Vector2(0.04, dir * 0.075)
			if team_phase == "DEFEND" and not ball_on_own_side:
				return Vector2(-0.08, 0.0)
		"DM":
			if team_phase == "DEFEND":
				return Vector2(0.0, -dir * 0.055)
		"AM":
			if team_phase == "ATTACK":
				return Vector2(0.0, dir * 0.08)
		"LW", "LM":
			return Vector2(-0.06 if team_phase == "ATTACK" else 0.06, dir * (0.05 if team_phase == "ATTACK" else -0.03))
		"RW", "RM":
			return Vector2(0.06 if team_phase == "ATTACK" else -0.06, dir * (0.05 if team_phase == "ATTACK" else -0.03))
		"ST":
			if team_phase == "ATTACK":
				return Vector2((player.base_pos.x - 0.5) * 0.10, dir * 0.10)
	return Vector2.ZERO

func get_attack_pattern_offset(player: PlayerAgent, ball: MatchBall) -> Vector2:
	if team_phase != "ATTACK":
		return Vector2.ZERO
	var dir: float = _attack_dir()
	match current_attack_pattern:
		"ATTACK_LEFT":
			if player.role in ["LB", "LWB", "LM", "LW"]:
				return Vector2(-0.15, dir * 0.09)
			if player.role in ["RW", "RM"]:
				return Vector2(-0.10, dir * 0.07)
			if player.role == "ST":
				return Vector2(-0.05, dir * 0.12)
		"ATTACK_RIGHT":
			if player.role in ["RB", "RWB", "RM", "RW"]:
				return Vector2(0.15, dir * 0.09)
			if player.role in ["LW", "LM"]:
				return Vector2(0.10, dir * 0.07)
			if player.role == "ST":
				return Vector2(0.05, dir * 0.12)
		"BUILD_UP_CENTER":
			if player.role in ["CM", "DM", "AM"]:
				var side_step: float = -0.065 if player.id % 2 == 0 else 0.065
				return Vector2(side_step, dir * 0.035)
		"DIRECT_LONG_BALL":
			if player.is_forward() or player.role in ["LW", "RW"]:
				return Vector2((player.base_pos.x - 0.5) * 0.08, dir * 0.20)
			if player.is_midfielder():
				return Vector2(0.0, dir * 0.07)
		"RECYCLE_POSSESSION":
			if player.is_defender() or player.role == "DM":
				return Vector2(0.0, -dir * 0.09)
		"COUNTER_ATTACK":
			if player.is_forward() or player.role in ["LW", "RW"]:
				return Vector2((player.base_pos.x - 0.5) * 0.12, dir * 0.24)
		"CROSS_FROM_LEFT":
			if player.role in ["LB", "LWB", "LM", "LW"]:
				return Vector2(-0.18, dir * 0.08)
			if player.is_forward() or player.role == "RW":
				return Vector2(0.04, dir * 0.15)
		"CROSS_FROM_RIGHT":
			if player.role in ["RB", "RWB", "RM", "RW"]:
				return Vector2(0.18, dir * 0.08)
			if player.is_forward() or player.role == "LW":
				return Vector2(-0.04, dir * 0.15)
	return Vector2.ZERO

func get_local_behavior_offset(player: PlayerAgent, ball: MatchBall, opponent: TeamController) -> Vector2:
	if player.has_ball:
		return player.pos - get_formation_anchor(player)
	if ball.target_player == player:
		player.is_receive_target = true
		return ball.target_position - get_formation_anchor(player)
	if ball.ball_state == "LOOSE" and _is_one_of_two_nearest_to_ball(player, ball.pos):
		player.is_loose_contender = true
		return ball.pos - get_formation_anchor(player)
	if player == pressing_player:
		player.is_primary_presser = true
		return _press_target(ball) - get_formation_anchor(player)
	if player == cover_player:
		player.is_secondary_cover = true
		return _passing_lane_cover_target(ball, opponent) - get_formation_anchor(player)
	if team_phase == "ATTACK" and _near_ball_support(player, ball):
		var side_step: float = 0.075 if player.id % 2 == 0 else -0.075
		return Vector2(side_step, _attack_dir() * 0.035) * 0.45
	return Vector2.ZERO

func get_separation_offset(player: PlayerAgent) -> Vector2:
	var force: Vector2 = Vector2.ZERO
	for other in players:
		if other == player:
			continue
		var d: float = player.pos.distance_to(other.pos)
		if d > 0.001 and d < 0.055:
			force += (player.pos - other.pos).normalized() * (0.055 - d) * 0.85
	return force

func _apply_state_priority(player: PlayerAgent, ball: MatchBall) -> void:
	if player.has_ball:
		player.current_state = "DRIBBLE"
	elif player.sequence_role == SequenceRole.PRIMARY_PRESSER:
		player.current_state = "PRESS"
		player.defensive_task = PlayerAgent.DefensiveTask.PRESS_BALL
	elif player.sequence_role in [SequenceRole.SECONDARY_COVER, SequenceRole.COVER_SHADOW, SequenceRole.PASS_LANE_BLOCKER]:
		player.current_state = "COVER_PASSING_LANE"
		player.defensive_task = PlayerAgent.DefensiveTask.COVER_PASSING_LANE
	elif player.sequence_role == SequenceRole.DEPTH_RUNNER:
		player.current_state = "MAKE_RUN"
	elif player.sequence_role == SequenceRole.FAR_SIDE_RUNNER:
		player.current_state = "FAR_SIDE_RUN"
	elif player.sequence_role == SequenceRole.CUTBACK_OPTION:
		player.current_state = "CUTBACK_OPTION"
	elif player.sequence_role == SequenceRole.WIDTH_HOLDER:
		player.current_state = "HOLD_WIDTH"
	elif player.sequence_role == SequenceRole.REST_DEFENSE:
		player.current_state = "REST_DEFENSE"
	elif player.sequence_role in [SequenceRole.DEFENSIVE_LINE_HOLDER, SequenceRole.LINE_HOLDER]:
		player.current_state = "LINE_HOLDER"
	elif player.sequence_role in [SequenceRole.BOX_PROTECTOR, SequenceRole.MIDFIELD_SCREEN, SequenceRole.WEAK_SIDE_COMPACT]:
		player.current_state = player.sequence_role
	elif player.is_receive_target:
		player.current_state = "RECEIVE_PASS"
	elif player.is_loose_contender:
		player.current_state = "CHASE_LOOSE_BALL"
	elif player.is_primary_presser:
		player.current_state = "PRESS"
		player.defensive_task = PlayerAgent.DefensiveTask.PRESS_BALL
	elif player.is_secondary_cover:
		player.current_state = "COVER_PASSING_LANE"
		player.defensive_task = PlayerAgent.DefensiveTask.COVER_PASSING_LANE
	elif team_phase == "DEFEND":
		player.current_state = "HOLD_DEFENSIVE_SHAPE"
		player.defensive_task = PlayerAgent.DefensiveTask.PROTECT_BOX if player.is_defender() and _own_goal_danger(ball) > 0.62 else PlayerAgent.DefensiveTask.HOLD_BLOCK
	elif team_phase == "ATTACK" and (player.is_forward() or current_attack_pattern in ["ATTACK_LEFT", "ATTACK_RIGHT", "DIRECT_LONG_BALL", "COUNTER_ATTACK"]):
		player.current_state = "MAKE_RUN" if player.is_forward() else "SUPPORT_ATTACK"
	elif team_phase == "ATTACK":
		player.current_state = "SUPPORT_ATTACK"
	else:
		player.current_state = "MOVE_TO_SHAPE"

func _strict_team_phase(ball: MatchBall) -> String:
	if ball.ball_state == "OUT_OF_PLAY":
		return "SET_PIECE"
	if ball.owner != null:
		return "ATTACK" if ball.owner.team_id == side else "DEFEND"
	if ball.ball_state in ["PASSING", "CROSSING", "SHOOTING"]:
		return "ATTACK" if ball.last_touch_team == side else "DEFEND"
	if ball.ball_state == "LOOSE":
		return "TRANSITION_TO_ATTACK"
	return "DEFEND"

func assign_defensive_responsibilities(ball: MatchBall, opponent: TeamController) -> void:
	pressing_player = null
	cover_player = null
	var pressure_point: Vector2 = _press_target(ball)
	var ranked: Array[PlayerAgent] = []
	for p in players:
		if p.is_goalkeeper():
			continue
		if p.role == "CB" and _own_goal_danger(ball) > 0.58:
			continue
		ranked.append(p)
	if ranked.is_empty():
		for p in players:
			if not p.is_goalkeeper():
				ranked.append(p)
	ranked.sort_custom(func(a: PlayerAgent, b: PlayerAgent) -> bool:
		return a.pos.distance_to(pressure_point) < b.pos.distance_to(pressure_point)
	)
	if ranked.size() > 0:
		pressing_player = ranked[0]
	if ranked.size() > 1:
		cover_player = ranked[1]
	for p in players:
		if p.is_goalkeeper():
			p.defensive_task = PlayerAgent.DefensiveTask.NONE
		elif p == pressing_player:
			p.defensive_task = PlayerAgent.DefensiveTask.PRESS_BALL
		elif p == cover_player:
			p.defensive_task = PlayerAgent.DefensiveTask.COVER_PASSING_LANE
		elif p.is_defender() and _own_goal_danger(ball) > 0.62:
			p.defensive_task = PlayerAgent.DefensiveTask.PROTECT_BOX
		else:
			p.defensive_task = PlayerAgent.DefensiveTask.HOLD_BLOCK

func _attack_dir() -> float:
	return -1.0 if side == 0 else 1.0

func _clamp_target(target: Vector2) -> Vector2:
	return Vector2(clampf(target.x, 0.045, 0.955), clampf(target.y, 0.055, 0.945))

func _slot_based_target(player: PlayerAgent, ball: MatchBall, opponent: TeamController) -> Vector2:
	var target: Vector2 = player.slot_target_position
	target += _small_zone_adjustment(player, ball)
	target += _small_pressure_adjustment(player, ball, opponent)
	target += get_separation_offset(player) * 0.18
	return target

func _small_zone_adjustment(player: PlayerAgent, ball: MatchBall) -> Vector2:
	if player.sequence_role in [SequenceRole.ACTIVE_BALL_CARRIER, SequenceRole.PRIMARY_PRESSER, SequenceRole.DEPTH_RUNNER, SequenceRole.WIDTH_HOLDER]:
		return Vector2.ZERO
	var adjust: Vector2 = Vector2.ZERO
	if team_phase == "ATTACK" and (player.is_defender() or player.role == "DM"):
		adjust.y = (attacking_rest_line_y - player.slot_target_position.y) * 0.10
	elif team_phase == "DEFEND" and player.is_defender():
		adjust.y = (defensive_line_y - player.slot_target_position.y) * 0.08
	if player.sequence_role in [SequenceRole.BALANCE_HOLDER, SequenceRole.MIDFIELD_SCREEN]:
		adjust.x = (clampf(ball.pos.x, 0.25, 0.75) - player.slot_target_position.x) * 0.08
	return adjust

func _small_pressure_adjustment(player: PlayerAgent, ball: MatchBall, opponent: TeamController) -> Vector2:
	if player.has_ball or player.sequence_role in [SequenceRole.PRIMARY_PRESSER, SequenceRole.COVER_SHADOW, SequenceRole.SECONDARY_COVER]:
		return Vector2.ZERO
	var pressure: float = opponent.pressure_on(player.slot_target_position)
	if pressure <= 0.18:
		return Vector2.ZERO
	var away_from_ball: Vector2 = player.slot_target_position - ball.pos
	if away_from_ball.length() < 0.01:
		away_from_ball = Vector2(player.base_pos.x - 0.5, 0.0)
	return away_from_ball.normalized() * clampf(pressure * 0.018, 0.0, 0.026)

func _target_dead_zone(player: PlayerAgent) -> float:
	if player.is_goalkeeper() or player.is_defender():
		return 0.020
	if player.sequence_role in [SequenceRole.DEPTH_RUNNER, SequenceRole.PRIMARY_PRESSER]:
		return 0.010
	if player.sequence_active:
		return 0.014
	return 0.018

func _apply_team_compactness(player: PlayerAgent, target: Vector2, ball: MatchBall) -> Vector2:
	var compact_x: float = lerpf(target.x, ball.pos.x, team_compactness * _role_compact_x(player))
	var compact_y: float = target.y
	if team_phase == "ATTACK":
		if player.is_defender() or player.role == "DM":
			compact_y = lerpf(target.y, attacking_rest_line_y, 0.72)
		elif player.is_midfielder():
			compact_y = lerpf(target.y, ball.pos.y + _attack_dir() * 0.06, 0.34)
		elif player.is_forward():
			compact_y = lerpf(target.y, ball.pos.y + _attack_dir() * 0.18, 0.22)
	elif team_phase == "DEFEND" or team_phase == "TRANSITION_TO_DEFENSE":
		if player.is_defender():
			compact_y = lerpf(target.y, defensive_line_y, 0.68)
		elif player.is_midfielder():
			compact_y = lerpf(target.y, defensive_line_y + _attack_dir() * 0.12, 0.44)
		elif player.is_forward():
			compact_y = lerpf(target.y, defensive_line_y + _attack_dir() * 0.24, 0.30)
	return Vector2(compact_x, compact_y)

func _role_compact_x(player: PlayerAgent) -> float:
	if player.role in ["LB", "RB", "LWB", "RWB", "LM", "RM", "LW", "RW"]:
		return 0.24
	if player.is_midfielder():
		return 0.36
	if player.is_defender():
		return 0.28
	return 0.30

func _team_compactness(ball: MatchBall) -> float:
	if team_phase == "DEFEND" or team_phase == "TRANSITION_TO_DEFENSE":
		return 0.42
	if team_phase == "ATTACK":
		return 0.22
	return 0.32

func _attacking_rest_line_y(ball: MatchBall) -> float:
	if side == 0:
		return clampf(ball.pos.y + 0.28, 0.54, 0.72)
	return clampf(ball.pos.y - 0.28, 0.28, 0.46)

func _role_defensive_width(player: PlayerAgent) -> float:
	if player.is_defender():
		return 0.52
	if player.is_midfielder():
		return 0.62
	if player.is_forward():
		return 0.48
	return 0.50

func _role_attacking_width(player: PlayerAgent) -> float:
	if player.role in ["LB", "RB", "LWB", "RWB", "LM", "RM", "LW", "RW"]:
		return 1.18
	if player.is_forward():
		return 0.82
	if player.is_midfielder():
		return 0.88
	return 0.72

func _role_shift_x(player: PlayerAgent) -> float:
	if player.is_defender():
		return 0.075
	if player.is_midfielder():
		return 0.115
	if player.role in ["LM", "RM", "LW", "RW", "LB", "RB", "LWB", "RWB"]:
		return 0.155
	return 0.105

func _role_shift_y(player: PlayerAgent) -> float:
	if player.is_defender():
		return 0.045
	if player.is_midfielder():
		return 0.070
	if player.is_forward():
		return 0.090
	return 0.045

func _press_target(ball: MatchBall) -> Vector2:
	return ball.owner.pos if ball.owner != null else ball.pos

func _near_ball_support(player: PlayerAgent, ball: MatchBall) -> bool:
	return not player.is_goalkeeper() and not player.has_ball and player.pos.distance_to(ball.pos) < 0.32

func pressure_on(point: Vector2) -> float:
	var pressure: float = 0.0
	for p in players:
		var d: float = p.pos.distance_to(point)
		if d < 0.16:
			pressure += (0.16 - d) / 0.16
	return clampf(pressure / 2.4, 0.0, 1.0)

func nearest_to(point: Vector2) -> PlayerAgent:
	var best: PlayerAgent = null
	var best_d: float = 999.0
	for p in players:
		var d: float = p.pos.distance_to(point)
		if d < best_d:
			best_d = d
			best = p
	return best

func best_forward_option(owner: PlayerAgent, opponent: TeamController, r: float) -> PlayerAgent:
	var best: PlayerAgent = null
	var best_score: float = -999.0
	var home: bool = side == 0
	for p in players:
		if p == owner or p.is_goalkeeper():
			continue
		var forward_gain: float = (owner.pos.y - p.pos.y) if home else (p.pos.y - owner.pos.y)
		var space: float = 1.0 - opponent.pressure_on(p.pos)
		var score: float = forward_gain * 2.4 + space + p.vision * 0.004 + r * 0.08
		if score > best_score and forward_gain > -0.04:
			best_score = score
			best = p
	return best

func best_wide_option(owner: PlayerAgent, r: float) -> PlayerAgent:
	var best: PlayerAgent = null
	var best_score: float = -999.0
	for p in players:
		if p == owner or p.is_goalkeeper():
			continue
		var width_score: float = abs(p.pos.x - 0.5) + (1.0 - owner.pos.distance_to(p.pos)) * 0.25 + r * 0.05
		if width_score > best_score:
			best_score = width_score
			best = p
	return best

func safe_option(owner: PlayerAgent, r: float) -> PlayerAgent:
	var best: PlayerAgent = null
	var best_score: float = -999.0
	for p in players:
		if p == owner or p.is_goalkeeper():
			continue
		var d: float = owner.pos.distance_to(p.pos)
		var score: float = 1.0 - d + p.passing * 0.002 + r * 0.04
		if d < 0.32 and score > best_score:
			best_score = score
			best = p
	return best

func _attack_push(p: PlayerAgent) -> float:
	if p.is_forward():
		return 0.13
	if p.is_midfielder():
		return 0.08
	return 0.035

func _apply_attack_phase(p: PlayerAgent, target: Vector2, ball: MatchBall, attack_dir: float) -> Vector2:
	match phase:
		"build_up":
			if p.is_defender() or p.role == "DM":
				target.y -= attack_dir * 0.035
			if p.is_midfielder():
				target.y += attack_dir * 0.015
		"progression":
			if p.is_midfielder():
				target.y += attack_dir * 0.055
			if p.is_forward():
				target.y += attack_dir * 0.075
		"wide_attack":
			var side_bias: float = -1.0 if ball.pos.x < 0.5 else 1.0
			if p.role in ["LM", "RM", "LW", "RW", "WB", "LB", "RB"]:
				target.x = clampf(target.x + side_bias * 0.10, 0.06, 0.94)
				target.y += attack_dir * 0.070
			elif p.is_forward():
				target.x = clampf(0.50 + (p.base_pos.x - 0.5) * 0.35, 0.20, 0.80)
				target.y += attack_dir * 0.10
		"central_attack":
			target.x = lerpf(target.x, 0.5, 0.45)
			if p.is_midfielder() or p.is_forward():
				target.y += attack_dir * 0.085
		"final_third":
			if p.is_forward():
				target.y += attack_dir * 0.13
				target.x = clampf(target.x + (p.base_pos.x - 0.5) * 0.16, 0.15, 0.85)
			elif p.is_midfielder():
				target.y += attack_dir * 0.075
			elif p.is_defender():
				target.y += attack_dir * 0.025
	return target

func _apply_attack_pattern(p: PlayerAgent, target: Vector2, attack_dir: float) -> Vector2:
	match current_attack_pattern:
		"ATTACK_LEFT":
			if p.role in ["LB", "LWB", "LM", "LW"]:
				target.x = clampf(target.x - 0.18, 0.05, 0.92)
				target.y += attack_dir * 0.085
			elif p.is_forward():
				target.x = clampf(target.x - 0.08, 0.10, 0.90)
		"ATTACK_RIGHT":
			if p.role in ["RB", "RWB", "RM", "RW"]:
				target.x = clampf(target.x + 0.18, 0.08, 0.95)
				target.y += attack_dir * 0.085
			elif p.is_forward():
				target.x = clampf(target.x + 0.08, 0.10, 0.90)
		"DIRECT_LONG_BALL", "COUNTER_ATTACK":
			if p.is_forward():
				target.y += attack_dir * 0.22
			if p.is_midfielder():
				target.y += attack_dir * 0.10
		"RECYCLE_POSSESSION":
			if p.is_defender() or p.role == "DM":
				target.y -= attack_dir * 0.08
		"CROSS_FROM_LEFT":
			if p.is_forward() or p.role == "RW":
				target.y += attack_dir * 0.14
				target.x = lerpf(target.x, 0.55, 0.45)
		"CROSS_FROM_RIGHT":
			if p.is_forward() or p.role == "LW":
				target.y += attack_dir * 0.14
				target.x = lerpf(target.x, 0.45, 0.45)
	return target

func _apply_defense_phase(p: PlayerAgent, target: Vector2, ball: MatchBall, attack_dir: float) -> Vector2:
	target.x = lerpf(target.x, 0.5, 0.24)
	if phase == "press" and not p.is_goalkeeper() and p.distance_to_ball(ball.pos) < 0.34:
		target = p.pos.lerp(ball.pos, 0.58 + tactic.pressing * 0.24)
	if _own_goal_danger(ball) < 0.30:
		if side == 0:
			target.y = maxf(target.y, 0.62 if p.is_defender() else 0.52)
		else:
			target.y = minf(target.y, 0.38 if p.is_defender() else 0.48)
	return target

func _defense_drop(p: PlayerAgent, ball: MatchBall) -> float:
	if p.is_forward():
		return 0.05
	if p.is_midfielder():
		return 0.10
	return 0.03

func _defensive_line_y(ball: MatchBall) -> float:
	if side == 0:
		return clampf(maxf(0.58, ball.pos.y + 0.16), 0.58, 0.79)
	return clampf(minf(0.42, ball.pos.y - 0.16), 0.21, 0.42)

func _make_passing_angle(p: PlayerAgent, ball: MatchBall, target: Vector2) -> Vector2:
	var side_step: float = 0.08 if p.id % 2 == 0 else -0.08
	var support: Vector2 = target
	if p.pos.distance_to(ball.pos) < 0.22:
		support.x = clampf(target.x + side_step, 0.08, 0.92)
	return support

func _team_phase_from_context(ball: MatchBall, in_possession: bool, defending: bool) -> String:
	if ball.ball_state == "OUT_OF_PLAY":
		return "SET_PIECE"
	if in_possession:
		if ball.loose_timer < 0.45:
			return "TRANSITION_TO_ATTACK"
		return "ATTACK"
	if defending:
		if ball.last_touch_team == side and ball.loose_timer < 1.4:
			return "TRANSITION_TO_DEFENSE"
		return "DEFEND"
	return "TRANSITION_TO_DEFENSE"

func _assign_pressing_roles(ball: MatchBall, opponent: TeamController) -> void:
	var pressure_point: Vector2 = ball.pos
	if ball.owner != null:
		pressure_point = ball.owner.pos
	var ranked: Array[PlayerAgent] = players.duplicate()
	ranked.sort_custom(func(a: PlayerAgent, b: PlayerAgent) -> bool:
		return a.pos.distance_to(pressure_point) < b.pos.distance_to(pressure_point)
	)
	for p in ranked:
		if not p.is_goalkeeper():
			pressing_player = p
			break
	for p in ranked:
		if p != pressing_player and not p.is_goalkeeper():
			cover_player = p
			break

func _passing_lane_cover_target(ball: MatchBall, opponent: TeamController) -> Vector2:
	var owner: PlayerAgent = ball.owner
	if owner == null:
		return ball.pos
	var likely: PlayerAgent = opponent.best_forward_option(owner, self, 0.5)
	if ball.target_player != null:
		likely = ball.target_player
	elif likely == null:
		likely = opponent.safe_option(owner, 0.5)
	return ball.pos if likely == null else owner.pos.lerp(likely.pos, 0.55)

func _is_one_of_two_nearest_to_ball(player: PlayerAgent, ball_pos: Vector2) -> bool:
	var ranked: Array[PlayerAgent] = players.duplicate()
	ranked.sort_custom(func(a: PlayerAgent, b: PlayerAgent) -> bool:
		return a.pos.distance_to(ball_pos) < b.pos.distance_to(ball_pos)
	)
	return ranked.find(player) >= 0 and ranked.find(player) < 2

func _own_goal_danger(ball: MatchBall) -> float:
	return ball.pos.y if side == 1 else 1.0 - ball.pos.y

func _attack_pattern(ball: MatchBall) -> String:
	if phase == "build_up":
		return "BUILD_UP_CENTER"
	if phase == "wide_attack":
		if ball.pos.x < 0.5:
			return "ATTACK_LEFT" if ball.pos.y > 0.24 and ball.pos.y < 0.76 else "CROSS_FROM_LEFT"
		return "ATTACK_RIGHT" if ball.pos.y > 0.24 and ball.pos.y < 0.76 else "CROSS_FROM_RIGHT"
	if phase == "central_attack":
		return "BUILD_UP_CENTER"
	if phase == "final_third":
		return "CROSS_FROM_LEFT" if ball.pos.x < 0.36 else ("CROSS_FROM_RIGHT" if ball.pos.x > 0.64 else "DIRECT_LONG_BALL")
	if phase == "progression" and tactic.directness > 0.68:
		return "DIRECT_LONG_BALL"
	if team_phase == "TRANSITION_TO_ATTACK":
		return "COUNTER_ATTACK"
	return "RECYCLE_POSSESSION" if tactic.tempo < 0.45 else "BUILD_UP_CENTER"
