class_name TacticalDirector
extends RefCounted

const BUILD_UP_CENTER: String = AttackingSequence.BUILD_UP_CENTER
const ATTACK_LEFT: String = AttackingSequence.ATTACK_LEFT
const ATTACK_RIGHT: String = AttackingSequence.ATTACK_RIGHT
const DIRECT_LONG_BALL: String = AttackingSequence.DIRECT_LONG_BALL
const COUNTER_ATTACK: String = AttackingSequence.COUNTER_ATTACK
const RECYCLE_POSSESSION: String = AttackingSequence.RECYCLE_POSSESSION
const FINAL_THIRD_COMBINATION: String = AttackingSequence.FINAL_THIRD_COMBINATION
const CROSS_SEQUENCE: String = AttackingSequence.CROSS_SEQUENCE
const CUTBACK_SEQUENCE: String = AttackingSequence.CUTBACK_SEQUENCE
const SHOT_SEQUENCE: String = AttackingSequence.SHOT_SEQUENCE
const LOOSE_BALL_CONTEST: String = AttackingSequence.LOOSE_BALL_CONTEST

var zone_manager: ZoneManager = ZoneManager.new()
var current_sequence: String = BUILD_UP_CENTER
var current_attacking_sequence: String = BUILD_UP_CENTER
var current_defensive_scheme: String = DefensiveScheme.MID_BLOCK
var sequence_phase: String = AttackingSequence.PREPARE
var sequence_timer: float = 0.0
var sequence_duration: float = 5.5
var sequence_min_duration: float = 4.0
var sequence_max_duration: float = 8.0
var min_sequence_duration: float = 4.0
var possession_team_id: int = -1
var previous_possession_team_id: int = -1
var active_players: Array[PlayerAgent] = []
var support_players: Array[PlayerAgent] = []
var width_players: Array[PlayerAgent] = []
var runner_players: Array[PlayerAgent] = []
var rest_defense_players: Array[PlayerAgent] = []
var primary_presser: PlayerAgent = null
var secondary_cover: PlayerAgent = null
var match_clock: float = 0.0
var local_participation_radius: float = 0.34

func update(home: TeamController, away: TeamController, ball: MatchBall, delta: float, forced_sequence: String = "", forced_defensive_scheme: String = "") -> void:
	match_clock += delta
	sequence_timer += delta
	previous_possession_team_id = possession_team_id
	possession_team_id = _possession_team(ball)
	var sequence_restarted: bool = false
	if _should_start_new_sequence(ball, forced_sequence):
		current_attacking_sequence = _choose_sequence(ball, forced_sequence)
		current_sequence = current_attacking_sequence
		current_defensive_scheme = forced_defensive_scheme if _is_valid_defensive_scheme(forced_defensive_scheme) else _choose_defensive_scheme(ball)
		sequence_timer = 0.0
		sequence_duration = _duration_for(current_attacking_sequence)
		sequence_restarted = true
	elif _is_valid_defensive_scheme(forced_defensive_scheme):
		current_defensive_scheme = forced_defensive_scheme
	_update_sequence_phase(ball)
	var hard_role_refresh: bool = sequence_restarted or possession_team_id != previous_possession_team_id
	_clear_sequence_data(home, hard_role_refresh)
	_clear_sequence_data(away, hard_role_refresh)
	if possession_team_id == 0:
		_assign_attack_roles(home, ball)
		_refresh_attack_slot_targets(home, away, ball)
		_assign_defense_roles(away, ball)
		_refresh_defense_slot_targets(away, home, ball)
	elif possession_team_id == 1:
		_assign_attack_roles(away, ball)
		_refresh_attack_slot_targets(away, home, ball)
		_assign_defense_roles(home, ball)
		_refresh_defense_slot_targets(home, away, ball)
	else:
		current_attacking_sequence = LOOSE_BALL_CONTEST
		current_sequence = LOOSE_BALL_CONTEST
		current_defensive_scheme = DefensiveScheme.RECOVERY_RUN
		sequence_phase = AttackingSequence.BROKEN
		_assign_loose_roles(home, ball)
		_assign_loose_roles(away, ball)
		_refresh_defense_slot_targets(home, away, ball)
		_refresh_defense_slot_targets(away, home, ball)

func sequence_offset(player: PlayerAgent, ball: MatchBall) -> Vector2:
	if player.sequence_role == SequenceRole.NONE:
		return Vector2.ZERO
	if player.assigned_slot != "" and player.slot_target_position != Vector2.ZERO:
		return player.slot_target_position - player.base_pos
	if player.sequence_role in [
		SequenceRole.PRIMARY_PRESSER,
		SequenceRole.SECONDARY_COVER,
		SequenceRole.COVER_SHADOW,
		SequenceRole.PASS_LANE_BLOCKER,
		SequenceRole.BALL_SIDE_FULLBACK_PRESS,
		SequenceRole.BALL_SIDE_MIDFIELD_COVER,
		SequenceRole.WEAK_SIDE_COMPACTNESS,
		SequenceRole.WEAK_SIDE_COMPACT,
		SequenceRole.LINE_HOLDER,
		SequenceRole.DEFENSIVE_LINE_HOLDER,
		SequenceRole.MIDFIELD_SCREEN,
		SequenceRole.BOX_PROTECTOR,
		SequenceRole.RUNNER_MARKER
	]:
		return zone_manager.get_defensive_zone_for_role(player.sequence_role, ball.pos, player.team_id) - player.base_pos
	var target: Vector2 = zone_manager.get_support_zone_for_role(player.sequence_role, current_attacking_sequence, player.team_id)
	if current_attacking_sequence == CROSS_SEQUENCE:
		target = _cross_sequence_target(player, ball)
	elif current_attacking_sequence == BUILD_UP_CENTER:
		target = _build_up_triangle_target(player, ball)
	elif current_attacking_sequence == DIRECT_LONG_BALL:
		target = _direct_long_ball_target(player, ball)
	if player.sequence_role == SequenceRole.ACTIVE_BALL_CARRIER:
		target = ball.owner.pos if ball.owner != null else ball.pos
	elif player.sequence_role == SequenceRole.BALANCE_HOLDER:
		target = Vector2(0.50, 0.58 if player.team_id == 0 else 0.42)
	elif player.sequence_role == SequenceRole.REST_DEFENSE:
		# Push defensive line up when ball is in opponent half
		var ball_y: float = ball.pos.y if ball != null else 0.5
		var base_rest_y: float
		if player.team_id == 0:
			# home defends bottom: rest line between 0.62 (pushed) and 0.78 (deep)
			base_rest_y = clampf(lerpf(0.78, 0.62, (0.5 - ball_y) / 0.35), 0.60, 0.80)
		else:
			# away defends top: rest line between 0.22 (pushed) and 0.38 (deep)
			base_rest_y = clampf(lerpf(0.22, 0.38, (ball_y - 0.5) / 0.35), 0.20, 0.40)
		target = Vector2(clampf(player.base_pos.x, 0.20, 0.80), base_rest_y)
	return target - player.base_pos

func _cross_sequence_target(player: PlayerAgent, ball: MatchBall) -> Vector2:
	var left_side: bool = ball.pos.x < 0.5
	var dir_y: float = -1.0 if player.team_id == 0 else 1.0
	match player.sequence_role:
		SequenceRole.WIDTH_HOLDER:
			return Vector2(0.08 if left_side else 0.92, clampf(ball.pos.y + dir_y * 0.04, 0.08, 0.92))
		SequenceRole.PRIMARY_SUPPORT:
			return Vector2(0.23 if left_side else 0.77, clampf(ball.pos.y - dir_y * 0.05, 0.08, 0.92))
		SequenceRole.SECONDARY_SUPPORT:
			return Vector2(0.45 if left_side else 0.55, 0.30 if player.team_id == 0 else 0.70)
		SequenceRole.DEPTH_RUNNER:
			return Vector2(0.48 if left_side else 0.52, 0.18 if player.team_id == 0 else 0.82)
		SequenceRole.BALANCE_HOLDER:
			return Vector2(0.68 if left_side else 0.32, 0.42 if player.team_id == 0 else 0.58)
		SequenceRole.REST_DEFENSE:
			return Vector2(clampf(player.base_pos.x, 0.30, 0.70), 0.74 if player.team_id == 0 else 0.26)
	return zone_manager.get_support_zone_for_role(player.sequence_role, current_attacking_sequence, player.team_id)

func _build_up_triangle_target(player: PlayerAgent, ball: MatchBall) -> Vector2:
	var dir_y: float = -1.0 if player.team_id == 0 else 1.0
	match player.sequence_role:
		SequenceRole.PRIMARY_SUPPORT:
			return Vector2(clampf(ball.pos.x - 0.105, 0.10, 0.90), clampf(ball.pos.y - dir_y * 0.075, 0.08, 0.92))
		SequenceRole.SECONDARY_SUPPORT:
			return Vector2(clampf(ball.pos.x + 0.105, 0.10, 0.90), clampf(ball.pos.y + dir_y * 0.035, 0.08, 0.92))
		SequenceRole.CUTBACK_OPTION:
			return Vector2(clampf(ball.pos.x, 0.12, 0.88), clampf(ball.pos.y - dir_y * 0.14, 0.08, 0.92))
		SequenceRole.WIDTH_HOLDER:
			return Vector2(0.08 if player.base_pos.x < 0.5 else 0.92, clampf(player.base_pos.y + dir_y * 0.03, 0.10, 0.90))
		SequenceRole.DEPTH_RUNNER:
			return Vector2(clampf(player.base_pos.x, 0.28, 0.72), 0.32 if player.team_id == 0 else 0.68)
	return zone_manager.get_support_zone_for_role(player.sequence_role, current_attacking_sequence, player.team_id)

func _direct_long_ball_target(player: PlayerAgent, ball: MatchBall) -> Vector2:
	if player.sequence_role == SequenceRole.DEPTH_RUNNER:
		return get_projected_run_target(player, ball.owner, DIRECT_LONG_BALL)
	if player.sequence_role == SequenceRole.SECONDARY_SUPPORT:
		return Vector2(clampf(ball.pos.x, 0.18, 0.82), 0.46 if player.team_id == 0 else 0.54)
	return zone_manager.get_support_zone_for_role(player.sequence_role, current_attacking_sequence, player.team_id)

func get_projected_run_target(runner: PlayerAgent, passer: PlayerAgent, sequence_type: String) -> Vector2:
	var dir_y: float = -1.0 if runner.team_id == 0 else 1.0
	var base: Vector2 = runner.pos
	var lead: float = 0.16
	if sequence_type == DIRECT_LONG_BALL:
		lead = 0.24
	elif sequence_type == CROSS_SEQUENCE:
		lead = 0.10
	var x_bias: float = (runner.base_pos.x - 0.5) * 0.10
	if passer != null:
		x_bias += (runner.pos.x - passer.pos.x) * 0.12
	return Vector2(clampf(base.x + x_bias, 0.08, 0.92), clampf(base.y + dir_y * lead, 0.06, 0.94))

func active_count_near_ball(team: TeamController, ball: MatchBall, radius: float = 0.32) -> int:
	var count: int = 0
	for p in team.players:
		if SequenceRole.is_active(p.sequence_role) and p.pos.distance_to(ball.pos) < radius:
			count += 1
	return count

func _possession_team(ball: MatchBall) -> int:
	if ball.owner != null:
		return ball.owner.team_id
	if ball.ball_state in [MatchBall.PASSING, MatchBall.CROSSING, MatchBall.SHOOTING]:
		return ball.last_touch_team
	return -1

func _should_start_new_sequence(ball: MatchBall, forced_sequence: String) -> bool:
	if possession_team_id != previous_possession_team_id:
		return true
	if ball.ball_state == MatchBall.LOOSE:
		return current_sequence != LOOSE_BALL_CONTEST
	if ball.ball_state == MatchBall.SHOOTING:
		return current_sequence != SHOT_SEQUENCE
	if forced_sequence in [CROSS_SEQUENCE, CUTBACK_SEQUENCE, DIRECT_LONG_BALL, SHOT_SEQUENCE] and forced_sequence != current_attacking_sequence:
		return sequence_timer >= 1.4
	if forced_sequence != "" and forced_sequence != current_attacking_sequence:
		return sequence_timer >= sequence_min_duration
	return sequence_timer >= sequence_duration or sequence_timer >= sequence_max_duration

func _choose_sequence(ball: MatchBall, forced_sequence: String) -> String:
	if ball.ball_state == MatchBall.LOOSE:
		return LOOSE_BALL_CONTEST
	if ball.ball_state == MatchBall.SHOOTING:
		return SHOT_SEQUENCE
	if forced_sequence in [BUILD_UP_CENTER, ATTACK_LEFT, ATTACK_RIGHT, DIRECT_LONG_BALL, COUNTER_ATTACK, RECYCLE_POSSESSION, FINAL_THIRD_COMBINATION, CROSS_SEQUENCE, CUTBACK_SEQUENCE, SHOT_SEQUENCE]:
		return forced_sequence
	if forced_sequence == "CROSS_FROM_LEFT" or forced_sequence == "CROSS_FROM_RIGHT":
		return CROSS_SEQUENCE
	var zone: Dictionary = zone_manager.get_zone(ball.pos, possession_team_id)
	if str(zone.get("third", "")) in [ZoneManager.PENALTY_AREA, ZoneManager.DANGER_ZONE]:
		return FINAL_THIRD_COMBINATION
	match zone_manager.get_attack_side(ball.pos):
		"LEFT":
			return ATTACK_LEFT
		"RIGHT":
			return ATTACK_RIGHT
	return BUILD_UP_CENTER

func _duration_for(sequence: String) -> float:
	match sequence:
		DIRECT_LONG_BALL, SHOT_SEQUENCE:
			return 4.2
		CROSS_SEQUENCE, CUTBACK_SEQUENCE:
			return 5.2
		LOOSE_BALL_CONTEST:
			return 1.5
	return 6.2

func _choose_defensive_scheme(ball: MatchBall) -> String:
	if ball.ball_state == MatchBall.LOOSE:
		return DefensiveScheme.RECOVERY_RUN
	if ball.ball_state == MatchBall.SHOOTING or _own_goal_danger_for_defense(ball) > 0.72:
		return DefensiveScheme.BOX_DEFENSE
	if sequence_timer < 1.2 and ball.last_touch_team != possession_team_id:
		return DefensiveScheme.COUNTER_PRESS
	if _own_goal_danger_for_defense(ball) > 0.56:
		return DefensiveScheme.BALL_SIDE_PRESS
	var zone: Dictionary = zone_manager.get_zone(ball.pos, possession_team_id)
	if str(zone.get("third", "")) == ZoneManager.OWN_THIRD:
		return DefensiveScheme.HIGH_PRESS
	if str(zone.get("third", "")) == ZoneManager.FINAL_THIRD:
		return DefensiveScheme.LOW_BLOCK
	return DefensiveScheme.MID_BLOCK

func _is_valid_defensive_scheme(scheme: String) -> bool:
	return scheme in [
		DefensiveScheme.MID_BLOCK,
		DefensiveScheme.HIGH_PRESS,
		DefensiveScheme.LOW_BLOCK,
		DefensiveScheme.BALL_SIDE_PRESS,
		DefensiveScheme.COMPACT_DEFENSE,
		DefensiveScheme.BOX_DEFENSE,
		DefensiveScheme.RECOVERY_RUN,
		DefensiveScheme.COUNTER_PRESS,
		DefensiveScheme.SET_PIECE_DEFENSE
	]

func _own_goal_danger_for_defense(ball: MatchBall) -> float:
	if possession_team_id == 0:
		return 1.0 - ball.pos.y
	if possession_team_id == 1:
		return ball.pos.y
	return 0.5

func _update_sequence_phase(ball: MatchBall) -> void:
	if ball.ball_state == MatchBall.LOOSE:
		sequence_phase = AttackingSequence.BROKEN
	elif current_attacking_sequence == RECYCLE_POSSESSION:
		sequence_phase = AttackingSequence.RECYCLE
	elif ball.ball_state in [MatchBall.PASSING, MatchBall.CROSSING, MatchBall.SHOOTING]:
		sequence_phase = AttackingSequence.FINAL_ACTION
	elif sequence_timer < 1.2:
		sequence_phase = AttackingSequence.PREPARE
	else:
		sequence_phase = AttackingSequence.PROGRESS

func _clear_sequence_data(team: TeamController, hard_refresh: bool) -> void:
	for p in team.players:
		p.sequence_target_offset = Vector2.ZERO
		if hard_refresh:
			p.sequence_role = SequenceRole.NONE
			p.assigned_slot = ""
			p.sequence_active = false
		else:
			p.sequence_active = SequenceRole.is_active(p.sequence_role)

func _assign_attack_roles(team: TeamController, ball: MatchBall) -> void:
	active_players.clear()
	support_players.clear()
	width_players.clear()
	runner_players.clear()
	rest_defense_players.clear()
	var carrier: PlayerAgent = ball.owner if ball.owner != null and ball.owner.team_id == team.side else team.nearest_to(ball.pos)
	for p in team.players:
		if p != carrier and p.sequence_role == SequenceRole.ACTIVE_BALL_CARRIER:
			p.sequence_role = SequenceRole.NONE
			p.assigned_slot = ""
			p.sequence_active = false
	if carrier != null:
		_set_role(carrier, SequenceRole.ACTIVE_BALL_CARRIER)
	var primary: PlayerAgent = _best_support(team, carrier, current_attacking_sequence, ball)
	if primary != null:
		_set_role(primary, SequenceRole.PRIMARY_SUPPORT)
	var secondary: PlayerAgent = _best_secondary(team, carrier, primary)
	if secondary != null:
		_set_role(secondary, SequenceRole.SECONDARY_SUPPORT)
	var width: PlayerAgent = _best_width(team, current_attacking_sequence, ball)
	if width != null:
		_set_role(width, SequenceRole.WIDTH_HOLDER)
	var runner: PlayerAgent = _best_runner(team, current_attacking_sequence, ball)
	if runner != null:
		_set_role(runner, SequenceRole.DEPTH_RUNNER)
	for p in team.players:
		if p.is_goalkeeper():
			_set_role(p, SequenceRole.GOALKEEPER)
		elif p.sequence_role == SequenceRole.NONE and (p.is_defender() or p.role == "DM"):
			_set_role(p, SequenceRole.REST_DEFENSE)
		elif p.sequence_role == SequenceRole.NONE and p.role in ["LW", "RW", "LM", "RM"]:
			_set_role(p, SequenceRole.FAR_SIDE_RUNNER)
		elif p.sequence_role == SequenceRole.NONE:
			_set_role(p, SequenceRole.BALANCE_HOLDER)
	_enforce_unique_attack_roles(team)

func _assign_defense_roles(team: TeamController, ball: MatchBall) -> void:
	var pressure_point: Vector2 = ball.owner.pos if ball.owner != null else ball.pos
	var ranked: Array[PlayerAgent] = []
	for p in team.players:
		if not p.is_goalkeeper():
			ranked.append(p)
	ranked.sort_custom(func(a: PlayerAgent, b: PlayerAgent) -> bool:
		return a.pos.distance_to(pressure_point) < b.pos.distance_to(pressure_point)
	)
	# Only allow pressing by players within pressing range; others hold shape
	var press_radius: float = 0.28
	var presser_assigned: bool = false
	var cover_assigned: bool = false
	for i in range(ranked.size()):
		var p: PlayerAgent = ranked[i]
		var dist: float = p.pos.distance_to(pressure_point)
		if not presser_assigned and p.role != "CB" and dist < press_radius:
			_set_role(p, SequenceRole.PRIMARY_PRESSER)
			primary_presser = p
			presser_assigned = true
		elif not cover_assigned and dist < press_radius * 1.5 and not p.role in ["CB", "LB", "RB"]:
			_set_role(p, SequenceRole.SECONDARY_COVER)
			secondary_cover = p
			cover_assigned = true
		elif p.role == "CB":
			_set_role(p, SequenceRole.BOX_PROTECTOR)
		elif p.is_defender():
			_set_role(p, SequenceRole.DEFENSIVE_LINE_HOLDER)
		elif p.role == "DM" or p.is_midfielder():
			_set_role(p, SequenceRole.MIDFIELD_SCREEN)
		else:
			_set_role(p, SequenceRole.WEAK_SIDE_COMPACT)
	for p in team.players:
		if p.is_goalkeeper():
			_set_role(p, SequenceRole.GOALKEEPER)

func _assign_loose_roles(team: TeamController, ball: MatchBall) -> void:
	var ranked: Array[PlayerAgent] = team.players.duplicate()
	ranked.sort_custom(func(a: PlayerAgent, b: PlayerAgent) -> bool:
		return a.pos.distance_to(ball.pos) < b.pos.distance_to(ball.pos)
	)
	for i in range(ranked.size()):
		var p: PlayerAgent = ranked[i]
		if p.is_goalkeeper():
			_set_role(p, SequenceRole.GOALKEEPER)
		elif i < 2:
			_set_role(p, SequenceRole.PRIMARY_PRESSER)
		elif p.is_defender():
			_set_role(p, SequenceRole.REST_DEFENSE)
		else:
			_set_role(p, SequenceRole.BALANCE_HOLDER)

func _set_role(player: PlayerAgent, role: String) -> void:
	var emergency: bool = player.has_ball or role in [SequenceRole.ACTIVE_BALL_CARRIER, SequenceRole.PRIMARY_PRESSER, SequenceRole.GOALKEEPER]
	if not player.assign_sequence_role(role, match_clock, _commit_for_role(role), emergency):
		return
	match role:
		SequenceRole.PRIMARY_SUPPORT, SequenceRole.SECONDARY_SUPPORT:
			support_players.append(player)
		SequenceRole.WIDTH_HOLDER:
			width_players.append(player)
		SequenceRole.DEPTH_RUNNER:
			runner_players.append(player)
		SequenceRole.REST_DEFENSE:
			rest_defense_players.append(player)
	if player.sequence_active:
		active_players.append(player)

func _best_support(team: TeamController, carrier: PlayerAgent, sequence: String, ball: MatchBall) -> PlayerAgent:
	var away: bool = team.side == 1
	var wanted: Array[String] = ["CM", "DM", "AM"]
	var attack_left: bool = sequence == ATTACK_LEFT or (sequence == CROSS_SEQUENCE and ball.pos.x < 0.5)
	var attack_right: bool = sequence == ATTACK_RIGHT or (sequence == CROSS_SEQUENCE and ball.pos.x >= 0.5)
	if away:
		var tmp: bool = attack_left; attack_left = attack_right; attack_right = tmp
	if attack_left:
		wanted = ["LB", "LWB", "LM", "LW", "CM"]
	elif attack_right:
		wanted = ["RB", "RWB", "RM", "RW", "CM"]
	return _best_by_roles(team, carrier, wanted, ball, "support")

func _best_secondary(team: TeamController, carrier: PlayerAgent, primary: PlayerAgent) -> PlayerAgent:
	var best: PlayerAgent = null
	var best_score: float = -999.0
	for p in team.players:
		if p == carrier or p == primary or p.is_goalkeeper():
			continue
		var score: float = 1.0 - p.pos.distance_to(carrier.pos if carrier != null else Vector2(0.5, 0.5))
		if p.is_midfielder():
			score += 0.25
		if score > best_score:
			best_score = score
			best = p
	return best

func _best_width(team: TeamController, sequence: String, ball: MatchBall) -> PlayerAgent:
	var away: bool = team.side == 1
	var wanted: Array[String] = ["LW", "RW", "LM", "RM", "LB", "RB"]
	var attack_left: bool = sequence == ATTACK_LEFT or (sequence == CROSS_SEQUENCE and ball.pos.x < 0.5)
	var attack_right: bool = sequence == ATTACK_RIGHT or (sequence == CROSS_SEQUENCE and ball.pos.x >= 0.5)
	if away:
		var tmp: bool = attack_left; attack_left = attack_right; attack_right = tmp
	if attack_left:
		wanted = ["LW", "LM", "LB", "LWB"]
	elif attack_right:
		wanted = ["RW", "RM", "RB", "RWB"]
	return _best_by_roles(team, null, wanted, ball, "width")

func _best_runner(team: TeamController, sequence: String, ball: MatchBall) -> PlayerAgent:
	var wanted: Array[String] = ["ST", "LW", "RW"]
	if sequence == DIRECT_LONG_BALL:
		wanted = ["ST", "LW", "RW", "AM"]
	return _best_by_roles(team, null, wanted, ball, "runner")

func _best_by_roles(team: TeamController, exclude: PlayerAgent, roles: Array[String], ball: MatchBall, slot_kind: String) -> PlayerAgent:
	var best: PlayerAgent = null
	var best_score: float = -999.0
	for p in team.players:
		if p == exclude or p.is_goalkeeper() or p.sequence_role != SequenceRole.NONE:
			continue
		var role_rank: int = roles.find(p.role)
		if role_rank < 0 and _role_family(p.role) != _role_family(str(roles[0])):
			continue
		var score: float = 2.0 - float(maxi(role_rank, 0)) * 0.18
		score += _local_participation_score(p, ball, slot_kind)
		score += p.positioning * 0.004 + p.teamwork * 0.003
		if p.previous_slot != "" and p.previous_slot.to_lower().contains(slot_kind):
			score += 0.18
		score -= _slot_congestion_penalty(team, p.pos)
		if score > best_score:
			best_score = score
			best = p
	return best

func _enforce_unique_attack_roles(team: TeamController) -> void:
	var unique_roles: Array[String] = [
		SequenceRole.ACTIVE_BALL_CARRIER,
		SequenceRole.PRIMARY_SUPPORT,
		SequenceRole.SECONDARY_SUPPORT,
		SequenceRole.WIDTH_HOLDER,
		SequenceRole.DEPTH_RUNNER,
		SequenceRole.CUTBACK_OPTION
	]
	var seen: Dictionary = {}
	for p in team.players:
		if not p.sequence_role in unique_roles:
			continue
		if not seen.has(p.sequence_role):
			seen[p.sequence_role] = p
			continue
		p.sequence_role = SequenceRole.BALANCE_HOLDER
		p.assigned_slot = ""
		p.sequence_active = false
		p.role_commit_until = match_clock

func _refresh_attack_slot_targets(team: TeamController, opponent: TeamController, ball: MatchBall) -> void:
	var rest_index: int = 0
	var balance_index: int = 0
	var far_index: int = 0
	for p in team.players:
		if p.sequence_role == SequenceRole.NONE:
			continue
		var slot: String = _attack_slot_name(p, rest_index, balance_index, far_index, ball)
		if p.sequence_role == SequenceRole.REST_DEFENSE:
			rest_index += 1
		elif p.sequence_role == SequenceRole.BALANCE_HOLDER:
			balance_index += 1
		elif p.sequence_role == SequenceRole.FAR_SIDE_RUNNER:
			far_index += 1
		var target: Vector2 = _attack_slot_target(p, team, opponent, ball, slot)
		var emergency: bool = p.has_ball or p.sequence_role == SequenceRole.ACTIVE_BALL_CARRIER
		p.assign_slot(slot, target, match_clock, _commit_for_role(p.sequence_role), emergency)

func _refresh_defense_slot_targets(team: TeamController, opponent: TeamController, ball: MatchBall) -> void:
	var line_index: int = 0
	var box_index: int = 0
	var screen_index: int = 0
	var weak_index: int = 0
	var presser_index: int = 0
	var cover_index: int = 0
	for p in team.players:
		if p.sequence_role == SequenceRole.NONE:
			continue
		var slot: String = _defense_slot_name(p, line_index, box_index, screen_index, weak_index, presser_index, cover_index)
		if p.sequence_role in [SequenceRole.DEFENSIVE_LINE_HOLDER, SequenceRole.LINE_HOLDER]:
			line_index += 1
		elif p.sequence_role == SequenceRole.BOX_PROTECTOR:
			box_index += 1
		elif p.sequence_role == SequenceRole.MIDFIELD_SCREEN:
			screen_index += 1
		elif p.sequence_role == SequenceRole.WEAK_SIDE_COMPACT:
			weak_index += 1
		elif p.sequence_role == SequenceRole.PRIMARY_PRESSER:
			presser_index += 1
		elif p.sequence_role in [SequenceRole.SECONDARY_COVER, SequenceRole.COVER_SHADOW, SequenceRole.PASS_LANE_BLOCKER]:
			cover_index += 1
		var target: Vector2 = _defense_slot_target(p, team, opponent, ball, slot)
		p.assign_slot(slot, target, match_clock, _commit_for_role(p.sequence_role), p.sequence_role == SequenceRole.PRIMARY_PRESSER)

func _attack_slot_name(player: PlayerAgent, rest_index: int, balance_index: int, far_index: int, ball: MatchBall) -> String:
	match player.sequence_role:
		SequenceRole.ACTIVE_BALL_CARRIER:
			return "BALL_CARRIER"
		SequenceRole.PRIMARY_SUPPORT:
			return "PRIMARY_SUPPORT_DIAGONAL"
		SequenceRole.SECONDARY_SUPPORT:
			return "SECONDARY_SUPPORT_REVERSE"
		SequenceRole.WIDTH_HOLDER:
			return "WIDTH_LEFT" if _active_lane_left(player, ball) else "WIDTH_RIGHT"
		SequenceRole.DEPTH_RUNNER:
			return "DEPTH_RUNNER"
		SequenceRole.FAR_SIDE_RUNNER:
			return "FAR_SIDE_THREAT_%d" % far_index
		SequenceRole.CUTBACK_OPTION:
			return "CUTBACK_OPTION"
		SequenceRole.REST_DEFENSE:
			return "REST_DEFENDER_%d" % player.id
		SequenceRole.BALANCE_HOLDER:
			return "BALANCE_HOLDER_%d" % player.id
	return player.sequence_role

func _defense_slot_name(player: PlayerAgent, line_index: int, box_index: int, screen_index: int, weak_index: int, presser_index: int, cover_index: int) -> String:
	match player.sequence_role:
		SequenceRole.PRIMARY_PRESSER:
			return "PRIMARY_PRESSER_%d" % presser_index
		SequenceRole.SECONDARY_COVER, SequenceRole.COVER_SHADOW, SequenceRole.PASS_LANE_BLOCKER:
			return "COVER_SHADOW_%d" % cover_index
		SequenceRole.MIDFIELD_SCREEN:
			return "MIDFIELD_SCREEN_%d" % screen_index
		SequenceRole.BOX_PROTECTOR:
			return "BOX_PROTECTOR_%d" % box_index
		SequenceRole.DEFENSIVE_LINE_HOLDER, SequenceRole.LINE_HOLDER:
			return "CENTER_BACK_HOLDER_%d" % line_index
		SequenceRole.WEAK_SIDE_COMPACT:
			return "WEAK_SIDE_COMPACT_%d" % weak_index
		SequenceRole.RUNNER_MARKER:
			return "RUNNER_MARKER_%d" % player.id
		SequenceRole.REST_DEFENSE:
			return "REST_DEFENSE_%d" % player.id
		SequenceRole.BALANCE_HOLDER:
			return "BALANCE_HOLDER_%d" % player.id
	return player.sequence_role

func _attack_slot_target(player: PlayerAgent, team: TeamController, opponent: TeamController, ball: MatchBall, slot: String) -> Vector2:
	var dir: float = -1.0 if team.side == 0 else 1.0
	var anchor: Vector2 = ball.owner.pos if ball.owner != null else ball.pos
	var lane_left: bool = _active_lane_left(player, ball)
	var lane_x: float = 0.08 if lane_left else 0.92
	var half_x: float = 0.30 if lane_left else 0.70
	match slot:
		"BALL_CARRIER":
			return anchor
		"PRIMARY_SUPPORT_DIAGONAL":
			var primary_side: float = -1.0 if anchor.x >= 0.5 else 1.0
			return _clamp_slot(anchor + Vector2(primary_side * 0.095, -dir * 0.060))
		"SECONDARY_SUPPORT_REVERSE":
			var secondary_side: float = 1.0 if anchor.x >= 0.5 else -1.0
			return _clamp_slot(anchor + Vector2(secondary_side * 0.120, dir * 0.032))
		"WIDTH_LEFT", "WIDTH_RIGHT":
			return _clamp_slot(Vector2(lane_x, anchor.y + dir * 0.045))
		"DEPTH_RUNNER":
			var run_y: float = anchor.y + dir * (0.17 if current_attacking_sequence != DIRECT_LONG_BALL else 0.24)
			var line_y: float = opponent.offside_line_y
			if ball.ball_state == MatchBall.OWNED:
				run_y = maxf(run_y, line_y + 0.026) if team.side == 0 else minf(run_y, line_y - 0.026)
			var run_x: float = clampf(player.base_pos.x + (player.base_pos.x - 0.5) * 0.10, 0.18, 0.82)
			return _clamp_slot(Vector2(run_x, run_y))
		"CUTBACK_OPTION":
			return _clamp_slot(Vector2(0.50, anchor.y - dir * 0.135))
		_:
			if slot.begins_with("BALANCE_HOLDER"):
				var balance_i: int = int(slot.get_slice("_", 2))
				var balance_x: float = 0.50 if balance_i % 2 == 0 else half_x
				var balance_depth: float = 0.145 if balance_i % 2 == 0 else 0.105
				return _clamp_slot(Vector2(balance_x, anchor.y - dir * balance_depth))
			if slot.begins_with("FAR_SIDE_THREAT"):
				var far_i: int = int(slot.get_slice("_", 3))
				var far_lane: float = 1.0 - lane_x
				return _clamp_slot(Vector2(clampf(far_lane + (float(far_i) - 0.5) * 0.045, 0.10, 0.90), anchor.y + dir * (0.100 + float(far_i % 2) * 0.040)))
			if slot.begins_with("REST_DEFENDER"):
				var rest_i: int = int(slot.get_slice("_", 2)) % 3
				var rest_x: float = clampf(0.35 + float(rest_i) * 0.15, 0.25, 0.75)
				var rest_y: float = clampf(anchor.y - dir * 0.27, 0.27, 0.73)
				return _clamp_slot(Vector2(rest_x, rest_y))
	return _clamp_slot(zone_manager.get_support_zone_for_role(player.sequence_role, current_attacking_sequence, team.side))

func _defense_slot_target(player: PlayerAgent, team: TeamController, opponent: TeamController, ball: MatchBall, slot: String) -> Vector2:
	var pressure: Vector2 = ball.owner.pos if ball.owner != null else ball.pos
	var own_goal_y: float = 0.88 if team.side == 0 else 0.12
	var cover_dir: float = 1.0 if team.side == 0 else -1.0
	var likely_target: Vector2 = ball.target_position
	if ball.target_player != null:
		likely_target = ball.target_player.pos
	elif opponent.players.size() > 0 and ball.owner != null:
		var option: PlayerAgent = opponent.best_forward_option(ball.owner, team, 0.4)
		if option != null:
			likely_target = option.pos
	if slot.begins_with("PRIMARY_PRESSER"):
		return _clamp_slot(pressure + Vector2(0.0, cover_dir * 0.012))
	if slot.begins_with("COVER_SHADOW"):
		return _clamp_slot(pressure.lerp(likely_target, 0.50) + Vector2(0.0, cover_dir * 0.026))
	if slot.begins_with("WEAK_SIDE_COMPACT"):
		var weak_x: float = 0.38 if pressure.x > 0.5 else 0.62
		return _clamp_slot(Vector2(weak_x, team.offside_line_y + cover_dir * 0.12))
	if slot.begins_with("RUNNER_MARKER"):
		return _clamp_slot(likely_target.lerp(Vector2(likely_target.x, own_goal_y), 0.25))
	if slot.begins_with("REST_DEFENSE"):
		return _clamp_slot(Vector2(clampf(player.base_pos.x, 0.24, 0.76), team.offside_line_y + cover_dir * 0.07))
	if slot.begins_with("BALANCE_HOLDER"):
		return _clamp_slot(Vector2(clampf(player.base_pos.x, 0.22, 0.78), team.offside_line_y + cover_dir * 0.17))
	match slot:
		_:
			if slot.begins_with("MIDFIELD_SCREEN"):
				var screen_i: int = int(slot.get_slice("_", 2))
				return _clamp_slot(Vector2(clampf(0.42 + float(screen_i) * 0.08, 0.34, 0.66), team.offside_line_y + cover_dir * 0.13))
			if slot.begins_with("BOX_PROTECTOR"):
				var box_i: int = int(slot.get_slice("_", 2))
				return _clamp_slot(Vector2(clampf(0.35 + float(box_i) * 0.10, 0.25, 0.75), team.offside_line_y + cover_dir * (0.035 + float(box_i % 2) * 0.026)))
			if slot.begins_with("CENTER_BACK_HOLDER"):
				var line_i: int = int(slot.get_slice("_", 3))
				var stagger: float = cover_dir * (0.018 if line_i % 2 == 0 else -0.012)
				return _clamp_slot(Vector2(clampf(player.base_pos.x, 0.22, 0.78), team.offside_line_y + stagger))
	return _clamp_slot(zone_manager.get_defensive_zone_for_role(player.sequence_role, ball.pos, team.side))

func _active_lane_left(player: PlayerAgent, ball: MatchBall) -> bool:
	# Away team has mirrored x positions; their "left" role is field's right
	var away: bool = player.team_id == 1
	if current_attacking_sequence == ATTACK_LEFT or (current_attacking_sequence == CROSS_SEQUENCE and ball.pos.x < 0.5):
		return !away
	if current_attacking_sequence == ATTACK_RIGHT or (current_attacking_sequence == CROSS_SEQUENCE and ball.pos.x >= 0.5):
		return away
	if player.role in ["LW", "LM", "LB", "LWB"]:
		return !away
	if player.role in ["RW", "RM", "RB", "RWB"]:
		return away
	return ball.pos.x < 0.5

func _local_participation_score(player: PlayerAgent, ball: MatchBall, slot_kind: String) -> float:
	if slot_kind in ["width", "runner"]:
		return 0.08
	var d: float = player.pos.distance_to(ball.pos)
	if d <= local_participation_radius:
		return 0.32
	return -0.20 - clampf((d - local_participation_radius) * 0.70, 0.0, 0.25)

func _slot_congestion_penalty(team: TeamController, point: Vector2) -> float:
	var penalty: float = 0.0
	for p in team.players:
		if p.slot_target_position.distance_to(point) < 0.09:
			penalty += 0.10
	return penalty

func _commit_for_role(role: String) -> float:
	match role:
		SequenceRole.ACTIVE_BALL_CARRIER, SequenceRole.PRIMARY_PRESSER:
			return 0.55
		SequenceRole.DEPTH_RUNNER, SequenceRole.WIDTH_HOLDER, SequenceRole.FAR_SIDE_RUNNER:
			return 1.10
		SequenceRole.REST_DEFENSE, SequenceRole.BOX_PROTECTOR, SequenceRole.DEFENSIVE_LINE_HOLDER, SequenceRole.LINE_HOLDER:
			return 1.35
		SequenceRole.GOALKEEPER:
			return 1.50
	return 0.85

func _role_family(role: String) -> String:
	if role in ["CB", "LB", "RB", "LWB", "RWB", "WB"]:
		return "DEF"
	if role in ["DM", "CM", "AM", "LM", "RM"]:
		return "MID"
	if role in ["LW", "RW", "ST"]:
		return "FWD"
	return role

func _clamp_slot(point: Vector2) -> Vector2:
	return Vector2(clampf(point.x, 0.055, 0.945), clampf(point.y, 0.065, 0.935))
