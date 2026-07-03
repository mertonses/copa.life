class_name SequenceGenerator
extends RefCounted

const PossessionSequence = preload("res://scripts/PossessionSequence.gd")

const RESTART_ACTIONS: Array[String] = [
	"KICK_OFF",
	"CORNER",
	"THROW_IN",
	"GOAL_KICK_SHORT",
	"GOAL_KICK_LONG",
	"KEEPER_BUILD_UP",
	"KEEPER_LONG",
	"FREE_KICK_SHORT"
]

func enrich(events: Array[Dictionary]) -> Array[Dictionary]:
	var enriched: Array[Dictionary] = []
	var sequence_id: int = -1
	var sequence_type: String = ""
	var last_chain: int = -999
	var last_team: int = -999
	var beat_index: int = 0
	var sequence_start_minute: float = 0.0
	for i in range(events.size()):
		var ev: Dictionary = events[i].duplicate(true)
		var action: String = str(ev.get("action", ""))
		var team: int = int(ev.get("team", 0))
		var chain: int = int(ev.get("chain_id", i))
		var next_type: String = _sequence_type_for(ev)
		if _starts_new_sequence(ev, sequence_type, next_type, chain, last_chain, team, last_team):
			sequence_id += 1
			sequence_type = next_type
			beat_index = 0
			sequence_start_minute = float(ev.get("minute", 0.0))
		var beat: Dictionary = _beat_metadata(ev, sequence_type, beat_index)
		ev["sequence_id"] = sequence_id
		ev["sequence_type"] = sequence_type
		ev["sequence_label"] = _sequence_label(sequence_type)
		ev["sequence_started_at"] = sequence_start_minute
		ev["sequence_elapsed"] = maxf(0.0, float(ev.get("minute", 0.0)) - sequence_start_minute)
		ev["beat_id"] = "%d:%d" % [sequence_id, beat_index]
		ev["beat_index"] = beat_index
		ev["beat_type"] = str(beat["beat_type"])
		ev["beat_duration"] = float(beat["beat_duration"])
		ev["prepare_seconds"] = float(beat["prepare_seconds"])
		ev["release_at"] = float(beat["release_at"])
		ev["receiver_pre_run"] = bool(beat["receiver_pre_run"])
		ev["third_man_role"] = str(beat["third_man_role"])
		ev["support_roles"] = beat["support_roles"]
		ev["defensive_response"] = str(beat["defensive_response"])
		ev["pressure_level"] = _pressure_level(float(ev.get("pressure", 0.0)))
		ev["risk_level"] = _risk_level(ev)
		ev["ball_continuity"] = _ball_continuity(ev)
		ev["line_break_plan"] = _line_break_plan(ev, sequence_type, beat)
		ev["pass_flow_plan"] = _pass_flow_plan(ev, sequence_type, beat)
		ev["wide_attack_plan"] = _wide_attack_plan(ev, sequence_type)
		ev["shot_keeper_plan"] = _shot_keeper_plan(ev)
		ev["transition_plan"] = _transition_plan(ev)
		ev["viewing_plan"] = _viewing_plan(ev, sequence_type)
		ev["expected_next_zone"] = str(ev.get("next_preferred_zone", _zone_name_from_point(_dict_to_vec(ev.get("end", {})))))
		ev["visual_contract"] = "sequence_beat_replay_no_result_recalc"
		enriched.append(ev)
		beat_index += 1
		last_chain = chain
		last_team = team
	return enriched

func _starts_new_sequence(ev: Dictionary, current_type: String, next_type: String, chain: int, last_chain: int, team: int, last_team: int) -> bool:
	if current_type == "":
		return true
	if chain != last_chain:
		return true
	if team != last_team:
		return true
	if str(ev.get("phase", "")) == "set_piece":
		return true
	if next_type != current_type and _is_major_sequence_shift(str(ev.get("action", ""))):
		return true
	return false

func _is_major_sequence_shift(action: String) -> bool:
	return action in ["SWITCH_PLAY", "CUTBACK", "CROSS", "LONG_PASS", "THROUGH_BALL", "VERTICAL_PASS", "PRESSURED_BACK_PASS", "SAFE_RECYCLE", "SHOOT"]

func _sequence_type_for(ev: Dictionary) -> String:
	var action: String = str(ev.get("action", ""))
	var phase: String = str(ev.get("phase", ""))
	var seq: String = str(ev.get("attacking_sequence", ""))
	var start: Vector2 = _dict_to_vec(ev.get("start", {}))
	if action in ["GOAL_KICK_SHORT", "KEEPER_BUILD_UP", "KICK_OFF"]:
		return PossessionSequence.BUILD_FROM_BACK_SHORT
	if action == "CORNER":
		return PossessionSequence.SET_PIECE_CORNER
	if action in RESTART_ACTIONS:
		return PossessionSequence.SET_PIECE_RESTART
	if str(ev.get("loss_reason", "")) == "OFFSIDE" or action in ["THROUGH_BALL", "VERTICAL_PASS"]:
		return PossessionSequence.OFFSIDE_TRAP_OR_LINE_BREAK
	if action in ["PRESSURED_BACK_PASS", "SAFE_RECYCLE", "BACK_PASS"]:
		return PossessionSequence.PRESSURED_RECYCLE
	if action in ["GOAL_KICK_SHORT", "KEEPER_BUILD_UP"] or phase == "build_up":
		return PossessionSequence.BUILD_FROM_BACK_SHORT
	if action == "SWITCH_PLAY":
		return PossessionSequence.SWITCH_PLAY_SEQUENCE
	if action in ["LONG_PASS", "GOAL_KICK_LONG", "KEEPER_LONG"]:
		return PossessionSequence.DIRECT_LONG_BALL
	if action == "CUTBACK":
		return PossessionSequence.CUTBACK_ATTACK
	if action in ["CROSS", "PASS_TO_WING"] or seq in [AttackingSequence.ATTACK_LEFT, AttackingSequence.ATTACK_RIGHT, AttackingSequence.CROSS_SEQUENCE]:
		if start.x < 0.5:
			return PossessionSequence.WIDE_OVERLOAD_LEFT
		return PossessionSequence.WIDE_OVERLOAD_RIGHT
	if phase == "final_third" or action == "SHOOT":
		return PossessionSequence.FINAL_THIRD_COMBINATION
	if seq == AttackingSequence.COUNTER_ATTACK:
		return PossessionSequence.COUNTER_ATTACK
	return PossessionSequence.CENTER_TRIANGLE_BUILDUP

func _beat_metadata(ev: Dictionary, sequence_type: String, beat_index: int) -> Dictionary:
	var action: String = str(ev.get("action", ""))
	var beat_type: String = PossessionSequence.PROGRESS
	var prepare_seconds: float = 0.42
	var release_at: float = 0.32
	var receiver_pre_run: bool = false
	var third_man_role: String = ""
	var support_roles: Array[String] = ["CM", "DM"]
	if action in RESTART_ACTIONS:
		beat_type = PossessionSequence.RESTART_SETUP
		prepare_seconds = 0.65
		release_at = 0.46
	elif action in ["LONG_PASS", "THROUGH_BALL", "VERTICAL_PASS", "GOAL_KICK_LONG", "KEEPER_LONG"]:
		beat_type = PossessionSequence.MOVE_OFF_BALL
		prepare_seconds = 0.95
		release_at = 0.52
		receiver_pre_run = true
		third_man_role = "ST"
		support_roles = ["ST", "AM", "CM"]
	elif action in ["ONE_TWO", "WALL_PASS", "SIDEWAYS_PASS"]:
		beat_type = PossessionSequence.RELEASE_PASS if beat_index > 0 else PossessionSequence.PREPARE
		prepare_seconds = 0.45
		release_at = 0.28
		third_man_role = "AM"
		support_roles = ["CM", "AM", "DM"]
	elif action in ["PASS_TO_WING", "SWITCH_PLAY"]:
		beat_type = PossessionSequence.MOVE_OFF_BALL
		prepare_seconds = 0.72
		release_at = 0.42
		receiver_pre_run = true
		support_roles = ["LB", "RB", "LM", "RM", "LW", "RW"]
	elif action in ["CROSS", "CUTBACK", "CORNER"]:
		beat_type = PossessionSequence.FINAL_ACTION
		prepare_seconds = 0.78
		release_at = 0.48
		receiver_pre_run = true
		third_man_role = "AM"
		support_roles = ["ST", "AM", "CM"]
	elif action in ["BACK_PASS", "PRESSURED_BACK_PASS", "SAFE_RECYCLE", "FREE_KICK_SHORT"]:
		beat_type = PossessionSequence.REACTION
		prepare_seconds = 0.34
		release_at = 0.24
		support_roles = ["CB", "DM", "CM"]
	elif action == "SHOOT":
		beat_type = PossessionSequence.FINAL_ACTION
		prepare_seconds = 0.34
		release_at = 0.24
	elif bool(ev.get("turnover", false)):
		beat_type = PossessionSequence.BROKEN
	var duration: float = _duration_for(sequence_type, action, beat_type)
	return {
		"beat_type": beat_type,
		"beat_duration": duration,
		"prepare_seconds": prepare_seconds,
		"release_at": release_at,
		"receiver_pre_run": receiver_pre_run,
		"third_man_role": third_man_role,
		"support_roles": support_roles,
		"defensive_response": _defensive_response_for(sequence_type, action, float(ev.get("pressure", 0.0)))
	}

func _duration_for(sequence_type: String, action: String, beat_type: String) -> float:
	if action in ["KICK_OFF", "GOAL_KICK_SHORT", "KEEPER_BUILD_UP"]:
		return 2.65
	if sequence_type == PossessionSequence.DIRECT_LONG_BALL:
		return 3.15
	if sequence_type in [PossessionSequence.WIDE_OVERLOAD_LEFT, PossessionSequence.WIDE_OVERLOAD_RIGHT, PossessionSequence.CUTBACK_ATTACK]:
		return 2.65
	if beat_type == PossessionSequence.FINAL_ACTION:
		return 2.15
	if beat_type == PossessionSequence.REACTION:
		return 2.05
	return 2.25

func _defensive_response_for(sequence_type: String, action: String, pressure: float) -> String:
	if pressure > 0.72:
		return DefensiveScheme.COUNTER_PRESS
	match sequence_type:
		PossessionSequence.BUILD_FROM_BACK_SHORT:
			return DefensiveScheme.HIGH_PRESS
		PossessionSequence.WIDE_OVERLOAD_LEFT, PossessionSequence.WIDE_OVERLOAD_RIGHT, PossessionSequence.CUTBACK_ATTACK:
			return DefensiveScheme.BALL_SIDE_PRESS
		PossessionSequence.DIRECT_LONG_BALL, PossessionSequence.OFFSIDE_TRAP_OR_LINE_BREAK:
			return DefensiveScheme.RECOVERY_RUN
		PossessionSequence.SET_PIECE_CORNER, PossessionSequence.SET_PIECE_RESTART:
			return DefensiveScheme.SET_PIECE_DEFENSE
	if action == "SHOOT":
		return DefensiveScheme.BOX_DEFENSE
	return DefensiveScheme.MID_BLOCK

func _ball_continuity(ev: Dictionary) -> String:
	var action: String = str(ev.get("action", ""))
	if action in RESTART_ACTIONS:
		return PossessionSequence.RESTART_PLACED
	if str(ev.get("restart_type", "OPEN_PLAY")) != "OPEN_PLAY" and bool(ev.get("turnover", false)):
		return PossessionSequence.OUT_OF_PLAY_RESET
	return PossessionSequence.OPEN_PLAY_CONTINUOUS

func _line_break_plan(ev: Dictionary, sequence_type: String, beat: Dictionary) -> Dictionary:
	var action: String = str(ev.get("action", ""))
	var is_line_break: bool = sequence_type in [PossessionSequence.DIRECT_LONG_BALL, PossessionSequence.OFFSIDE_TRAP_OR_LINE_BREAK] or action in ["LONG_PASS", "THROUGH_BALL", "VERTICAL_PASS", "GOAL_KICK_LONG", "KEEPER_LONG"]
	if not is_line_break:
		return {}
	return {
		"runner_pre_run": bool(beat.get("receiver_pre_run", false)),
		"runner_state_before_release": "TIME_LINE_RUN",
		"runner_state_after_release": "RECEIVE_PASS",
		"defense_state_before_release": "OFFSIDE_LINE_HOLD",
		"defense_state_after_release": "RECOVERY_RUN",
		"timing": "run_then_pass",
		"line_outcome": "OFFSIDE" if str(ev.get("loss_reason", "")) == "OFFSIDE" else "LINE_BREAK_ATTEMPT"
	}

func _pass_flow_plan(ev: Dictionary, sequence_type: String, beat: Dictionary) -> Dictionary:
	var action: String = str(ev.get("action", ""))
	var pressure: float = float(ev.get("pressure", 0.0))
	var is_combo: bool = sequence_type == PossessionSequence.CENTER_TRIANGLE_BUILDUP or action in ["ONE_TWO", "WALL_PASS", "SIDEWAYS_PASS"]
	var is_escape: bool = sequence_type == PossessionSequence.PRESSURED_RECYCLE or action in ["PRESSURED_BACK_PASS", "SAFE_RECYCLE", "BACK_PASS"]
	if not is_combo and not is_escape:
		return {}
	var plan_type: String = "PRESSURE_ESCAPE" if is_escape or pressure > 0.62 else "CENTER_TRIANGLE"
	return {
		"plan_type": plan_type,
		"actor_before_release": "UNDER_PRESSURE_SCAN" if plan_type == "PRESSURE_ESCAPE" else "SCAN_FOR_COMBINATION",
		"actor_after_release": "ESCAPE_AFTER_PASS" if plan_type == "PRESSURE_ESCAPE" else "RETURN_OPTION",
		"receiver_before_release": "SHOW_TO_FEET",
		"receiver_after_release": "RECEIVE_PASS",
		"support_states": ["PASSING_ANGLE_LEFT", "PASSING_ANGLE_RIGHT", "THIRD_MAN_RUN"] if plan_type == "CENTER_TRIANGLE" else ["SAFE_SUPPORT", "RELIEF_OPTION", "RESET_OUTLET"],
		"defense_states": ["PRESS", "COVER_PASSING_LANE", "BLOCK_PASSING_LANE"],
		"timing": "scan_support_release_reposition"
	}

func _wide_attack_plan(ev: Dictionary, sequence_type: String) -> Dictionary:
	var action: String = str(ev.get("action", ""))
	var start: Vector2 = _dict_to_vec(ev.get("start", {}))
	var end: Vector2 = _dict_to_vec(ev.get("end", {}))
	var is_wide: bool = sequence_type in [PossessionSequence.WIDE_OVERLOAD_LEFT, PossessionSequence.WIDE_OVERLOAD_RIGHT, PossessionSequence.CUTBACK_ATTACK] or action in ["PASS_TO_WING", "CROSS", "CUTBACK"]
	if not is_wide:
		return {}
	var lane: String = "left" if end.x < 0.5 or start.x < 0.5 else "right"
	var final_choice: String = "CROSS"
	if action == "CUTBACK" or sequence_type == PossessionSequence.CUTBACK_ATTACK:
		final_choice = "CUTBACK"
	elif action == "PASS_TO_WING":
		final_choice = "PROGRESS_WIDE"
	elif action == "DRIBBLE":
		final_choice = "BYLINE_DRIVE"
	return {
		"lane": lane,
		"final_choice": final_choice,
		"ball_carrier_state": "BYLINE_DRIVE" if action in ["DRIBBLE", "CROSS"] else ("CUTBACK_SHAPE" if action == "CUTBACK" else "RECEIVE_WIDE"),
		"fullback_state": "OVERLAP_RUN",
		"inside_support_state": "HALF_SPACE_SUPPORT",
		"underlap_state": "UNDERLAP_SUPPORT",
		"box_states": ["BOX_NEAR_POST", "BOX_FAR_POST", "PENALTY_SPOT_RUN"] if final_choice == "CROSS" else ["CUTBACK_ZONE_ATTACK", "PENALTY_SPOT_RUN", "FAR_POST_HOLD"],
		"defense_states": ["WIDE_PRESS", "COVER_CUTBACK", "BOX_MARKING"],
		"timing": "wide_receive_overlap_decide_deliver"
	}

func _shot_keeper_plan(ev: Dictionary) -> Dictionary:
	var action: String = str(ev.get("action", ""))
	var restart_type: String = str(ev.get("restart_type", "OPEN_PLAY"))
	var loss_reason: String = str(ev.get("loss_reason", ""))
	if not action in ["SHOOT", "CROSS", "CUTBACK", "CORNER"] and loss_reason != "KEEPER_CLAIM":
		return {}
	var keeper_action: String = "SET_POSITION"
	var box_outcome: String = "OPEN_PLAY"
	if action == "SHOOT":
		keeper_action = "GOAL_CONCEDED" if bool(ev.get("goal", false)) else ("DIVE_SAVE" if restart_type == "CORNER" else "WATCH_WIDE_OR_COLLECT")
		box_outcome = "GOAL" if bool(ev.get("goal", false)) else restart_type
	elif loss_reason == "KEEPER_CLAIM":
		keeper_action = "CLAIM_CROSS"
		box_outcome = "KEEPER_POSSESSION"
	elif action in ["CROSS", "CORNER"]:
		keeper_action = "CLAIM_OR_SET"
		box_outcome = restart_type
	elif action == "CUTBACK":
		keeper_action = "SET_FOR_CUTBACK"
		box_outcome = restart_type
	return {
		"keeper_action": keeper_action,
		"box_outcome": box_outcome,
		"keeper_state": "KEEPER_DIVE" if action == "SHOOT" else ("KEEPER_CLAIM_CROSS" if action in ["CROSS", "CORNER"] or loss_reason == "KEEPER_CLAIM" else "KEEPER_ANGLE_COVER"),
		"defense_states": ["SHOT_BLOCK", "BOX_MARKING", "SECOND_BALL_DEFENSE"],
		"attacking_states": ["PENALTY_SPOT_RUN", "BOX_NEAR_POST", "BOX_FAR_POST"],
		"timing": "set_react_resolve_from_event"
	}

func _transition_plan(ev: Dictionary) -> Dictionary:
	if not bool(ev.get("turnover", false)):
		return {}
	var loss_reason: String = str(ev.get("loss_reason", ""))
	var restart_type: String = str(ev.get("restart_type", "OPEN_PLAY"))
	var open_play: bool = restart_type == "OPEN_PLAY" or restart_type == "KEEPER_POSSESSION"
	var transition_type: String = "OPEN_PLAY_COUNTER_PRESS" if open_play else "OUT_OF_PLAY_RESET"
	if loss_reason == "INTERCEPTED_PASS":
		transition_type = "INTERCEPTION_BREAK"
	elif loss_reason in ["BAD_TOUCH", "FAILED_DRIBBLE", "PRESSURE_MISTAKE"]:
		transition_type = "LOOSE_SECOND_BALL"
	elif loss_reason == "KEEPER_CLAIM":
		transition_type = "KEEPER_CLAIM_RESET"
	elif loss_reason == "OFFSIDE":
		transition_type = "OFFSIDE_RESET"
	return {
		"transition_type": transition_type,
		"loss_reason": loss_reason,
		"restart_type": restart_type,
		"losing_team_states": ["COUNTER_PRESS_REACT", "COUNTER_PRESS_COVER", "REST_DEFENSE_DROP"] if open_play else ["STOP_OUT_OF_PLAY", "RESET_SHAPE"],
		"winning_team_states": ["INTERCEPT_PASS", "SECOND_BALL_WINNER", "SECURE_POSSESSION"] if open_play else ["RESTART_SHAPE"],
		"ball_state_hint": "LOOSE_CONTEST" if transition_type == "LOOSE_SECOND_BALL" else ("INTERCEPTED" if transition_type == "INTERCEPTION_BREAK" else "RESET"),
		"timing": "loss_react_secure_or_reset"
	}

func _viewing_plan(ev: Dictionary, sequence_type: String) -> Dictionary:
	var action: String = str(ev.get("action", ""))
	var intensity: float = clampf(float(ev.get("visual_intensity", 0.35)), 0.10, 1.0)
	var bubble_radius: float = clampf(float(ev.get("play_bubble_radius", 0.26)), 0.14, 0.42)
	var tempo: String = "FLOW"
	var focus_mode: String = "BALL_FOLLOW"
	var duration_multiplier: float = 1.0
	var spotlight: bool = intensity > 0.58
	if action in RESTART_ACTIONS:
		tempo = "RESTART_BREATH"
		focus_mode = "RESTART_FOCUS"
		duration_multiplier = 1.08
	elif bool(ev.get("turnover", false)):
		tempo = "TRANSITION_SNAP"
		focus_mode = "TURNOVER_FOCUS"
		duration_multiplier = 0.96
		spotlight = true
	elif action in ["SHOOT", "CROSS", "CUTBACK", "CORNER"] or sequence_type in [PossessionSequence.CUTBACK_ATTACK, PossessionSequence.FINAL_THIRD_COMBINATION]:
		tempo = "FINAL_THIRD_HOLD"
		focus_mode = "BOX_FOCUS"
		duration_multiplier = 1.14
		spotlight = true
	elif action in ["ONE_TWO", "WALL_PASS", "SIDEWAYS_PASS"]:
		tempo = "COMBINATION_FLOW"
		focus_mode = "PASS_TRIANGLE_FOCUS"
		duration_multiplier = 1.02
	elif action in ["LONG_PASS", "THROUGH_BALL", "VERTICAL_PASS", "SWITCH_PLAY"]:
		tempo = "DIRECT_RELEASE"
		focus_mode = "LONG_PATH_FOCUS"
		duration_multiplier = 1.06
	return {
		"tempo": tempo,
		"focus_mode": focus_mode,
		"focus_radius": clampf(bubble_radius * (0.82 if spotlight else 1.0), 0.12, 0.40),
		"duration_multiplier": duration_multiplier,
		"spotlight": spotlight,
		"intensity": intensity,
		"timing": "smooth_focus_event_pacing"
	}

func _pressure_level(pressure: float) -> String:
	if pressure > 0.72:
		return "HIGH"
	if pressure > 0.38:
		return "MEDIUM"
	return "LOW"

func _risk_level(ev: Dictionary) -> String:
	var action: String = str(ev.get("action", ""))
	if action in ["THROUGH_BALL", "VERTICAL_PASS", "LONG_PASS", "CROSS", "CUTBACK", "SHOOT"]:
		return "HIGH"
	if action in ["ONE_TWO", "WALL_PASS", "SWITCH_PLAY", "DRIBBLE"]:
		return "MEDIUM"
	return "LOW"

func _sequence_label(sequence_type: String) -> String:
	match sequence_type:
		PossessionSequence.BUILD_FROM_BACK_SHORT:
			return "Build from back"
		PossessionSequence.CENTER_TRIANGLE_BUILDUP:
			return "Center triangle"
		PossessionSequence.WIDE_OVERLOAD_LEFT:
			return "Left overload"
		PossessionSequence.WIDE_OVERLOAD_RIGHT:
			return "Right overload"
		PossessionSequence.DIRECT_LONG_BALL:
			return "Direct long ball"
		PossessionSequence.PRESSURED_RECYCLE:
			return "Recycle under pressure"
		PossessionSequence.SWITCH_PLAY_SEQUENCE:
			return "Switch play"
		PossessionSequence.CUTBACK_ATTACK:
			return "Cutback attack"
		PossessionSequence.OFFSIDE_TRAP_OR_LINE_BREAK:
			return "Line break/offside"
	return sequence_type.capitalize()

func _dict_to_vec(v) -> Vector2:
	if typeof(v) == TYPE_DICTIONARY:
		return Vector2(float(v.get("x", 0.5)), float(v.get("y", 0.5)))
	return Vector2(0.5, 0.5)

func _zone_name_from_point(point: Vector2) -> String:
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
