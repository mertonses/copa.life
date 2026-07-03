class_name MatchEventGenerator
extends RefCounted

const SequenceGeneratorScript = preload("res://scripts/SequenceGenerator.gd")

var _state: int = 1
var sequence_generator = SequenceGeneratorScript.new()

func generate(input: Dictionary) -> Dictionary:
	return _generate_sequence_first(input)

func _generate_sequence_first(input: Dictionary) -> Dictionary:
	_seed(str(input.get("seed", "2026")))
	var home_name: String = str(input.get("home_name", "copa.life XI"))
	var away_name: String = str(input.get("away_name", "Final Rakibi"))
	var home_power: float = float(input.get("home_power", 84.0))
	var away_power: float = float(input.get("away_power", 82.0))
	var style: String = str(input.get("style", "gegen"))
	var cards: Array = input.get("cards", [])
	var home_tactic: Dictionary = _tactic_weights(style, cards)
	var away_tactic: Dictionary = _tactic_weights("balanced", [])
	var score_home: int = 0
	var score_away: int = 0
	var momentum: float = clampf(50.0 + (home_power - away_power) * 0.45, 36.0, 64.0)
	var events: Array[Dictionary] = []
	var possession_team: int = 0
	var current_ball_pos: Vector2 = Vector2(0.5, 0.5)
	var minute: float = 0.0
	var chain_id: int = 0

	events.append(_restart_event(events.size(), chain_id, minute, possession_team, "KICK_OFF", current_ball_pos, _kickoff_target(possession_team), score_home, score_away))
	current_ball_pos = _kickoff_target(possession_team)
	minute = 0.45

	while minute < 90.0 and events.size() < 260:
		var team_power: float = home_power if possession_team == 0 else away_power
		var opp_power: float = away_power if possession_team == 0 else home_power
		var tactic: Dictionary = home_tactic if possession_team == 0 else away_tactic
		var phase: String = _phase_for_segment(possession_team, minute, momentum, tactic)
		var sequence_intent: String = _sequence_intent_for_context(phase, tactic, current_ball_pos, momentum, possession_team)
		var sequence_actions: Array[String] = _actions_for_sequence(sequence_intent, phase, tactic, current_ball_pos)
		var chain_origin_zone: String = _zone_name(current_ball_pos)
		var sequence_broken: bool = false
		chain_id += 1
		for chain_step in range(sequence_actions.size()):
			if minute >= 90.0:
				break
			var action: String = sequence_actions[chain_step]
			var event_phase: String = _phase_for_sequence_action(sequence_intent, action, phase)
			var start: Vector2 = _clamp_field(current_ball_pos)
			var end: Vector2 = _end_position(possession_team, event_phase, action, start, sequence_intent)
			var pressure: float = _sequence_pressure(sequence_intent, chain_step, team_power, opp_power)
			var success_prob: float = _sequence_success_probability(action, event_phase, sequence_intent, chain_step, team_power, opp_power, tactic, pressure)
			var success: bool = _randf() < success_prob
			var offside: bool = _offside_risk(action, event_phase, start, end) > _randf()
			if offside:
				success = false
			var goal: bool = false
			var danger: float = _danger_value(action, event_phase, success, team_power, opp_power)
			if action == "SHOOT":
				var goal_prob: float = clampf(0.04 + danger * 0.020 + (team_power - opp_power) * 0.004, 0.02, 0.38)
				goal = _randf() < goal_prob
				success = goal
				if goal:
					if possession_team == 0:
						score_home += 1
					else:
						score_away += 1
			var turnover: bool = not success and action != "SHOOT"
			var loss_reason: String = "OFFSIDE" if offside else _loss_reason(action, pressure, turnover)
			var attacking_sequence: String = _sequence_for_event_intent(sequence_intent, action, event_phase, start)
			var chain_stage: String = _chain_stage(chain_step, action, turnover, goal)
			var defensive_reaction: String = _defensive_reaction_for_event(action, event_phase, start, danger, pressure)
			var restart_type: String = _restart_type(action, loss_reason, end, goal)
			var xg: float = _xg_value(action, event_phase, start, end, pressure)
			var x_threat: float = _x_threat_value(action, start, end, success)
			var chance_type: String = _chance_type(action, event_phase, start, end, xg)
			var label: String = _label(possession_team, action, event_phase, success, goal)
			events.append({
				"id": events.size(),
				"chain_id": chain_id,
				"chain_step": chain_step,
				"minute": minute,
				"team": possession_team,
				"phase": event_phase,
				"pattern": _pattern_for_phase(event_phase, start),
				"attacking_sequence": attacking_sequence,
				"chain_intent": sequence_intent,
				"chain_stage": chain_stage,
				"chain_origin_zone": chain_origin_zone,
				"next_preferred_zone": _next_preferred_zone(attacking_sequence, possession_team, end),
				"defensive_reaction": defensive_reaction,
				"play_bubble_center": _pt(start),
				"play_bubble_radius": _play_bubble_radius_for(sequence_intent, action),
				"action": action,
				"release_type": _release_type(action, attacking_sequence),
				"actor_role": _actor_role(action, event_phase, start),
				"receiver_role": _receiver_role(action, event_phase, end),
				"projected_receiver_target": _pt(_projected_receiver_target(possession_team, action, end)),
				"start": _pt(start),
				"end": _pt(end),
				"path": _event_path(start, end, possession_team, action),
				"success": success,
				"turnover": turnover,
				"loss_reason": loss_reason,
				"restart_type": restart_type,
				"goal": goal,
				"danger": danger,
				"pressure": pressure,
				"pressure_source": _pressure_source(pressure, action),
				"xg": xg,
				"xThreat": x_threat,
				"chance_type": chance_type,
				"visual_intensity": _visual_intensity(action, event_phase, danger, goal, turnover),
				"engine_note": "sequence_first_weighted_event",
				"score_home": score_home,
				"score_away": score_away,
				"label": label
			})
			minute += _time_step_for_sequence_action(sequence_intent, action)
			if goal:
				possession_team = 1 - possession_team
				current_ball_pos = Vector2(0.5, 0.5)
				momentum = clampf(momentum + (-8.0 if possession_team == 0 else 8.0), 28.0, 72.0)
				chain_id += 1
				events.append(_restart_event(events.size(), chain_id, minute + 0.04, possession_team, "KICK_OFF", current_ball_pos, _kickoff_target(possession_team), score_home, score_away))
				current_ball_pos = _kickoff_target(possession_team)
				minute += 0.28
				sequence_broken = true
				break
			elif action == "SHOOT" and restart_type in ["GOAL_KICK", "CORNER"]:
				var shot_restart_action: String = _restart_action(restart_type, possession_team, end)
				if shot_restart_action == "CORNER":
					current_ball_pos = _corner_position(possession_team, end)
					var shot_corner_end: Vector2 = _corner_target(possession_team)
					events.append(_restart_event(events.size(), chain_id + 1, minute + 0.04, possession_team, shot_restart_action, current_ball_pos, shot_corner_end, score_home, score_away))
					current_ball_pos = shot_corner_end
				else:
					possession_team = 1 - possession_team
					current_ball_pos = _restart_start_for(possession_team, shot_restart_action, end)
					var shot_restart_end: Vector2 = _restart_end_for(possession_team, shot_restart_action, current_ball_pos)
					events.append(_restart_event(events.size(), chain_id + 1, minute + 0.04, possession_team, shot_restart_action, current_ball_pos, shot_restart_end, score_home, score_away))
					current_ball_pos = shot_restart_end
				momentum = clampf(momentum + (-2.0 if possession_team == 1 else 2.0), 28.0, 72.0)
				minute += 0.35
				sequence_broken = true
				break
			elif turnover:
				var restart_action: String = _restart_action(restart_type, possession_team, end)
				if restart_action == "CORNER":
					current_ball_pos = _corner_position(possession_team, end)
					var corner_end: Vector2 = _corner_target(possession_team)
					events.append(_restart_event(events.size(), chain_id + 1, minute + 0.04, possession_team, restart_action, current_ball_pos, corner_end, score_home, score_away))
					current_ball_pos = corner_end
				elif restart_action in ["GOAL_KICK_SHORT", "GOAL_KICK_LONG", "KEEPER_BUILD_UP", "KEEPER_LONG", "THROW_IN", "FREE_KICK_SHORT"]:
					possession_team = 1 - possession_team
					current_ball_pos = _restart_start_for(possession_team, restart_action, end)
					var restart_end: Vector2 = _restart_end_for(possession_team, restart_action, current_ball_pos)
					events.append(_restart_event(events.size(), chain_id + 1, minute + 0.04, possession_team, restart_action, current_ball_pos, restart_end, score_home, score_away))
					current_ball_pos = restart_end
				else:
					current_ball_pos = _clamp_field(end)
					possession_team = 1 - possession_team
				momentum = clampf(momentum + (-3.0 if possession_team == 1 else 3.0), 28.0, 72.0)
				minute += 0.20
				sequence_broken = true
				break
			else:
				current_ball_pos = _clamp_field(end)
				momentum = clampf(momentum + (0.9 if possession_team == 0 else -0.9), 28.0, 72.0)
		if not sequence_broken and _randf() < 0.18:
			possession_team = 1 - possession_team
			momentum = clampf(momentum + (-1.2 if possession_team == 1 else 1.2), 28.0, 72.0)

	events = sequence_generator.enrich(events)
	return {
		"home_name": home_name,
		"away_name": away_name,
		"home_power": home_power,
		"away_power": away_power,
		"score_home": score_home,
		"score_away": score_away,
		"format": "kopa_match_event_archive_v1",
		"deterministic_seed": str(input.get("seed", "2026")),
		"logic": "sequence_first_event_archive_visual_replay",
		"events": events
	}

func _generate_weighted_legacy(input: Dictionary) -> Dictionary:
	_seed(str(input.get("seed", "2026")))
	var home_name: String = str(input.get("home_name", "copa.life XI"))
	var away_name: String = str(input.get("away_name", "Final Rakibi"))
	var home_power: float = float(input.get("home_power", 84.0))
	var away_power: float = float(input.get("away_power", 82.0))
	var style: String = str(input.get("style", "gegen"))
	var cards: Array = input.get("cards", [])
	var home_tactic: Dictionary = _tactic_weights(style, cards)
	var away_tactic: Dictionary = _tactic_weights("balanced", [])
	var score_home: int = 0
	var score_away: int = 0
	var momentum: float = clampf(50.0 + (home_power - away_power) * 0.45, 36.0, 64.0)
	var events: Array[Dictionary] = []
	var possession_team: int = 0
	var chain_id: int = 0
	var chain_step: int = 0
	var last_phase: String = "kick_off"
	var current_ball_pos: Vector2 = Vector2(0.5, 0.5)
	var chain_intent: String = "BUILD_UP_CENTER"
	var chain_origin_zone: String = _zone_name(current_ball_pos)
	events.append(_restart_event(events.size(), chain_id, 0.0, possession_team, "KICK_OFF", current_ball_pos, _kickoff_target(possession_team), score_home, score_away))
	current_ball_pos = _kickoff_target(possession_team)

	for segment in range(1, 181):
		var minute: float = float(segment) * 0.5
		var team_power: float = home_power if possession_team == 0 else away_power
		var opp_power: float = away_power if possession_team == 0 else home_power
		var tactic: Dictionary = home_tactic if possession_team == 0 else away_tactic
		var phase: String = _phase_for_segment(possession_team, minute, momentum, tactic)
		if phase != last_phase or chain_step > 5:
			chain_id += 1
			chain_step = 0
			last_phase = phase
			chain_intent = _chain_intent_for_phase(phase, possession_team, current_ball_pos, tactic)
			chain_origin_zone = _zone_name(current_ball_pos)
		var action: String = _weighted_action(phase, tactic, team_power, opp_power)
		var phase_anchor: Vector2 = _start_position(possession_team, phase)
		var start_blend: float = 0.18 if chain_step > 0 else 0.34
		var start: Vector2 = _clamp_field(current_ball_pos.lerp(phase_anchor, start_blend))
		var end: Vector2 = _end_position(possession_team, phase, action, start)
		var visual_path: Array[Dictionary] = _event_path(start, end, possession_team, action)
		var actor_role: String = _actor_role(action, phase, start)
		var receiver_role: String = _receiver_role(action, phase, end)
		var pressure: float = clampf((opp_power - team_power) / 35.0 + _randf() * 0.35, 0.0, 1.0)
		var success_prob: float = _success_probability(action, phase, team_power, opp_power, tactic, pressure)
		var success: bool = _randf() < success_prob
		var offside: bool = _offside_risk(action, phase, start, end) > _randf()
		if offside:
			success = false
		var goal: bool = false
		var danger: float = _danger_value(action, phase, success, team_power, opp_power)

		if action == "SHOOT":
			var goal_prob: float = clampf(0.05 + danger * 0.020 + (team_power - opp_power) * 0.004, 0.03, 0.42)
			goal = _randf() < goal_prob
			success = goal
			if goal:
				if possession_team == 0:
					score_home += 1
				else:
					score_away += 1

		var turnover: bool = not success and action != "SHOOT"
		var loss_reason: String = "OFFSIDE" if offside else _loss_reason(action, pressure, turnover)
		var attacking_sequence: String = _sequence_for_event_intent(chain_intent, action, phase, start)
		var chain_stage: String = _chain_stage(chain_step, action, turnover, goal)
		var defensive_reaction: String = _defensive_reaction_for_event(action, phase, start, danger, pressure)
		var restart_type: String = _restart_type(action, loss_reason, end, goal)
		var xg: float = _xg_value(action, phase, start, end, pressure)
		var x_threat: float = _x_threat_value(action, start, end, success)
		var chance_type: String = _chance_type(action, phase, start, end, xg)
		var label: String = _label(possession_team, action, phase, success, goal)
		events.append({
			"id": events.size(),
			"chain_id": chain_id,
			"chain_step": chain_step,
			"minute": minute,
			"team": possession_team,
			"phase": phase,
			"pattern": _pattern_for_phase(phase, start),
			"attacking_sequence": attacking_sequence,
			"chain_intent": chain_intent,
			"chain_stage": chain_stage,
			"chain_origin_zone": chain_origin_zone,
			"next_preferred_zone": _next_preferred_zone(attacking_sequence, possession_team, end),
			"defensive_reaction": defensive_reaction,
			"play_bubble_center": _pt(start),
			"play_bubble_radius": 0.26,
			"action": action,
			"release_type": _release_type(action, attacking_sequence),
			"actor_role": actor_role,
			"receiver_role": receiver_role,
			"projected_receiver_target": _pt(_projected_receiver_target(possession_team, action, end)),
			"start": _pt(start),
			"end": _pt(end),
			"path": visual_path,
			"success": success,
			"turnover": turnover,
			"loss_reason": loss_reason,
			"restart_type": restart_type,
			"goal": goal,
			"danger": danger,
			"pressure": pressure,
			"pressure_source": _pressure_source(pressure, action),
			"xg": xg,
			"xThreat": x_threat,
			"chance_type": chance_type,
			"visual_intensity": _visual_intensity(action, phase, danger, goal, turnover),
			"engine_note": "weighted_event_not_scripted",
			"score_home": score_home,
			"score_away": score_away,
			"label": label
		})
		chain_step += 1

		if goal:
			possession_team = 1 - possession_team
			current_ball_pos = Vector2(0.5, 0.5)
			momentum = clampf(momentum + (-8.0 if possession_team == 0 else 8.0), 28.0, 72.0)
			chain_id += 1
			chain_step = 0
			events.append(_restart_event(events.size(), chain_id, minute + 0.05, possession_team, "KICK_OFF", current_ball_pos, _kickoff_target(possession_team), score_home, score_away))
			current_ball_pos = _kickoff_target(possession_team)
		elif action == "SHOOT" and restart_type in ["GOAL_KICK", "CORNER"]:
			var shot_restart_action: String = _restart_action(restart_type, possession_team, end)
			if shot_restart_action == "CORNER":
				current_ball_pos = _corner_position(possession_team, end)
				var shot_corner_end: Vector2 = _corner_target(possession_team)
				events.append(_restart_event(events.size(), chain_id + 1, minute + 0.05, possession_team, shot_restart_action, current_ball_pos, shot_corner_end, score_home, score_away))
				current_ball_pos = shot_corner_end
			else:
				possession_team = 1 - possession_team
				current_ball_pos = _restart_start_for(possession_team, shot_restart_action, end)
				var shot_restart_end: Vector2 = _restart_end_for(possession_team, shot_restart_action, current_ball_pos)
				events.append(_restart_event(events.size(), chain_id + 1, minute + 0.05, possession_team, shot_restart_action, current_ball_pos, shot_restart_end, score_home, score_away))
				current_ball_pos = shot_restart_end
			momentum = clampf(momentum + (-2.0 if possession_team == 1 else 2.0), 28.0, 72.0)
			chain_id += 1
			chain_step = 0
		elif turnover:
			var restart_action: String = _restart_action(restart_type, possession_team, end)
			if restart_action == "CORNER":
				current_ball_pos = _corner_position(possession_team, end)
				var corner_end: Vector2 = _corner_target(possession_team)
				events.append(_restart_event(events.size(), chain_id + 1, minute + 0.05, possession_team, restart_action, current_ball_pos, corner_end, score_home, score_away))
				current_ball_pos = corner_end
			elif restart_action in ["GOAL_KICK_SHORT", "GOAL_KICK_LONG", "KEEPER_BUILD_UP", "KEEPER_LONG", "THROW_IN", "FREE_KICK_SHORT"]:
				possession_team = 1 - possession_team
				current_ball_pos = _restart_start_for(possession_team, restart_action, end)
				var restart_end: Vector2 = _restart_end_for(possession_team, restart_action, current_ball_pos)
				events.append(_restart_event(events.size(), chain_id + 1, minute + 0.05, possession_team, restart_action, current_ball_pos, restart_end, score_home, score_away))
				current_ball_pos = restart_end
			else:
				current_ball_pos = _clamp_field(end)
				possession_team = 1 - possession_team
			momentum = clampf(momentum + (-3.0 if possession_team == 1 else 3.0), 28.0, 72.0)
			chain_id += 1
			chain_step = 0
		else:
			current_ball_pos = _clamp_field(end)
			momentum = clampf(momentum + (1.2 if possession_team == 0 else -1.2), 28.0, 72.0)

	events = sequence_generator.enrich(events)
	return {
		"home_name": home_name,
		"away_name": away_name,
		"home_power": home_power,
		"away_power": away_power,
		"score_home": score_home,
		"score_away": score_away,
		"format": "kopa_match_event_archive_v1",
		"deterministic_seed": str(input.get("seed", "2026")),
		"logic": "weighted_randomness_event_list_visual_replay",
		"events": events
	}

func _seed(seed_value: String) -> void:
	var h: int = 2166136261
	for i in range(seed_value.length()):
		h = int((h ^ seed_value.unicode_at(i)) * 16777619) & 0x7fffffff
	_state = maxi(1, h)

func _randf() -> float:
	_state = int((_state ^ (_state << 13)) & 0x7fffffff)
	_state = int((_state ^ (_state >> 17)) & 0x7fffffff)
	_state = int((_state ^ (_state << 5)) & 0x7fffffff)
	return float(_state & 0x7fffffff) / float(0x7fffffff)

func _sequence_intent_for_context(phase: String, tactic: Dictionary, ball_pos: Vector2, momentum: float, team: int) -> String:
	var team_momentum: float = momentum if team == 0 else 100.0 - momentum
	var roll: float = _randf()
	if phase == "build_up":
		if roll < 0.08 or (float(tactic["directness"]) > 0.64 and roll < 0.22):
			return AttackingSequence.DIRECT_LONG_BALL
		return AttackingSequence.BUILD_UP_CENTER
	if phase == "wide_attack":
		return AttackingSequence.ATTACK_LEFT if ball_pos.x < 0.50 else AttackingSequence.ATTACK_RIGHT
	if phase == "central_attack":
		return AttackingSequence.BUILD_UP_CENTER if roll < 0.66 else AttackingSequence.FINAL_THIRD_COMBINATION
	if phase == "final_third":
		if roll < 0.28:
			return AttackingSequence.CUTBACK_SEQUENCE
		if roll < 0.52:
			return AttackingSequence.CROSS_SEQUENCE
		return AttackingSequence.FINAL_THIRD_COMBINATION
	if team_momentum > 58.0 and roll < 0.18:
		return AttackingSequence.COUNTER_ATTACK
	if roll < 0.10 or (float(tactic["directness"]) > 0.62 and roll < 0.24):
		return AttackingSequence.DIRECT_LONG_BALL
	if roll < 0.24:
		return AttackingSequence.RECYCLE_POSSESSION
	if roll < 0.26:
		return AttackingSequence.ATTACK_LEFT if ball_pos.x < 0.5 else AttackingSequence.ATTACK_RIGHT
	if roll < 0.36:
		return AttackingSequence.ATTACK_RIGHT if ball_pos.x < 0.5 else AttackingSequence.ATTACK_LEFT
	return AttackingSequence.BUILD_UP_CENTER

func _actions_for_sequence(sequence_intent: String, phase: String, tactic: Dictionary, ball_pos: Vector2) -> Array[String]:
	var actions: Array[String] = []
	match sequence_intent:
		AttackingSequence.BUILD_UP_CENTER:
			actions = ["SHORT_PASS", "SIDEWAYS_PASS", "ONE_TWO", "VERTICAL_PASS"]
			if _randf() < 0.22:
				actions.insert(2, "SWITCH_PLAY")
			if phase == "build_up" and _randf() < 0.30:
				actions = ["SHORT_PASS", "SIDEWAYS_PASS", "SAFE_RECYCLE", "VERTICAL_PASS"]
		AttackingSequence.ATTACK_LEFT, AttackingSequence.ATTACK_RIGHT:
			actions = ["PASS_TO_WING", "DRIBBLE", "CROSS"]
			if _randf() < 0.30:
				actions.insert(2, "SWITCH_PLAY")
			if _randf() < 0.34:
				actions[actions.size() - 1] = "CUTBACK"
			if _randf() < 0.32:
				actions.append("SHOOT")
		AttackingSequence.DIRECT_LONG_BALL:
			var direct_release: String = "LONG_PASS"
			var roll: float = _randf()
			if roll < 0.28:
				direct_release = "THROUGH_BALL"
			elif roll < 0.48:
				direct_release = "VERTICAL_PASS"
			actions = ["SHORT_PASS", direct_release]
			if _randf() < 0.50:
				actions.append("SHOOT")
		AttackingSequence.RECYCLE_POSSESSION:
			actions = ["PRESSURED_BACK_PASS", "SAFE_RECYCLE", "SIDEWAYS_PASS", "SHORT_PASS"]
		AttackingSequence.COUNTER_ATTACK:
			actions = ["DRIBBLE", "THROUGH_BALL", "SHOOT"]
		AttackingSequence.CROSS_SEQUENCE:
			actions = ["PASS_TO_WING", "DRIBBLE", "CROSS"]
			if _randf() < 0.26:
				actions.append("SHOOT")
		AttackingSequence.CUTBACK_SEQUENCE:
			actions = ["PASS_TO_WING", "DRIBBLE", "CUTBACK", "SHOOT"]
		AttackingSequence.FINAL_THIRD_COMBINATION:
			actions = ["ONE_TWO", "WALL_PASS", "CUTBACK", "SHOOT"]
		_:
			actions = ["SHORT_PASS", _weighted_action(phase, tactic, 84.0, 82.0), "SHORT_PASS"]
	if float(tactic["width"]) > 0.62 and not ("SWITCH_PLAY" in actions) and _randf() < 0.16:
		actions.insert(maxi(1, actions.size() - 1), "SWITCH_PLAY")
	return actions

func _phase_for_sequence_action(sequence_intent: String, action: String, fallback_phase: String) -> String:
	if action in ["GOAL_KICK_SHORT", "KEEPER_BUILD_UP"]:
		return "build_up"
	if action in ["CROSS", "CUTBACK", "SHOOT"]:
		return "final_third"
	if sequence_intent in [AttackingSequence.ATTACK_LEFT, AttackingSequence.ATTACK_RIGHT, AttackingSequence.CROSS_SEQUENCE, AttackingSequence.CUTBACK_SEQUENCE]:
		return "wide_attack" if action in ["PASS_TO_WING", "DRIBBLE", "SIDEWAYS_PASS", "SWITCH_PLAY"] else "final_third"
	if sequence_intent == AttackingSequence.DIRECT_LONG_BALL:
		return "progression" if action != "SHOOT" else "final_third"
	if sequence_intent == AttackingSequence.RECYCLE_POSSESSION:
		return "build_up" if action in ["PRESSURED_BACK_PASS", "SAFE_RECYCLE"] else "progression"
	if sequence_intent == AttackingSequence.FINAL_THIRD_COMBINATION:
		return "central_attack" if action != "SHOOT" else "final_third"
	return fallback_phase

func _sequence_pressure(sequence_intent: String, chain_step: int, team_power: float, opp_power: float) -> float:
	var base: float = clampf((opp_power - team_power) / 34.0 + _randf() * 0.30, 0.0, 0.92)
	if sequence_intent == AttackingSequence.RECYCLE_POSSESSION:
		base += 0.24
	elif sequence_intent in [AttackingSequence.BUILD_UP_CENTER, AttackingSequence.CROSS_SEQUENCE]:
		base += 0.10
	elif sequence_intent == AttackingSequence.COUNTER_ATTACK:
		base -= 0.08
	base += float(chain_step) * 0.035
	return clampf(base, 0.0, 0.96)

func _sequence_success_probability(action: String, phase: String, sequence_intent: String, chain_step: int, team_power: float, opp_power: float, tactic: Dictionary, pressure: float) -> float:
	var base: float = _success_probability(action, phase, team_power, opp_power, tactic, pressure)
	if chain_step == 0 and action in ["SHORT_PASS", "SIDEWAYS_PASS", "BACK_PASS", "SAFE_RECYCLE"]:
		base += 0.08
	if sequence_intent == AttackingSequence.BUILD_UP_CENTER and action in ["ONE_TWO", "WALL_PASS"]:
		base += 0.06
	if sequence_intent == AttackingSequence.RECYCLE_POSSESSION and action in ["PRESSURED_BACK_PASS", "SAFE_RECYCLE"]:
		base += 0.05
	if sequence_intent == AttackingSequence.DIRECT_LONG_BALL and action == "LONG_PASS":
		base += 0.04
	if action == "SHOOT":
		base = 0.50
	if chain_step >= 3:
		base -= 0.04
	return clampf(base, 0.10, 0.95)

func _time_step_for_sequence_action(sequence_intent: String, action: String) -> float:
	if action in ["LONG_PASS", "THROUGH_BALL", "VERTICAL_PASS", "CROSS", "CORNER"]:
		return 0.72
	if action in ["DRIBBLE", "SWITCH_PLAY"]:
		return 0.64
	if action in ["SHOOT", "CUTBACK"]:
		return 0.54
	if sequence_intent == AttackingSequence.RECYCLE_POSSESSION:
		return 0.48
	return 0.44

func _play_bubble_radius_for(sequence_intent: String, action: String) -> float:
	if sequence_intent in [AttackingSequence.ATTACK_LEFT, AttackingSequence.ATTACK_RIGHT, AttackingSequence.CROSS_SEQUENCE, AttackingSequence.CUTBACK_SEQUENCE]:
		return 0.22
	if action in ["LONG_PASS", "SWITCH_PLAY", "THROUGH_BALL"]:
		return 0.34
	if sequence_intent == AttackingSequence.BUILD_UP_CENTER:
		return 0.24
	return 0.27

func _tactic_weights(style: String, cards: Array) -> Dictionary:
	var weights: Dictionary = {
		"tempo": 0.55,
		"directness": 0.48,
		"width": 0.55,
		"press": 0.50,
		"shot_bias": 0.0,
		"wing_bias": 0.0,
		"through_bias": 0.0
	}
	match style:
		"gegen":
			weights["tempo"] = 0.72
			weights["press"] = 0.78
			weights["through_bias"] = 0.08
		"kontra":
			weights["directness"] = 0.76
			weights["through_bias"] = 0.16
		"otobus":
			weights["tempo"] = 0.38
			weights["directness"] = 0.34
		_:
			pass
	for c in cards:
		match str(c):
			"kontra":
				weights["through_bias"] = float(weights["through_bias"]) + 0.08
			"taraftar":
				weights["tempo"] = float(weights["tempo"]) + 0.04
			"kanat_akini":
				weights["wing_bias"] = float(weights["wing_bias"]) + 0.12
			"yildiz":
				weights["shot_bias"] = float(weights["shot_bias"]) + 0.08
	return weights

func _phase_for_segment(team: int, minute: float, momentum: float, tactic: Dictionary) -> String:
	var m: float = momentum if team == 0 else 100.0 - momentum
	var r: float = _randf()
	if r < 0.18:
		return "build_up"
	if r < 0.42:
		return "progression"
	if r < 0.60 + float(tactic["width"]) * 0.16:
		return "wide_attack"
	if r < 0.78:
		return "central_attack"
	if m > 57.0 or minute > 72.0:
		return "final_third"
	return "progression"

func _weighted_action(phase: String, tactic: Dictionary, team_power: float, opp_power: float) -> String:
	var pool: Array[Dictionary] = []
	_add(pool, "SHORT_PASS", 1.0)
	_add(pool, "ONE_TWO", 0.24 + float(tactic["tempo"]) * 0.18)
	_add(pool, "WALL_PASS", 0.18 + float(tactic["tempo"]) * 0.16)
	_add(pool, "SIDEWAYS_PASS", 0.34)
	_add(pool, "SWITCH_PLAY", 0.16 + float(tactic["width"]) * 0.20)
	_add(pool, "DRIBBLE", 0.34 + float(tactic["tempo"]) * 0.20)
	_add(pool, "BACK_PASS", 0.20)
	_add(pool, "PRESSURED_BACK_PASS", 0.10 + maxf(0.0, opp_power - team_power) * 0.004)
	_add(pool, "THROUGH_BALL", 0.22 + float(tactic["through_bias"]) + float(tactic["directness"]) * 0.22)
	_add(pool, "PASS_TO_WING", 0.24 + float(tactic["wing_bias"]) + float(tactic["width"]) * 0.28)
	_add(pool, "LONG_PASS", 0.12 + float(tactic["directness"]) * 0.26)
	if phase in ["progression", "central_attack", "build_up"]:
		_add(pool, "VERTICAL_PASS", 0.08 + float(tactic["directness"]) * 0.14 + float(tactic["through_bias"]) * 0.55)
	if phase == "wide_attack":
		_add(pool, "CROSS", 0.52)
		_add(pool, "CUTBACK", 0.26)
	if phase == "central_attack" or phase == "final_third":
		_add(pool, "SHOOT", 0.28 + float(tactic["shot_bias"]) + maxf(0.0, team_power - opp_power) * 0.006)
		_add(pool, "CUTBACK", 0.18)
	if phase == "build_up":
		_add(pool, "BACK_PASS", 0.35)
		_add(pool, "SAFE_RECYCLE", 0.36)
		_add(pool, "LONG_PASS", float(tactic["directness"]) * 0.18)
	if phase == "progression" and float(tactic["directness"]) > 0.62:
		_add(pool, "VERTICAL_PASS", 0.28)
	return _pick_weighted(pool)

func _add(pool: Array[Dictionary], action: String, weight: float) -> void:
	pool.append({"action": action, "weight": maxf(0.01, weight)})

func _pick_weighted(pool: Array[Dictionary]) -> String:
	var total: float = 0.0
	for item in pool:
		total += float(item["weight"])
	var roll: float = _randf() * total
	var acc: float = 0.0
	for item in pool:
		acc += float(item["weight"])
		if roll <= acc:
			return str(item["action"])
	return str(pool[0]["action"])

func _success_probability(action: String, phase: String, team_power: float, opp_power: float, tactic: Dictionary, pressure: float) -> float:
	var base: float = 0.78
	match action:
		"SHORT_PASS", "BACK_PASS", "SIDEWAYS_PASS", "SAFE_RECYCLE":
			base = 0.88
		"ONE_TWO", "WALL_PASS":
			base = 0.80
		"PASS_TO_WING":
			base = 0.76
		"SWITCH_PLAY":
			base = 0.68
		"THROUGH_BALL", "VERTICAL_PASS":
			base = 0.50
		"LONG_PASS":
			base = 0.48
		"CROSS", "CUTBACK":
			base = 0.42
		"DRIBBLE":
			base = 0.56
		"SHOOT":
			base = 0.34
		"PRESSURED_BACK_PASS":
			base = 0.72
	var power_mod: float = clampf((team_power - opp_power) / 70.0, -0.18, 0.18)
	var pressure_mod: float = pressure * 0.22
	return clampf(base + power_mod - pressure_mod, 0.08, 0.94)

func _danger_value(action: String, phase: String, success: bool, team_power: float, opp_power: float) -> float:
	var d: float = 0.0
	match action:
		"SHOOT":
			d = 8.0
		"CROSS":
			d = 5.0
		"CUTBACK":
			d = 5.4
		"THROUGH_BALL", "VERTICAL_PASS":
			d = 4.2
		"ONE_TWO", "WALL_PASS":
			d = 2.6
		"SWITCH_PLAY":
			d = 2.2
		"PASS_TO_WING":
			d = 2.4
		"DRIBBLE":
			d = 2.0
		_:
			d = 1.0
	if phase == "final_third":
		d += 2.5
	if success:
		d += 1.6
	d += clampf((team_power - opp_power) * 0.04, -1.2, 1.8)
	return clampf(d, 0.0, 12.0)

func _start_position(team: int, phase: String) -> Vector2:
	var y: float = 0.72 if team == 0 else 0.28
	match phase:
		"build_up":
			y = 0.74 if team == 0 else 0.26
		"progression":
			y = 0.56 if team == 0 else 0.44
		"wide_attack", "central_attack":
			y = 0.40 if team == 0 else 0.60
		"final_third":
			y = 0.24 if team == 0 else 0.76
	var x: float = clampf(0.5 + (_randf() - 0.5) * 0.48, 0.12, 0.88)
	return Vector2(x, y)

func _end_position(team: int, phase: String, action: String, start: Vector2, sequence_intent: String = "") -> Vector2:
	var dir: float = -1.0 if team == 0 else 1.0
	var end: Vector2 = start
	match action:
		"BACK_PASS", "PRESSURED_BACK_PASS", "SAFE_RECYCLE":
			end.y -= dir * 0.14
			end.x += (_randf() - 0.5) * 0.16
		"SIDEWAYS_PASS":
			end.x += 0.18 if start.x < 0.5 else -0.18
			end.y += dir * 0.015
		"ONE_TWO", "WALL_PASS":
			end.y += dir * 0.075
			end.x += (_randf() - 0.5) * 0.10
		"SWITCH_PLAY":
			end.x = 0.84 if start.x < 0.5 else 0.16
			end.y += dir * 0.04
		"PASS_TO_WING":
			if sequence_intent == AttackingSequence.ATTACK_LEFT:
				end.x = 0.12
			elif sequence_intent == AttackingSequence.ATTACK_RIGHT:
				end.x = 0.88
			else:
				end.x = 0.12 if start.x < 0.5 else 0.88
			end.y += dir * 0.10
		"THROUGH_BALL", "LONG_PASS", "VERTICAL_PASS":
			end.y += dir * 0.22
			end.x += (_randf() - 0.5) * 0.22
		"CROSS":
			end.x = clampf(0.50 + (_randf() - 0.5) * 0.22, 0.34, 0.66)
			end.y = 0.16 if team == 0 else 0.84
		"CUTBACK":
			end.x = clampf(0.45 + (_randf() - 0.5) * 0.22, 0.32, 0.68)
			end.y = 0.28 if team == 0 else 0.72
		"SHOOT":
			end.x = clampf(0.50 + (_randf() - 0.5) * 0.18, 0.40, 0.60)
			end.y = -0.03 if team == 0 else 1.03
		"DRIBBLE":
			end.y += dir * 0.10
			end.x += (_randf() - 0.5) * 0.12
		_:
			end.y += dir * 0.10
			end.x += (_randf() - 0.5) * 0.18
	if action != "SHOOT":
		end.x = clampf(end.x, 0.07, 0.93)
		end.y = clampf(end.y, 0.07, 0.93)
	return end

func _actor_role(action: String, phase: String, start: Vector2) -> String:
	if action == "CROSS" or action == "PASS_TO_WING" or action == "CUTBACK":
		return "LM" if start.x < 0.5 else "RM"
	if action == "SHOOT":
		return "ST"
	if action in ["ONE_TWO", "WALL_PASS", "SIDEWAYS_PASS", "SWITCH_PLAY", "VERTICAL_PASS"]:
		return "CM" if phase != "final_third" else "AM"
	if action in ["PRESSURED_BACK_PASS", "SAFE_RECYCLE"]:
		return "CM"
	if phase == "build_up":
		return "CM"
	return "CM" if _randf() < 0.55 else "ST"

func _receiver_role(action: String, phase: String, end: Vector2) -> String:
	match action:
		"BACK_PASS", "PRESSURED_BACK_PASS", "SAFE_RECYCLE":
			return "CB"
		"SIDEWAYS_PASS":
			return "CM"
		"ONE_TWO", "WALL_PASS":
			return "AM" if phase == "final_third" else "CM"
		"SWITCH_PLAY":
			return "RW" if end.x > 0.5 else "LW"
		"PASS_TO_WING":
			return "LM" if end.x < 0.5 else "RM"
		"THROUGH_BALL", "CROSS", "LONG_PASS", "VERTICAL_PASS":
			return "ST"
		"CUTBACK":
			return "AM"
		"SHOOT":
			return ""
		_:
			return "CM"

func _pattern_for_phase(phase: String, start: Vector2) -> String:
	match phase:
		"wide_attack":
			return "ATTACK_LEFT" if start.x < 0.5 else "ATTACK_RIGHT"
		"central_attack":
			return "BUILD_UP_CENTER"
		"final_third":
			return "DIRECT_LONG_BALL"
		"build_up":
			return "BUILD_UP_CENTER"
		_:
			return "RECYCLE_POSSESSION"

func _label(team: int, action: String, phase: String, success: bool, goal: bool) -> String:
	var side: String = "Home" if team == 0 else "Away"
	if goal:
		return "%s goal from %s" % [side, action]
	if not success:
		return "%s loses it after %s" % [side, action]
	if action == "ONE_TWO":
		return "%s one-two combination" % side
	if action == "WALL_PASS":
		return "%s wall pass through pressure" % side
	if action == "SWITCH_PLAY":
		return "%s switches play" % side
	if action == "CUTBACK":
		return "%s cutback into the box" % side
	if action == "PRESSURED_BACK_PASS":
		return "%s goes backwards under pressure" % side
	return "%s %s in %s" % [side, action, phase]

func _loss_reason(action: String, pressure: float, turnover: bool) -> String:
	if not turnover:
		return ""
	if pressure > 0.72:
		return "PRESSURE_MISTAKE"
	match action:
		"DRIBBLE":
			return "FAILED_DRIBBLE"
		"THROUGH_BALL", "VERTICAL_PASS":
			return "INTERCEPTED_PASS" if _randf() < 0.55 else "OVERHIT_PASS"
		"LONG_PASS":
			return "OVERHIT_PASS"
		"CROSS", "CUTBACK":
			return "KEEPER_CLAIM" if _randf() < 0.35 else "OVERHIT_PASS"
		"ONE_TWO", "WALL_PASS":
			return "INTERCEPTED_PASS" if _randf() < 0.45 else "BAD_TOUCH"
		"SHORT_PASS", "PASS_TO_WING", "BACK_PASS", "SIDEWAYS_PASS", "SWITCH_PLAY", "PRESSURED_BACK_PASS", "SAFE_RECYCLE":
			return "INTERCEPTED_PASS" if _randf() < 0.62 else "BAD_TOUCH"
	return "BAD_TOUCH"

func _visual_intensity(action: String, phase: String, danger: float, goal: bool, turnover: bool) -> float:
	var v: float = 0.25
	match action:
		"SHOOT":
			v = 0.85
		"CROSS", "THROUGH_BALL", "CUTBACK":
			v = 0.68
		"LONG_PASS", "PASS_TO_WING", "SWITCH_PLAY", "VERTICAL_PASS":
			v = 0.52
		"ONE_TWO", "WALL_PASS":
			v = 0.46
		"DRIBBLE":
			v = 0.45
		_:
			v = 0.30
	if phase == "final_third":
		v += 0.12
	if turnover:
		v += 0.10
	if goal:
		v = 1.0
	return clampf(v + danger * 0.015, 0.15, 1.0)

func _event_path(start: Vector2, end: Vector2, team: int, action: String) -> Array[Dictionary]:
	var dir: float = -1.0 if team == 0 else 1.0
	var mid: Vector2 = start.lerp(end, 0.52)
	match action:
		"CROSS", "CORNER":
			mid.x = clampf(start.x + (0.5 - start.x) * 0.35, 0.08, 0.92)
			mid.y = clampf(start.y + dir * 0.05, 0.04, 0.96)
		"THROUGH_BALL", "LONG_PASS", "GOAL_KICK_LONG", "KEEPER_LONG", "VERTICAL_PASS":
			mid.y = clampf(mid.y + dir * 0.06, 0.04, 0.96)
		"PASS_TO_WING", "THROW_IN", "SWITCH_PLAY", "SIDEWAYS_PASS":
			mid.x = clampf(end.x, 0.07, 0.93)
		"ONE_TWO", "WALL_PASS":
			var wall: Vector2 = start.lerp(end, 0.45)
			wall.x = clampf(wall.x + (0.055 if start.x < 0.5 else -0.055), 0.08, 0.92)
			mid = wall
		"CUTBACK":
			mid = Vector2(clampf(start.x + (0.5 - start.x) * 0.25, 0.10, 0.90), clampf(start.y + dir * 0.02, 0.04, 0.96))
		"GOAL_KICK_SHORT", "KEEPER_BUILD_UP", "KICK_OFF", "FREE_KICK_SHORT":
			mid = start.lerp(end, 0.45)
		"SHOOT":
			mid = start.lerp(end, 0.35)
		_:
			mid.x = clampf(mid.x + (_randf() - 0.5) * 0.05, 0.06, 0.94)
	return [_pt(start), _pt(mid), _pt(end)]

func _clamp_field(v: Vector2) -> Vector2:
	return Vector2(clampf(v.x, 0.06, 0.94), clampf(v.y, 0.06, 0.94))

func _pt(v: Vector2) -> Dictionary:
	return {"x": v.x, "y": v.y}

func _chain_intent_for_phase(phase: String, team: int, ball_pos: Vector2, tactic: Dictionary) -> String:
	if phase == "wide_attack":
		return "ATTACK_LEFT" if ball_pos.x < 0.5 else "ATTACK_RIGHT"
	if phase == "central_attack":
		return "BUILD_UP_CENTER"
	if phase == "final_third":
		if float(tactic["width"]) > 0.58 and _randf() < 0.45:
			return "CROSS_SEQUENCE"
		if _randf() < 0.32:
			return "CUTBACK_SEQUENCE"
		return "FINAL_THIRD_COMBINATION"
	if phase == "build_up":
		if float(tactic["directness"]) > 0.66 and _randf() < 0.30:
			return "DIRECT_LONG_BALL"
		return "BUILD_UP_CENTER"
	if float(tactic["directness"]) > 0.66 and _randf() < 0.34:
		return "DIRECT_LONG_BALL"
	return "RECYCLE_POSSESSION"

func _sequence_for_event_intent(chain_intent: String, action: String, phase: String, start: Vector2) -> String:
	match action:
		"CROSS":
			return "CROSS_SEQUENCE"
		"LONG_PASS", "THROUGH_BALL":
			return "DIRECT_LONG_BALL"
		"SHOOT":
			return "SHOT_SEQUENCE"
		"CUTBACK":
			return "CUTBACK_SEQUENCE"
		"ONE_TWO", "WALL_PASS", "SIDEWAYS_PASS":
			return "BUILD_UP_CENTER" if phase != "final_third" else "FINAL_THIRD_COMBINATION"
		"SWITCH_PLAY":
			return "ATTACK_RIGHT" if start.x < 0.5 else "ATTACK_LEFT"
		"VERTICAL_PASS":
			return "DIRECT_LONG_BALL"
		"BACK_PASS", "PRESSURED_BACK_PASS", "SAFE_RECYCLE":
			return "RECYCLE_POSSESSION" if phase != "final_third" else "CUTBACK_SEQUENCE"
		"PASS_TO_WING":
			return "ATTACK_LEFT" if start.x < 0.5 else "ATTACK_RIGHT"
	if chain_intent != "":
		return chain_intent
	return _pattern_for_phase(phase, start)

func _chain_stage(chain_step: int, action: String, turnover: bool, goal: bool) -> String:
	if turnover:
		return "BROKEN"
	if action == "SHOOT" or goal:
		return "FINAL_ACTION"
	if action in ["BACK_PASS", "PRESSURED_BACK_PASS", "SAFE_RECYCLE"]:
		return "RECYCLE"
	if action in ["ONE_TWO", "WALL_PASS", "SIDEWAYS_PASS"]:
		return "PROGRESS" if chain_step > 0 else "PREPARE"
	if chain_step <= 1:
		return "PREPARE"
	return "PROGRESS"

func _defensive_reaction_for_event(action: String, phase: String, start: Vector2, danger: float, pressure: float) -> String:
	if danger > 7.0 or phase == "final_third":
		return "BOX_DEFENSE"
	if pressure > 0.72:
		return "COUNTER_PRESS"
	if action in ["PASS_TO_WING", "CROSS", "CUTBACK"]:
		return "BALL_SIDE_PRESS"
	if action in ["LONG_PASS", "THROUGH_BALL", "VERTICAL_PASS", "SWITCH_PLAY"]:
		return "RECOVERY_RUN"
	if phase == "build_up":
		return "HIGH_PRESS"
	return "MID_BLOCK"

func _release_type(action: String, sequence: String) -> String:
	match action:
		"SHORT_PASS", "BACK_PASS", "SIDEWAYS_PASS", "SAFE_RECYCLE", "PRESSURED_BACK_PASS":
			return "GROUND_PASS"
		"ONE_TWO", "WALL_PASS":
			return "COMBINATION_PASS"
		"PASS_TO_WING":
			return "SWITCH_OR_WIDE_PASS"
		"THROUGH_BALL", "VERTICAL_PASS":
			return "LEAD_RUNNER"
		"LONG_PASS":
			return "AERIAL_OR_DIRECT"
		"SWITCH_PLAY":
			return "DIAGONAL_SWITCH"
		"CROSS":
			return "BOX_DELIVERY"
		"CUTBACK":
			return "CUTBACK"
		"SHOOT":
			return "FINISH"
		"DRIBBLE":
			return "CARRY"
	return sequence

func _projected_receiver_target(team: int, action: String, end: Vector2) -> Vector2:
	var dir: float = -1.0 if team == 0 else 1.0
	match action:
		"THROUGH_BALL", "LONG_PASS", "VERTICAL_PASS":
			return _clamp_field(Vector2(end.x, end.y + dir * 0.10))
		"CROSS":
			return _clamp_field(Vector2(clampf(end.x, 0.35, 0.65), end.y - dir * 0.025))
		"CUTBACK":
			return _clamp_field(Vector2(clampf(end.x, 0.36, 0.64), end.y))
		"PASS_TO_WING":
			return _clamp_field(Vector2(end.x, end.y + dir * 0.035))
		"BACK_PASS", "PRESSURED_BACK_PASS", "SAFE_RECYCLE":
			return _clamp_field(Vector2(end.x, end.y - dir * 0.030))
		"ONE_TWO", "WALL_PASS":
			return _clamp_field(Vector2(end.x, end.y + dir * 0.035))
	return _clamp_field(end)

func _next_preferred_zone(sequence: String, team: int, end: Vector2) -> String:
	if sequence in ["ATTACK_LEFT", "ATTACK_RIGHT", "CROSS_SEQUENCE"]:
		return "left_wing" if end.x < 0.5 else "right_wing"
	if sequence == "DIRECT_LONG_BALL":
		return "behind_defense"
	if sequence == "CUTBACK_SEQUENCE":
		return "edge_of_box"
	if sequence == "BUILD_UP_CENTER":
		return "central_triangle"
	if sequence == "RECYCLE_POSSESSION":
		return "safe_support"
	return _zone_name(end)

func _restart_type(action: String, loss_reason: String, end: Vector2, goal: bool) -> String:
	if goal:
		return "KICK_OFF"
	if loss_reason == "OFFSIDE":
		return "INDIRECT_FREE_KICK"
	if loss_reason == "KEEPER_CLAIM":
		return "KEEPER_POSSESSION"
	if loss_reason == "OVERHIT_PASS":
		if action == "CROSS" and _randf() < 0.28:
			return "CORNER"
		if end.x <= 0.08 or end.x >= 0.92:
			return "THROW_IN"
		if end.y <= 0.10 or end.y >= 0.90:
			return "CORNER" if action in ["CROSS", "SHOOT"] and _randf() < 0.34 else "GOAL_KICK"
	if action == "SHOOT" and not goal:
		return "CORNER" if _randf() < 0.28 else "GOAL_KICK"
	return "OPEN_PLAY"

func _zone_name(point: Vector2) -> String:
	var lane: String = "center"
	if point.x < 0.33:
		lane = "left"
	elif point.x > 0.67:
		lane = "right"
	var band: String = "middle"
	if point.y < 0.33:
		band = "top"
	elif point.y > 0.67:
		band = "bottom"
	return "%s_%s" % [lane, band]

func _restart_action(restart_type: String, attacking_team: int, end: Vector2) -> String:
	match restart_type:
		"KICK_OFF":
			return "KICK_OFF"
		"CORNER":
			return "CORNER"
		"THROW_IN":
			return "THROW_IN"
		"GOAL_KICK":
			return "GOAL_KICK_SHORT" if _randf() < 0.58 else "GOAL_KICK_LONG"
		"KEEPER_POSSESSION":
			return "KEEPER_BUILD_UP" if _randf() < 0.62 else "KEEPER_LONG"
		"INDIRECT_FREE_KICK":
			return "FREE_KICK_SHORT"
	return "OPEN_PLAY"

func _restart_event(id: int, chain_id: int, minute: float, team: int, action: String, start: Vector2, end: Vector2, score_home: int, score_away: int) -> Dictionary:
	var receiver_role: String = _restart_receiver_role(action, end)
	var sequence: String = _restart_sequence(action, start)
	var path: Array[Dictionary] = _event_path(start, end, team, action)
	return {
		"id": id,
		"chain_id": chain_id,
		"chain_step": 0,
		"minute": minute,
		"team": team,
		"phase": "set_piece",
		"pattern": sequence,
		"attacking_sequence": sequence,
		"chain_intent": action,
		"chain_stage": "RESTART",
		"chain_origin_zone": _zone_name(start),
		"next_preferred_zone": _next_preferred_zone(sequence, team, end),
		"defensive_reaction": "SET_PIECE_DEFENSE",
		"play_bubble_center": _pt(start),
		"play_bubble_radius": 0.22 if action == "CORNER" else 0.28,
		"action": action,
		"release_type": _restart_release_type(action),
		"actor_role": _restart_actor_role(action, start),
		"receiver_role": receiver_role,
		"projected_receiver_target": _pt(end),
		"start": _pt(start),
		"end": _pt(end),
		"path": path,
		"success": true,
		"turnover": false,
		"loss_reason": "",
		"restart_type": action,
		"goal": false,
		"danger": 5.8 if action == "CORNER" else 1.4,
		"pressure": 0.15,
		"pressure_source": "SET_PIECE_MARKING" if action == "CORNER" else "RESTART_SHAPE",
		"xg": 0.06 if action == "CORNER" else 0.0,
		"xThreat": 0.22 if action == "CORNER" else 0.04,
		"chance_type": "SET_PIECE" if action == "CORNER" else "RESTART",
		"visual_intensity": 0.78 if action == "CORNER" else 0.40,
		"engine_note": "restart_event_from_archive",
		"score_home": score_home,
		"score_away": score_away,
		"label": _restart_label(team, action)
	}

func _restart_actor_role(action: String, start: Vector2) -> String:
	match action:
		"GOAL_KICK_SHORT", "GOAL_KICK_LONG", "KEEPER_BUILD_UP", "KEEPER_LONG":
			return "GK"
		"FREE_KICK_SHORT":
			return "CB"
		"CORNER", "THROW_IN":
			return "LM" if start.x < 0.5 else "RM"
	return "CM"

func _restart_receiver_role(action: String, end: Vector2) -> String:
	match action:
		"KICK_OFF":
			return "CM"
		"GOAL_KICK_SHORT", "KEEPER_BUILD_UP":
			return "CB"
		"GOAL_KICK_LONG", "KEEPER_LONG":
			return "ST"
		"CORNER":
			return "ST"
		"THROW_IN":
			return "LM" if end.x < 0.5 else "RM"
		"FREE_KICK_SHORT":
			return "CM"
	return "CM"

func _restart_sequence(action: String, start: Vector2) -> String:
	match action:
		"CORNER":
			return "CROSS_SEQUENCE"
		"THROW_IN":
			return "ATTACK_LEFT" if start.x < 0.5 else "ATTACK_RIGHT"
		"GOAL_KICK_LONG", "KEEPER_LONG":
			return "DIRECT_LONG_BALL"
		"GOAL_KICK_SHORT", "KEEPER_BUILD_UP", "KICK_OFF":
			return "BUILD_UP_CENTER"
		"FREE_KICK_SHORT":
			return "RECYCLE_POSSESSION"
	return "RECYCLE_POSSESSION"

func _restart_release_type(action: String) -> String:
	match action:
		"CORNER":
			return "BOX_DELIVERY"
		"THROW_IN":
			return "THROW"
		"GOAL_KICK_LONG", "KEEPER_LONG":
			return "AERIAL_OR_DIRECT"
		"GOAL_KICK_SHORT", "KEEPER_BUILD_UP", "KICK_OFF":
			return "GROUND_PASS"
		"FREE_KICK_SHORT":
			return "GROUND_PASS"
	return "RESTART"

func _restart_label(team: int, action: String) -> String:
	var side: String = "Home" if team == 0 else "Away"
	match action:
		"KICK_OFF":
			return "%s restart from kick-off" % side
		"CORNER":
			return "%s corner" % side
		"THROW_IN":
			return "%s throw-in" % side
		"GOAL_KICK_SHORT":
			return "%s goalkeeper plays short" % side
		"GOAL_KICK_LONG":
			return "%s goalkeeper goes long" % side
		"KEEPER_BUILD_UP":
			return "%s keeper builds from the back" % side
		"KEEPER_LONG":
			return "%s keeper launches forward" % side
		"FREE_KICK_SHORT":
			return "%s restarts after offside" % side
	return "%s restart" % side

func _kickoff_target(team: int) -> Vector2:
	return Vector2(0.46, 0.54) if team == 0 else Vector2(0.54, 0.46)

func _corner_position(team: int, end: Vector2) -> Vector2:
	var attacking_top: bool = team == 0
	var y: float = 0.015 if attacking_top else 0.985
	var x: float = 0.02 if end.x < 0.5 else 0.98
	return Vector2(x, y)

func _corner_target(team: int) -> Vector2:
	return Vector2(clampf(0.50 + (_randf() - 0.5) * 0.18, 0.36, 0.64), 0.17 if team == 0 else 0.83)

func _restart_start_for(team: int, action: String, end: Vector2) -> Vector2:
	match action:
		"GOAL_KICK_SHORT", "GOAL_KICK_LONG", "KEEPER_BUILD_UP", "KEEPER_LONG":
			return Vector2(0.50, 0.87 if team == 0 else 0.13)
		"THROW_IN":
			return Vector2(0.02 if end.x < 0.5 else 0.98, clampf(end.y, 0.10, 0.90))
		"FREE_KICK_SHORT":
			return _clamp_field(end)
	return Vector2(0.5, 0.5)

func _restart_end_for(team: int, action: String, start: Vector2) -> Vector2:
	var dir: float = -1.0 if team == 0 else 1.0
	match action:
		"GOAL_KICK_SHORT", "KEEPER_BUILD_UP":
			return _clamp_field(Vector2(0.38 if _randf() < 0.5 else 0.62, start.y + dir * 0.11))
		"GOAL_KICK_LONG", "KEEPER_LONG":
			return _clamp_field(Vector2(clampf(0.5 + (_randf() - 0.5) * 0.30, 0.22, 0.78), start.y + dir * 0.45))
		"THROW_IN":
			return _clamp_field(Vector2(clampf(start.x + (0.10 if start.x < 0.5 else -0.10), 0.08, 0.92), start.y + dir * 0.035))
		"FREE_KICK_SHORT":
			return _clamp_field(Vector2(clampf(start.x + (_randf() - 0.5) * 0.16, 0.12, 0.88), start.y + dir * 0.08))
	return _kickoff_target(team)

func _xg_value(action: String, phase: String, start: Vector2, end: Vector2, pressure: float) -> float:
	if action != "SHOOT":
		return 0.0
	var goal_y: float = 0.0 if end.y < 0.5 else 1.0
	var distance: float = Vector2(0.5, goal_y).distance_to(start)
	var angle_bonus: float = clampf(1.0 - abs(start.x - 0.5) * 1.6, 0.25, 1.0)
	var base: float = clampf(0.34 - distance * 0.42, 0.03, 0.36)
	if phase == "final_third":
		base += 0.04
	return clampf(base * angle_bonus - pressure * 0.06, 0.01, 0.45)

func _x_threat_value(action: String, start: Vector2, end: Vector2, success: bool) -> float:
	var start_threat: float = _field_threat(start)
	var end_threat: float = _field_threat(end)
	var gain: float = maxf(0.0, end_threat - start_threat)
	match action:
		"THROUGH_BALL", "VERTICAL_PASS":
			gain += 0.08
		"CROSS", "CUTBACK":
			gain += 0.07
		"PASS_TO_WING", "SWITCH_PLAY":
			gain += 0.04
		"ONE_TWO", "WALL_PASS":
			gain += 0.035
		"DRIBBLE":
			gain += 0.03
		"SHOOT":
			gain += 0.12
	return clampf(gain * (1.0 if success else 0.45), 0.0, 0.45)

func _field_threat(point: Vector2) -> float:
	var vertical: float = 1.0 - abs(point.y - 0.0)
	if point.y > 0.5:
		vertical = point.y
	var central: float = 1.0 - abs(point.x - 0.5) * 1.45
	return clampf(vertical * 0.22 + central * 0.10, 0.0, 0.34)

func _chance_type(action: String, phase: String, start: Vector2, end: Vector2, xg: float) -> String:
	if action == "SHOOT":
		if xg > 0.22:
			return "CLEAR_CUT"
		if start.x < 0.34 or start.x > 0.66:
			return "WIDE_ANGLE_SHOT"
		if phase == "final_third":
			return "BOX_SHOT"
		return "LONG_SHOT"
	if action == "CROSS":
		return "CROSS_CHANCE"
	if action == "CUTBACK":
		return "CUTBACK_CHANCE"
	if action == "THROUGH_BALL" or action == "VERTICAL_PASS":
		return "THROUGH_BALL_CHANCE"
	if action in ["ONE_TWO", "WALL_PASS"]:
		return "COMBINATION"
	return "OPEN_PLAY"

func _pressure_source(pressure: float, action: String) -> String:
	if pressure > 0.72:
		return "AGGRESSIVE_PRESS"
	if action in ["CROSS", "PASS_TO_WING", "CUTBACK"]:
		return "WIDE_PRESSURE"
	if action in ["THROUGH_BALL", "LONG_PASS", "VERTICAL_PASS"]:
		return "LINE_PRESSURE"
	if action in ["ONE_TWO", "WALL_PASS"]:
		return "CENTRAL_PRESSURE"
	if pressure > 0.38:
		return "MID_BLOCK_PRESSURE"
	return "LOW_PRESSURE"

func _offside_risk(action: String, phase: String, start: Vector2, end: Vector2) -> float:
	if not action in ["THROUGH_BALL", "LONG_PASS", "VERTICAL_PASS"]:
		return 0.0
	var forward_gain: float = abs(end.y - start.y)
	var central: float = 1.0 - abs(end.x - 0.5) * 1.6
	var final_band: bool = end.y < 0.30 or end.y > 0.70
	var base: float = 0.02 + forward_gain * 0.34 + maxf(0.0, central) * 0.05
	if phase == "final_third" or final_band:
		base += 0.07
	if action == "LONG_PASS":
		base += 0.03
	return clampf(base, 0.0, 0.22)
