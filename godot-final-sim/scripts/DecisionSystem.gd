class_name DecisionSystem
extends RefCounted

var _state: int = 90210

func seed_from(value: String) -> void:
	var h: int = 2166136261
	for i in range(value.length()):
		h = int((h ^ value.unicode_at(i)) * 16777619) & 0x7fffffff
	_state = maxi(1, h)

func decide(owner: PlayerAgent, team: TeamController, opponent: TeamController, ball: MatchBall, score_diff: int, minute: float, phase: String = "", current_sequence: String = "") -> Dictionary:
	var pressure: float = opponent.pressure_on(owner.pos)
	var home: bool = team.side == 0
	var attack_goal_y: float = 0.06 if home else 0.94
	var dist_goal: float = abs(owner.pos.y - attack_goal_y)
	var lane_target: Vector2 = Vector2(clampf(owner.pos.x + (_randf() - 0.5) * 0.20, 0.12, 0.88), owner.pos.y + (-0.10 if home else 0.10))
	if owner.is_goalkeeper():
		return _safe_distribution(owner, team, pressure)
	if owner.is_defender() and (_is_in_own_third(owner, team.side) or pressure > 0.42):
		var defender_choice: Dictionary = _defender_distribution(owner, team, pressure)
		if not defender_choice.is_empty():
			return defender_choice

	var shoot_bias: float = 0.0
	var through_bias: float = 0.0
	var wide_bias: float = 0.0
	var dribble_bias: float = 0.0
	match phase:
		"build_up":
			wide_bias -= 0.08
			through_bias -= 0.10
		"progression":
			through_bias += 0.10
			dribble_bias += 0.04
		"wide_attack":
			wide_bias += 0.24
		"central_attack":
			through_bias += 0.20
			dribble_bias += 0.07
		"final_third":
			shoot_bias += 10.0
			through_bias += 0.12

	if dist_goal < 0.22 and owner.shooting + owner.technique * 0.4 + shoot_bias > 72.0 - pressure * 12.0:
		return {"type": "SHOOT", "target": Vector2(clampf(0.5 + (_randf() - 0.5) * 0.20, 0.38, 0.62), attack_goal_y), "receiver": null, "quality": owner.shooting / 100.0}

	var options: Array[Dictionary] = _pass_options(owner, team, opponent, pressure, phase, through_bias, wide_bias, current_sequence)
	if not options.is_empty():
		var selected: Dictionary = _weighted_pick(options)
		if selected["score"] > 0.38 or pressure > 0.48:
			return selected

	var safe: PlayerAgent = team.safe_option(owner, _randf())
	if pressure > 0.55 and safe != null:
		return {"type": "BACK_PASS", "target": _pass_target(owner, safe, pressure), "receiver": safe, "quality": owner.passing / 100.0}

	if _randf() < 0.40 + owner.technique * 0.002 + dribble_bias:
		return {"type": "DRIBBLE", "target": lane_target, "receiver": owner, "quality": owner.dribbling / 100.0}

	if safe != null:
		return {"type": "SHORT_PASS", "target": _pass_target(owner, safe, pressure), "receiver": safe, "quality": owner.passing / 100.0}

	return {"type": "HOLD_BALL", "target": owner.pos, "receiver": owner, "quality": owner.decision / 100.0}

func _safe_distribution(owner: PlayerAgent, team: TeamController, pressure: float) -> Dictionary:
	var safe: PlayerAgent = team.safe_option(owner, _randf())
	if safe != null:
		return {"type": "SHORT_PASS", "target": _pass_target(owner, safe, pressure), "receiver": safe, "quality": owner.passing / 100.0}
	var clearance_target: Vector2 = Vector2(clampf(owner.pos.x + (_randf() - 0.5) * 0.36, 0.15, 0.85), 0.22 if team.side == 0 else 0.78)
	return {"type": "LONG_PASS", "target": clearance_target, "receiver": null, "quality": maxf(0.35, owner.passing / 100.0)}

func _defender_distribution(owner: PlayerAgent, team: TeamController, pressure: float) -> Dictionary:
	var safe: PlayerAgent = team.safe_option(owner, _randf())
	if safe != null:
		var action_type: String = "SHORT_PASS"
		if _forward_progress(owner, safe, team.side) < -0.02:
			action_type = "BACK_PASS"
		return {"type": action_type, "target": _pass_target(owner, safe, pressure), "receiver": safe, "quality": owner.passing / 100.0}
	if pressure > 0.55:
		var clear_y: float = 0.24 if team.side == 0 else 0.76
		return {"type": "LONG_PASS", "target": Vector2(clampf(owner.pos.x, 0.18, 0.82), clear_y), "receiver": null, "quality": maxf(0.35, owner.passing / 100.0)}
	return {}

func _pass_options(owner: PlayerAgent, team: TeamController, opponent: TeamController, pressure: float, phase: String, through_bias: float, wide_bias: float, current_sequence: String) -> Array[Dictionary]:
	var options: Array[Dictionary] = []
	for receiver in team.players:
		if receiver == owner or receiver.is_goalkeeper():
			continue
		var type: String = "SHORT_PASS"
		if receiver.is_forward() and _forward_progress(owner, receiver, team.side) > 0.12:
			type = "THROUGH_BALL"
		elif receiver.role in ["LW", "RW", "LM", "RM", "LB", "RB", "LWB", "RWB"]:
			type = "PASS_TO_WING"
		elif _forward_progress(owner, receiver, team.side) < -0.05:
			type = "BACK_PASS"

		var distance: float = owner.pos.distance_to(receiver.pos)
		var distance_score: float = clampf(1.0 - distance / 0.62, 0.0, 1.0)
		var pressure_score: float = 1.0 - opponent.pressure_on(receiver.pos)
		var progress_score: float = clampf((_forward_progress(owner, receiver, team.side) + 0.18) / 0.50, 0.0, 1.0)
		var role_score: float = _role_priority(type, receiver)
		var lane_score: float = 1.0 - _lane_pressure(owner.pos, receiver.pos, opponent)
		var sequence_fit_score: float = _sequence_fit(type, receiver, current_sequence)
		var readability_score: float = _visual_readability(owner, receiver, type)
		var risk_penalty: float = (1.0 - owner.passing / 100.0) * distance * 0.75 + pressure * 0.18

		var score: float = distance_score * 0.17 + pressure_score * 0.16 + progress_score * 0.17 + role_score * 0.12 + lane_score * 0.18 + sequence_fit_score * 0.13 + readability_score * 0.07 - risk_penalty
		if type == "THROUGH_BALL":
			score += through_bias
		elif type == "PASS_TO_WING":
			score += wide_bias
		if phase == "build_up" and type == "BACK_PASS":
			score += 0.08
		options.append({
			"type": type,
			"target": _pass_target(owner, receiver, pressure),
			"receiver": receiver,
			"score": clampf(score, 0.0, 1.2),
			"quality": owner.passing / 100.0,
			"pass_lane_score": lane_score,
			"receiver_space_score": pressure_score,
			"sequence_fit_score": sequence_fit_score,
			"progression_score": progress_score,
			"risk_score": risk_penalty,
			"pressure_score": pressure,
			"role_score": role_score,
			"visual_readability_score": readability_score
		})
	options.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
		return float(a["score"]) > float(b["score"])
	)
	return options.slice(0, mini(5, options.size()))

func _weighted_pick(options: Array[Dictionary]) -> Dictionary:
	var total: float = 0.0
	for o in options:
		total += maxf(0.04, float(o["score"]))
	var roll: float = _randf() * total
	var acc: float = 0.0
	for o in options:
		acc += maxf(0.04, float(o["score"]))
		if roll <= acc:
			return o
	return options[0]

func _forward_progress(owner: PlayerAgent, receiver: PlayerAgent, side: int) -> float:
	return owner.pos.y - receiver.pos.y if side == 0 else receiver.pos.y - owner.pos.y

func _is_in_own_third(player: PlayerAgent, side: int) -> bool:
	return player.pos.y > 0.64 if side == 0 else player.pos.y < 0.36

func _role_priority(type: String, receiver: PlayerAgent) -> float:
	match type:
		"THROUGH_BALL":
			return 0.95 if receiver.is_forward() else 0.45
		"PASS_TO_WING":
			return 0.95 if receiver.role in ["LW", "RW", "LM", "RM", "LB", "RB", "LWB", "RWB"] else 0.35
		"BACK_PASS":
			return 0.70 if receiver.is_defender() or receiver.role == "DM" else 0.42
		_:
			return 0.62 + receiver.teamwork * 0.003

func _sequence_fit(type: String, receiver: PlayerAgent, current_sequence: String) -> float:
	match current_sequence:
		TacticalDirector.ATTACK_LEFT:
			if receiver.role in ["LW", "LM", "LB", "LWB"]:
				return 1.0
			if type == "THROUGH_BALL" and receiver.is_forward():
				return 0.76
			return 0.35
		TacticalDirector.ATTACK_RIGHT:
			if receiver.role in ["RW", "RM", "RB", "RWB"]:
				return 1.0
			if type == "THROUGH_BALL" and receiver.is_forward():
				return 0.76
			return 0.35
		TacticalDirector.BUILD_UP_CENTER:
			if receiver.role in ["DM", "CM", "AM"]:
				return 0.92
			if type == "LONG_PASS":
				return 0.22
			return 0.55
		TacticalDirector.DIRECT_LONG_BALL:
			if type in ["LONG_PASS", "THROUGH_BALL"] and receiver.is_forward():
				return 1.0
			if receiver.is_midfielder():
				return 0.62
			return 0.34
		TacticalDirector.RECYCLE_POSSESSION:
			if type == "BACK_PASS" or receiver.is_defender() or receiver.role == "DM":
				return 0.96
			return 0.34
		TacticalDirector.CROSS_SEQUENCE, TacticalDirector.CUTBACK_SEQUENCE, TacticalDirector.FINAL_THIRD_COMBINATION:
			if receiver.is_forward() or receiver.role in ["AM", "LW", "RW"]:
				return 0.92
			return 0.48
	return 0.55

func _visual_readability(owner: PlayerAgent, receiver: PlayerAgent, type: String) -> float:
	var distance: float = owner.pos.distance_to(receiver.pos)
	var lateral: float = abs(owner.pos.x - receiver.pos.x)
	var vertical: float = abs(owner.pos.y - receiver.pos.y)
	if type == "BACK_PASS":
		return clampf(0.55 + distance, 0.0, 1.0)
	if type == "PASS_TO_WING":
		return clampf(lateral * 1.4 + 0.25, 0.0, 1.0)
	if type == "THROUGH_BALL" or type == "LONG_PASS":
		return clampf(vertical * 1.35 + 0.20, 0.0, 1.0)
	return clampf(distance * 1.8, 0.0, 1.0)

func _lane_pressure(from_pos: Vector2, to_pos: Vector2, opponent: TeamController) -> float:
	var pressure: float = 0.0
	var seg: Vector2 = to_pos - from_pos
	var len_sq: float = maxf(0.0001, seg.length_squared())
	for p in opponent.players:
		var t: float = clampf((p.pos - from_pos).dot(seg) / len_sq, 0.0, 1.0)
		var closest: Vector2 = from_pos + seg * t
		var d: float = p.pos.distance_to(closest)
		if d < 0.085:
			pressure += (0.085 - d) / 0.085
	return clampf(pressure / 2.0, 0.0, 1.0)

func _pass_target(owner: PlayerAgent, receiver: PlayerAgent, pressure: float) -> Vector2:
	var error: float = (1.0 - owner.passing / 100.0) * 0.055 + pressure * 0.035
	var jitter: Vector2 = Vector2((_randf() - 0.5) * error, (_randf() - 0.5) * error)
	return receiver.pos + jitter

func _randf() -> float:
	_state = int((_state ^ (_state << 13)) & 0x7fffffff)
	_state = int((_state ^ (_state >> 17)) & 0x7fffffff)
	_state = int((_state ^ (_state << 5)) & 0x7fffffff)
	return float(_state & 0x7fffffff) / float(0x7fffffff)
