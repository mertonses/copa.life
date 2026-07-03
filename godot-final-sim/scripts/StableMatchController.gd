extends Control

const TEST_INPUT_PATH: String = "res://data/test_match.json"
const PossessionSequence = preload("res://scripts/PossessionSequence.gd")
const MatchAudioDirectorScript = preload("res://scripts/audio/MatchAudioDirector.gd")

var home: TeamController = TeamController.new()
var away: TeamController = TeamController.new()
var ball: MatchBall = MatchBall.new()
var movement: MovementSystem = MovementSystem.new()
var pitch_mgr: PitchManager = PitchManager.new()
var event_generator: MatchEventGenerator = MatchEventGenerator.new()
var archive: MatchArchive = MatchArchive.new()
var tactical_director: TacticalDirector = TacticalDirector.new()
var spacing_manager: TeamSpacingManager = TeamSpacingManager.new()
var tactical_visual: TacticalVisualManager = TacticalVisualManager.new()
var audio_director: MatchAudioDirector = MatchAudioDirectorScript.new()

var event_list: Array = []
var event_index: int = -1
var current_event: Dictionary = {}
var event_timer: float = 0.0
var event_duration: float = 1.35
var score_home: int = 0
var score_away: int = 0
var minute: float = 0.0
var speed: float = 1.0
var paused: bool = false
var home_phase: String = "progression"
var away_phase: String = "defense"
var event_actor: PlayerAgent = null
var event_receiver: PlayerAgent = null
var recent_actor_ids: Array[int] = []
var event_start: Vector2 = Vector2.ZERO
var event_end: Vector2 = Vector2.ZERO
var event_action_started: bool = false
var event_action_delay: float = 0.35
var current_forced_sequence: String = ""
var view_focus_pos: Vector2 = Vector2(0.5, 0.5)
var view_focus_target: Vector2 = Vector2(0.5, 0.5)
var view_focus_radius: float = 0.28
var view_focus_step: float = 0.0
var view_tempo_label: String = "FLOW"
var goal_flash_timer: float = 0.0
var goal_flash_score: String = ""
var halftime_flash_timer: float = 0.0
var match_ended: bool = false
var home_xg: float = 0.0
var away_xg: float = 0.0
var home_shots: int = 0
var away_shots: int = 0
var home_momentum: float = 50.0
var active_cards: Array = []
var _live_timer: float = 0.0
var scrubber: HSlider = null
var instant_btn: Button = null

var field: Control
var status_text: String = ""
var log_lines: Array[String] = []
var log_colors: Array[String] = []

func _ready() -> void:
	home.tactical_director = tactical_director
	away.tactical_director = tactical_director
	audio_director.name = "MatchAudioDirector"
	add_child(audio_director)
	_build_ui()
	_setup_js_listener()
	_start_match()

func _poll_js_control() -> void:
	var raw = JavaScriptBridge.eval("window._gcm?JSON.stringify(window._gcm):null", true)
	if typeof(raw) != TYPE_STRING or raw == "null":
		return
	JavaScriptBridge.eval("window._gcm=null;", true)
	var msg = JSON.parse_string(raw)
	if typeof(msg) != TYPE_DICTIONARY:
		return
	match str(msg.get("action", "")):
		"pause": paused = true
		"play": paused = false
		"speed": speed = clampf(float(msg.get("value", 1.0)), 0.25, 32.0)
		"instant": _instant_result()

func _setup_js_listener() -> void:
	if not OS.has_feature("web"):
		return
	JavaScriptBridge.eval("window.addEventListener('message',function(e){if(e.data&&e.data.type==='copa_control')window._gcm=e.data;});", true)

func _process(delta: float) -> void:
	if OS.has_feature("web"):
		_poll_js_control()
	if paused:
		return
	var dt: float = delta * speed
	event_timer -= dt
	_update_audio_context(dt)
	tactical_director.update(home, away, ball, dt, current_forced_sequence, _event_defensive_response(current_event))
	_update_possession_beats(dt)
	home.update_shape(ball, away, dt, home_phase)
	away.update_shape(ball, home, dt, away_phase)
	_apply_event_intents()
	spacing_manager.apply_spacing_rules(home, ball, tactical_director)
	spacing_manager.apply_spacing_rules(away, ball, tactical_director)
	_apply_global_ball_contest()
	movement.update_players(_all_players(), dt, pitch_mgr)
	ball.update(dt, null)
	_update_view_focus(dt)
	_try_open_play_actor_pickup()
	if not event_action_started and event_timer <= event_duration - event_action_delay and _possession_beat_allows_release():
		_start_event_action()
	if ball.owner == null and event_receiver != null and ball.can_be_controlled_by(event_receiver):
		if bool(current_event.get("success", false)):
			ball.set_owner(event_receiver, "event_receiver_control")
	_resolve_loose_ball()
	_drain_ball_transition_log()
	if event_timer <= 0.0:
		if _should_wait_for_open_play_control():
			event_timer = 0.25
			field.queue_redraw()
			return
		_finish_event()
		_start_next_event()
	if goal_flash_timer > 0.0:
		goal_flash_timer -= delta
	if halftime_flash_timer > 0.0:
		halftime_flash_timer -= delta
	_update_labels()
	_live_timer -= delta
	if _live_timer <= 0.0:
		_live_timer = 3.0
		_post_live_update()
	field.queue_redraw()

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		match event.keycode:
			KEY_SPACE:
				_toggle_pause()
			KEY_R:
				_start_match()
			KEY_1:
				speed = 1.0
			KEY_2:
				speed = 2.0
			KEY_4:
				speed = 4.0

func _build_ui() -> void:
	field = Control.new()
	field.set_anchors_preset(Control.PRESET_FULL_RECT)
	field.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	field.size_flags_vertical = Control.SIZE_EXPAND_FILL
	field.draw.connect(_draw_field)
	add_child(field)
	scrubber = HSlider.new()
	scrubber.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	scrubber.position = Vector2(0, -18)
	scrubber.size = Vector2(0, 16)
	scrubber.min_value = 0.0
	scrubber.max_value = 260.0
	scrubber.step = 1.0
	scrubber.value = 0.0
	scrubber.focus_mode = Control.FOCUS_NONE
	scrubber.value_changed.connect(_on_scrubber_changed)
	add_child(scrubber)

func _on_speed_button(label: String) -> void:
	match label:
		"1x": speed = 1.0
		"2x": speed = 2.0
		"4x": speed = 4.0

func _instant_result() -> void:
	speed = 999.0
	paused = false

func _on_scrubber_changed(value: float) -> void:
	var target_idx: int = int(value)
	if target_idx <= event_index:
		return
	speed = 32.0
	paused = false

func _apply_injuries(injuries: Array) -> void:
	for entry in injuries:
		var slot: int = int(entry) if typeof(entry) == TYPE_INT or typeof(entry) == TYPE_FLOAT else -1
		if typeof(entry) == TYPE_DICTIONARY:
			slot = int(entry.get("slot", -1))
		if slot >= 0 and slot < home.players.size():
			home.players[slot].is_injured = true

func _start_match() -> void:
	var input: Dictionary = _load_input()
	var final_penalty: float = float(input.get("final_penalty", 0))
	if final_penalty > 0.0:
		input["home_power"] = maxf(40.0, float(input.get("home_power", 84.0)) - final_penalty)
	home.setup(0, str(input.get("home_name", "copa.life XI")), "4-4-2", str(input.get("style", "gegen")))
	away.setup(1, str(input.get("away_name", "Final Rakibi")), "4-3-3", "balanced")
	var replay_data: Dictionary = event_generator.generate(input)
	event_list = replay_data.get("events", [])
	var archive_warnings: Array[String] = archive.validate(replay_data)
	event_index = -1
	score_home = 0
	score_away = 0
	minute = 0.0
	current_event = {}
	current_forced_sequence = ""
	view_focus_pos = Vector2(0.5, 0.5)
	view_focus_target = view_focus_pos
	view_focus_radius = 0.28
	view_focus_step = 0.0
	view_tempo_label = "FLOW"
	log_lines.clear()
	log_colors.clear()
	recent_actor_ids.clear()
	goal_flash_timer = 0.0
	goal_flash_score = ""
	halftime_flash_timer = 0.0
	match_ended = false
	home_xg = 0.0
	away_xg = 0.0
	home_shots = 0
	away_shots = 0
	home_momentum = 50.0
	active_cards = input.get("cards_detail", [])
	if active_cards.is_empty():
		for c in input.get("cards", []):
			active_cards.append({"id": str(c), "variant": "normal"})
	var injuries: Array = input.get("injuries", [])
	_apply_injuries(injuries)
	audio_director.reset()
	if scrubber != null:
		scrubber.max_value = maxf(1.0, float(event_list.size() - 1))
		scrubber.value = 0.0
	var starter: PlayerAgent = home.players[9]
	ball.reset(starter.pos)
	ball.set_owner(starter, "kickoff")
	_log("Event archive is source of truth. Visual layer replays it.", "#d6c8a8")
	_log("Generated %d weighted events." % event_list.size(), "#d6c8a8")
	if archive_warnings.is_empty():
		_log("Archive validator: OK.", "#a7f3d0")
	else:
		_log("Archive validator: %s" % archive_warnings[0], "#fca5a5")
	_start_next_event()

func _load_input() -> Dictionary:
	if get_tree().has_meta("godot_match_input"):
		var meta = get_tree().get_meta("godot_match_input")
		if typeof(meta) == TYPE_DICTIONARY:
			return meta
	if OS.has_feature("web"):
		var raw = JavaScriptBridge.eval("localStorage.getItem('copa_godot_match')", true)
		if typeof(raw) == TYPE_STRING and raw != "" and raw != "null":
			JavaScriptBridge.eval("localStorage.removeItem('copa_godot_match')", true)
			var parsed = JSON.parse_string(raw)
			if typeof(parsed) == TYPE_DICTIONARY:
				return parsed
	if not FileAccess.file_exists(TEST_INPUT_PATH):
		return {}
	var parsed = JSON.parse_string(FileAccess.get_file_as_string(TEST_INPUT_PATH))
	return parsed if typeof(parsed) == TYPE_DICTIONARY else {}

func _start_next_event() -> void:
	event_index += 1
	if scrubber != null:
		scrubber.set_value_no_signal(float(event_index))
	if event_index >= event_list.size():
		paused = true
		match_ended = true
		_log("Full time. %d - %d" % [score_home, score_away], "#f6c453")
		_post_result_to_parent()
		return
	current_event = event_list[event_index]
	minute = float(current_event.get("minute", minute))
	event_duration = _event_duration_for(current_event)
	event_timer = event_duration
	event_action_delay = _event_release_delay_for(current_event)
	event_action_started = false
	_apply_event(current_event)

func _apply_event(ev: Dictionary) -> void:
	var team_id: int = int(ev.get("team", 0))
	var team: TeamController = home if team_id == 0 else away
	var action: String = str(ev.get("action", "SHORT_PASS"))
	var archived_start: Vector2 = _dict_to_vec(ev.get("start", {"x": 0.5, "y": 0.5}))
	event_start = _visual_event_start(archived_start, team_id, action)
	event_end = _dict_to_vec(ev.get("end", {"x": 0.5, "y": 0.5}))
	var receiver_role: String = str(ev.get("receiver_role", "CM"))
	event_actor = _player_for_role(team, str(ev.get("actor_role", "CM")), event_start)
	event_receiver = null
	if not (action in ["DRIBBLE", "SHOOT"]) and receiver_role != "":
		event_receiver = _player_for_role(team, receiver_role, event_end)
	if ball.owner != null and ball.owner.team_id == team_id and not _is_restart_action(action):
		event_actor = ball.owner
	elif _is_open_play_action(action) and (ball.owner == null or ball.owner.team_id != team_id):
		var nearest_actor: PlayerAgent = _nearest_non_keeper(team, ball.pos)
		if nearest_actor != null:
			event_actor = nearest_actor
	var archived_sequence: String = str(ev.get("attacking_sequence", ""))
	var visual_pattern: String = archived_sequence if archived_sequence != "" else str(ev.get("pattern", "BUILD_UP_CENTER"))
	_set_phase(team_id, str(ev.get("phase", "progression")), visual_pattern)
	current_forced_sequence = visual_pattern if visual_pattern != "" else _sequence_for_event(action, str(ev.get("pattern", "BUILD_UP_CENTER")), str(ev.get("phase", "progression")))
	recent_actor_ids.push_back(event_actor.id)
	if recent_actor_ids.size() > 3:
		recent_actor_ids.pop_front()
	event_actor.target = event_start
	event_actor.current_state = "PREPARE_ACTION"
	if _is_restart_action(action) and ball.ball_state == MatchBall.OUT_OF_PLAY:
		event_actor.pos = event_start
		event_actor.target = event_start
		ball.set_owner(event_actor, "restart_actor_sync")
	elif ball.owner == null or ball.owner.team_id != team_id:
		if _is_open_play_action(action):
			ball.make_loose("open_play_actor_runs_to_ball")
			event_actor.target = ball.pos
			event_actor.current_state = "CHASE_LOOSE_BALL"
		else:
			ball.set_owner(event_actor, "event_actor_sync")
	elif ball.owner != event_actor and not _is_open_play_action(action):
		ball.set_owner(event_actor, "event_actor_sync")
	if event_receiver != null:
		event_receiver.target = _receiver_run_target(action, event_receiver, event_end, team_id)
		event_receiver.current_state = "RECEIVE_PASS"
	audio_director.on_event_prepared(event_index, ev, event_start, event_end, event_actor, event_receiver, speed)
	_log("%02d' %s" % [int(minute), str(ev.get("label", action))], "#b9d7ff")

func _start_event_action() -> void:
	if current_event.is_empty() or event_actor == null:
		return
	event_action_started = true
	var action: String = str(current_event.get("action", "SHORT_PASS"))
	var action_duration: float = maxf(0.24, event_timer)
	var action_end: Vector2 = _action_target_for(action)
	var path: Array[Vector2] = _event_path_points(current_event, event_start, action_end)
	audio_director.on_action_started(current_event, event_start, action_end, event_actor, event_receiver, speed)
	match action:
		"DRIBBLE":
			event_actor.target = event_end
			event_actor.current_state = "DRIBBLE"
			ball.set_owner(event_actor, "dribble")
		"SHOOT", "FREE_KICK_DIRECT", "HEADED":
			event_actor.current_state = "SHOOT"
			ball.start_path_action(event_actor, null, path, action_duration, MatchBall.SHOOTING, "event_shot_path")
		"CROSS", "CORNER":
			ball.start_path_action(event_actor, event_receiver, path, action_duration, MatchBall.CROSSING, "event_cross_path")
		"LONG_PASS", "THROUGH_BALL", "GOAL_KICK_LONG", "KEEPER_LONG", "VERTICAL_PASS", "SWITCH_PLAY":
			ball.start_path_action(event_actor, event_receiver, path, action_duration, MatchBall.PASSING, action.to_lower() + "_path")
		"THROW_IN", "FREE_KICK_SHORT":
			ball.start_path_action(event_actor, event_receiver, path, action_duration, MatchBall.PASSING, "throw_in_path")
		"ONE_TWO", "WALL_PASS", "SIDEWAYS_PASS", "CUTBACK", "PRESSURED_BACK_PASS", "SAFE_RECYCLE":
			ball.start_path_action(event_actor, event_receiver, path, action_duration, MatchBall.PASSING, action.to_lower() + "_path")
		_:
			ball.start_path_action(event_actor, event_receiver, path, action_duration, MatchBall.PASSING, action.to_lower() + "_path")

func _finish_event() -> void:
	if current_event.is_empty():
		return
	score_home = int(current_event.get("score_home", score_home))
	score_away = int(current_event.get("score_away", score_away))
	var action: String = str(current_event.get("action", "SHORT_PASS"))
	var team_id: int = int(current_event.get("team", 0))
	var ev_xg: float = float(current_event.get("xg", 0.0))
	var ev_xt: float = float(current_event.get("xThreat", 0.0))
	if action in ["SHOOT", "FREE_KICK_DIRECT", "HEADED"]:
		if team_id == 0: home_shots += 1
		else: away_shots += 1
	if team_id == 0:
		home_xg += ev_xg
	else:
		away_xg += ev_xg
	var momentum_shift: float = ev_xt * (1.0 if team_id == 0 else -1.0)
	if bool(current_event.get("goal", false)):
		momentum_shift += 8.0 if team_id == 0 else -8.0
	elif bool(current_event.get("turnover", false)):
		momentum_shift *= -0.5
	home_momentum = clampf(home_momentum + momentum_shift + (50.0 - home_momentum) * 0.06, 10.0, 90.0)
	if action == "KICK_OFF" and minute >= 44.0 and halftime_flash_timer <= 0.0:
		halftime_flash_timer = 2.4
		_log("Devre arası.", "#d6c8a8")
	if bool(current_event.get("success", false)) and action == "DRIBBLE" and event_actor != null:
		ball.set_owner(event_actor, "dribble_success")
	elif bool(current_event.get("success", false)) and event_receiver != null:
		_claim_ball_if_close(event_receiver, "event_success")
	elif bool(current_event.get("turnover", false)):
		var opp: TeamController = away if int(current_event.get("team", 0)) == 0 else home
		var loss_reason: String = str(current_event.get("loss_reason", "TURNOVER"))
		var restart_type: String = str(current_event.get("restart_type", "OPEN_PLAY"))
		if restart_type in ["THROW_IN", "GOAL_KICK", "CORNER", "INDIRECT_FREE_KICK", "GOAL_KICK_OR_CORNER", "GOAL_KICK_OR_REBOUND"]:
			ball.set_out_of_play(restart_type.to_lower())
		else:
			_apply_turnover_result(opp, loss_reason)
		_log("%02d' %s" % [int(minute), _loss_reason_label(loss_reason)], "#fca5a5")
	elif bool(current_event.get("goal", false)):
		_log("%02d' GOAL! %d-%d" % [int(minute), score_home, score_away], "#4ade80")
		goal_flash_timer = 1.2
		goal_flash_score = "%d - %d" % [score_home, score_away]
		_post_event_to_parent("GOL! %d-%d" % [score_home, score_away], true)
		_post_live_update()
	elif action == "SHOOT" and str(current_event.get("restart_type", "OPEN_PLAY")) in ["GOAL_KICK", "CORNER"]:
		ball.set_out_of_play(str(current_event.get("restart_type", "OPEN_PLAY")).to_lower())
	else:
		ball.make_loose("event_failed")
	audio_director.on_event_finished(current_event, ball.pos, speed)

func _apply_turnover_result(opponent: TeamController, reason: String) -> void:
	match reason:
		"INTERCEPTED_PASS":
			var interceptor: PlayerAgent = _best_pass_lane_interceptor(opponent)
			if interceptor != null:
				interceptor.current_state = "INTERCEPT_PASS"
				interceptor.target = ball.pos
			_claim_ball_if_close(interceptor if interceptor != null else opponent.nearest_to(ball.pos), "intercepted_pass", 0.075)
		"KEEPER_CLAIM":
			_claim_ball_if_close(opponent.players[0], "keeper_claim", 0.090)
		"OVERHIT_PASS", "UNDERHIT_PASS", "BAD_TOUCH", "FAILED_DRIBBLE", "PRESSURE_MISTAKE":
			ball.make_loose(reason.to_lower())
			_mark_second_ball_contest(opponent)
		_:
			_claim_ball_if_close(opponent.nearest_to(ball.pos), "event_turnover", 0.075)

func _mark_second_ball_contest(opponent: TeamController) -> void:
	var original_team: TeamController = home if int(current_event.get("team", 0)) == 0 else away
	var winner: PlayerAgent = _nearest_non_keeper(opponent, ball.pos)
	var presser: PlayerAgent = _nearest_non_keeper(original_team, ball.pos)
	if winner != null:
		winner.current_state = "SECOND_BALL_WINNER"
		winner.target = ball.pos
	if presser != null:
		presser.current_state = "COUNTER_PRESS_REACT"
		presser.target = ball.pos

func _claim_ball_if_close(player: PlayerAgent, reason: String, max_distance: float = 0.082) -> void:
	if player == null:
		ball.make_loose("%s_no_player" % reason)
		return
	if player.pos.distance_to(ball.pos) <= max_distance:
		ball.set_owner(player, reason)
		return
	player.target = ball.pos
	player.current_state = "CHASE_LOOSE_BALL"
	ball.make_loose("%s_wait_for_control" % reason)

func _try_open_play_actor_pickup() -> void:
	if current_event.is_empty() or event_actor == null:
		return
	var action: String = str(current_event.get("action", ""))
	if not _is_open_play_action(action):
		return
	var team_id: int = int(current_event.get("team", 0))
	if ball.owner != null:
		if ball.owner.team_id == team_id and ball.owner != event_actor:
			event_actor = ball.owner
			event_start = ball.pos
		elif ball.owner.team_id != team_id:
			ball.make_loose("archive_possession_contest")
			event_actor.target = ball.pos
			event_actor.current_state = "CHASE_LOOSE_BALL"
		return
	event_actor.target = ball.pos
	event_actor.current_state = "CHASE_LOOSE_BALL"
	if ball.can_be_controlled_by(event_actor) or event_actor.pos.distance_to(ball.pos) <= 0.082:
		ball.set_owner(event_actor, "open_play_actor_control")
		event_start = ball.pos

func _should_wait_for_open_play_control() -> bool:
	if current_event.is_empty() or event_actor == null or event_action_started:
		return false
	var action: String = str(current_event.get("action", ""))
	if not _is_open_play_action(action):
		return false
	if ball.owner == event_actor:
		return false
	event_actor.target = ball.pos
	event_actor.current_state = "CHASE_LOOSE_BALL"
	return event_actor.pos.distance_to(ball.pos) > 0.082

func _best_pass_lane_interceptor(opponent: TeamController) -> PlayerAgent:
	var best: PlayerAgent = null
	var best_d: float = 999.0
	var segment: Vector2 = event_end - event_start
	var len_sq: float = maxf(0.0001, segment.length_squared())
	for p in opponent.players:
		if p.is_goalkeeper():
			continue
		var t: float = clampf((p.pos - event_start).dot(segment) / len_sq, 0.0, 1.0)
		var closest: Vector2 = event_start + segment * t
		var d: float = p.pos.distance_to(closest)
		if d < best_d:
			best_d = d
			best = p
	return best

func _loss_reason_label(reason: String) -> String:
	match reason:
		"BAD_TOUCH":
			return "bad touch under pressure"
		"TACKLED":
			return "tackled"
		"INTERCEPTED_PASS":
			return "pass intercepted"
		"OVERHIT_PASS":
			return "overhit pass"
		"UNDERHIT_PASS":
			return "underhit pass"
		"PRESSURE_MISTAKE":
			return "pressure forces mistake"
		"FAILED_DRIBBLE":
			return "failed dribble"
		"KEEPER_CLAIM":
			return "keeper claims"
		"TACKLED":
			return "tackled"
		"OFFSIDE":
			return "offside"
		"OUT_OF_PLAY":
			return "out of play"
	return "turnover"

func _set_phase(team_id: int, phase: String, pattern: String) -> void:
	if team_id == 0:
		home_phase = phase
		away_phase = "press" if phase in ["build_up", "progression"] else "defense"
		home.current_attack_pattern = pattern
		home.forced_attack_pattern = pattern
		away.forced_attack_pattern = ""
	else:
		away_phase = phase
		home_phase = "press" if phase in ["build_up", "progression"] else "defense"
		away.current_attack_pattern = pattern
		away.forced_attack_pattern = pattern
		home.forced_attack_pattern = ""

func _sequence_for_event(action: String, pattern: String, phase: String) -> String:
	if action == "CROSS":
		return TacticalDirector.CROSS_SEQUENCE
	if action == "CUTBACK":
		return TacticalDirector.CUTBACK_SEQUENCE
	if action == "LONG_PASS" or action == "THROUGH_BALL" or action == "VERTICAL_PASS":
		return TacticalDirector.DIRECT_LONG_BALL
	if action in ["SHOOT", "FREE_KICK_DIRECT", "HEADED"]:
		return TacticalDirector.SHOT_SEQUENCE
	if phase == "final_third" and action in ["BACK_PASS", "SHORT_PASS"]:
		return TacticalDirector.CUTBACK_SEQUENCE
	if action in ["BACK_PASS", "PRESSURED_BACK_PASS", "SAFE_RECYCLE", "FREE_KICK_SHORT"]:
		return TacticalDirector.RECYCLE_POSSESSION
	if action in ["ONE_TWO", "WALL_PASS", "SIDEWAYS_PASS"]:
		return TacticalDirector.BUILD_UP_CENTER if phase != "final_third" else TacticalDirector.FINAL_THIRD_COMBINATION
	if action == "SWITCH_PLAY":
		return TacticalDirector.ATTACK_RIGHT if pattern == "ATTACK_RIGHT" else TacticalDirector.ATTACK_LEFT
	if phase == "final_third":
		return TacticalDirector.FINAL_THIRD_COMBINATION
	if pattern == "ATTACK_LEFT":
		return TacticalDirector.ATTACK_LEFT
	if pattern == "ATTACK_RIGHT":
		return TacticalDirector.ATTACK_RIGHT
	if pattern == "RECYCLE_POSSESSION":
		return TacticalDirector.RECYCLE_POSSESSION
	if pattern == "DIRECT_LONG_BALL":
		return TacticalDirector.DIRECT_LONG_BALL
	return TacticalDirector.BUILD_UP_CENTER

func _duration_for(action: String, phase: String = "") -> float:
	match action:
		"KICK_OFF":
			return 1.85
		"CORNER":
			return 3.15
		"THROW_IN":
			return 2.05
		"FREE_KICK_SHORT":
			return 1.95
		"FREE_KICK_DIRECT":
			return 2.20
		"HEADED":
			return 1.80
		"GOAL_KICK_SHORT", "KEEPER_BUILD_UP":
			return 2.45
		"GOAL_KICK_LONG", "KEEPER_LONG":
			return 3.05
		"DRIBBLE":
			return 2.45
		"CROSS":
			return 2.85
		"LONG_PASS", "THROUGH_BALL":
			return 2.75
		"SHOOT":
			return 1.65
		"BACK_PASS":
			return 2.05
		"ONE_TWO", "WALL_PASS":
			return 1.70
		"SIDEWAYS_PASS", "SAFE_RECYCLE", "PRESSURED_BACK_PASS":
			return 1.95
		"SWITCH_PLAY":
			return 2.55
		"CUTBACK":
			return 2.10
		"VERTICAL_PASS":
			return 2.35
		_:
			return 2.25 if phase in ["build_up", "progression"] else 2.05

func _event_duration_for(ev: Dictionary) -> float:
	var beat_duration: float = float(ev.get("beat_duration", 0.0))
	if beat_duration > 0.0:
		return beat_duration
	return _duration_for(str(ev.get("action", "SHORT_PASS")), str(ev.get("phase", "progression")))

func _event_release_delay_for(ev: Dictionary) -> float:
	var duration: float = _event_duration_for(ev)
	var raw_release_at: float = float(ev.get("release_at", -1.0))
	if raw_release_at >= 0.0:
		var release_at: float = clampf(raw_release_at, 0.0, 0.90)
		return clampf(duration * release_at, 0.18, minf(1.35, duration * 0.72))
	var action: String = str(ev.get("action", ""))
	if action in ["LONG_PASS", "THROUGH_BALL", "VERTICAL_PASS", "GOAL_KICK_LONG", "KEEPER_LONG"]:
		return minf(1.05, duration * 0.42)
	return minf(0.85, duration * 0.32)

func _event_defensive_response(ev: Dictionary) -> String:
	var response: String = str(ev.get("defensive_response", ""))
	if response != "":
		return response
	return str(ev.get("defensive_reaction", ""))

func _update_audio_context(delta: float) -> void:
	if audio_director == null:
		return
	var attacking_team: int = -1
	if ball.owner != null:
		attacking_team = ball.owner.team_id
	elif not current_event.is_empty():
		attacking_team = int(current_event.get("team", -1))
	var score_close: bool = abs(score_home - score_away) <= 1
	audio_director.update_context(delta, {
		"ball_pos": ball.pos,
		"attacking_team": attacking_team,
		"action": str(current_event.get("action", "")) if not current_event.is_empty() else "",
		"minute": minute,
		"score_close": score_close,
		"box_occupation": _box_occupation_for_audio(attacking_team),
		"speed": speed
	})

func _box_occupation_for_audio(attacking_team: int) -> float:
	if attacking_team < 0:
		return 0.0
	var attacking: TeamController = home if attacking_team == 0 else away
	var goal_y: float = 0.06 if attacking_team == 0 else 0.94
	var count: int = 0
	for p in attacking.players:
		if p.is_goalkeeper():
			continue
		if abs(p.pos.y - goal_y) < 0.20 and abs(p.pos.x - 0.5) < 0.28:
			count += 1
	return clampf(float(count) / 5.0, 0.0, 1.0)

func _player_for_role(team: TeamController, role: String, preferred_pos: Vector2) -> PlayerAgent:
	if role == "GK" and team.players.size() > 0:
		return team.players[0]
	var best: PlayerAgent = null
	var best_score: float = -999.0
	for p in team.players:
		if p.is_goalkeeper():
			continue
		var score: float = _role_candidate_score(p, role, preferred_pos, team.side)
		if score > best_score:
			best = p
			best_score = score
	if best != null:
		return best
	return team.nearest_to(preferred_pos)

func _role_candidate_score(player: PlayerAgent, wanted_role: String, preferred_pos: Vector2, team_id: int) -> float:
	var score: float = 0.0
	var dist: float = player.pos.distance_to(preferred_pos)
	score -= dist * 2.25
	if wanted_role == "" or player.role == wanted_role:
		score += 2.2
	elif _role_family(player.role) == _role_family(wanted_role):
		score += 1.1
	if player.has_ball:
		score += 0.3
	var recent_idx: int = recent_actor_ids.rfind(player.id)
	if recent_idx >= 0:
		var recency: float = float(recent_actor_ids.size() - recent_idx)
		score -= recency * 0.85
	if player.current_state in ["RECEIVE_PASS", "MAKE_RUN", "TRIANGLE_SUPPORT", "PASSING_ANGLE_LEFT", "PASSING_ANGLE_RIGHT", "RETURN_OPTION", "CUTBACK_OPTION"]:
		score += 0.25
	var dir: float = -1.0 if team_id == 0 else 1.0
	var forward_fit: float = (player.pos.y - preferred_pos.y) * -dir
	if wanted_role in ["ST", "LW", "RW", "AM"]:
		score += clampf(forward_fit, -0.3, 0.3)
	if wanted_role in ["CB", "DM", "CM"]:
		score += clampf(0.45 - abs(player.pos.y - preferred_pos.y), -0.2, 0.35)
	score += player.decision * 0.003 + player.positioning * 0.002
	return score

func _role_family(role: String) -> String:
	if role in ["CB", "LB", "RB", "LWB", "RWB", "WB"]:
		return "DEF"
	if role in ["DM", "CM", "AM", "LM", "RM"]:
		return "MID"
	if role in ["LW", "RW", "ST"]:
		return "FWD"
	return role

func _dict_to_vec(v) -> Vector2:
	if typeof(v) == TYPE_DICTIONARY:
		return Vector2(float(v.get("x", 0.5)), float(v.get("y", 0.5)))
	return Vector2(0.5, 0.5)

func _visual_event_start(archived_start: Vector2, team_id: int, action: String) -> Vector2:
	if _is_restart_action(action):
		return archived_start
	if ball.ball_state == MatchBall.OUT_OF_PLAY:
		return archived_start
	if ball.owner != null and ball.owner.team_id == team_id:
		return ball.pos
	if ball.ball_state in [MatchBall.LOOSE, MatchBall.PASSING, MatchBall.CROSSING, MatchBall.SHOOTING]:
		return ball.pos
	return archived_start

func _is_restart_action(action: String) -> bool:
	return action in [
		"KICK_OFF",
		"CORNER",
		"THROW_IN",
		"GOAL_KICK_SHORT",
		"GOAL_KICK_LONG",
		"KEEPER_BUILD_UP",
		"KEEPER_LONG",
		"FREE_KICK_SHORT"
	]

func _is_open_play_action(action: String) -> bool:
	return not _is_restart_action(action)

func _event_path_points(ev: Dictionary, fallback_start: Vector2, fallback_end: Vector2) -> Array[Vector2]:
	var points: Array[Vector2] = []
	var raw_path: Array = ev.get("path", [])
	for item in raw_path:
		points.append(_dict_to_vec(item))
	if points.size() < 2:
		points = [fallback_start, fallback_end]
	else:
		points[0] = fallback_start
		points[points.size() - 1] = fallback_end
	return points

func _action_target_for(action: String) -> Vector2:
	if action in ["LONG_PASS", "THROUGH_BALL", "GOAL_KICK_LONG", "KEEPER_LONG", "VERTICAL_PASS", "SWITCH_PLAY"] and event_receiver != null:
		if current_event.has("projected_receiver_target"):
			return _dict_to_vec(current_event.get("projected_receiver_target"))
		return tactical_director.get_projected_run_target(event_receiver, event_actor, TacticalDirector.DIRECT_LONG_BALL)
	return event_end

func _receiver_run_target(action: String, receiver: PlayerAgent, end: Vector2, team_id: int) -> Vector2:
	if receiver == null:
		return end
	var dir: float = -1.0 if team_id == 0 else 1.0
	match action:
		"THROUGH_BALL", "GOAL_KICK_LONG", "KEEPER_LONG", "VERTICAL_PASS":
			if current_event.has("projected_receiver_target"):
				return _dict_to_vec(current_event.get("projected_receiver_target"))
			return tactical_director.get_projected_run_target(receiver, event_actor, TacticalDirector.DIRECT_LONG_BALL)
		"LONG_PASS":
			if current_event.has("projected_receiver_target"):
				return _dict_to_vec(current_event.get("projected_receiver_target"))
			return tactical_director.get_projected_run_target(receiver, event_actor, TacticalDirector.DIRECT_LONG_BALL)
		"CROSS", "CORNER":
			if current_event.has("projected_receiver_target"):
				return _dict_to_vec(current_event.get("projected_receiver_target"))
			return Vector2(clampf(end.x + (receiver.base_pos.x - 0.5) * 0.12, 0.24, 0.76), clampf(end.y - dir * 0.025, 0.06, 0.94))
		"GOAL_KICK_SHORT", "KEEPER_BUILD_UP":
			return Vector2(clampf(end.x, 0.18, 0.82), clampf(end.y, 0.08, 0.92))
		"KICK_OFF":
			return end
		"THROW_IN":
			return Vector2(clampf(end.x, 0.06, 0.94), clampf(end.y, 0.06, 0.94))
		"FREE_KICK_SHORT":
			return end
		"ONE_TWO", "WALL_PASS":
			return Vector2(clampf(end.x, 0.08, 0.92), clampf(end.y + dir * 0.025, 0.06, 0.94))
		"SIDEWAYS_PASS", "SWITCH_PLAY":
			return Vector2(clampf(end.x, 0.06, 0.94), clampf(end.y, 0.06, 0.94))
		"CUTBACK":
			return Vector2(clampf(end.x, 0.32, 0.68), clampf(end.y, 0.06, 0.94))
		"PRESSURED_BACK_PASS", "SAFE_RECYCLE":
			return Vector2(clampf(end.x, 0.08, 0.92), clampf(end.y - dir * 0.020, 0.06, 0.94))
		"PASS_TO_WING":
			return Vector2(clampf(end.x, 0.06, 0.94), clampf(end.y + dir * 0.020, 0.06, 0.94))
		"BACK_PASS":
			return Vector2(clampf(end.x, 0.08, 0.92), clampf(end.y - dir * 0.020, 0.06, 0.94))
	return end

func _is_line_break_action(action: String) -> bool:
	return action in ["LONG_PASS", "THROUGH_BALL", "VERTICAL_PASS", "GOAL_KICK_LONG", "KEEPER_LONG"]

func _is_combination_action(action: String) -> bool:
	return action in ["ONE_TWO", "WALL_PASS", "SIDEWAYS_PASS", "SHORT_PASS"]

func _is_pressure_escape_action(action: String) -> bool:
	return action in ["PRESSURED_BACK_PASS", "SAFE_RECYCLE", "BACK_PASS"]

func _is_wide_action(action: String) -> bool:
	return action in ["PASS_TO_WING", "DRIBBLE", "CROSS", "CUTBACK"]

func _wide_lane_x(sequence_type: String, action: String) -> float:
	var plan: Dictionary = current_event.get("wide_attack_plan", {})
	var lane: String = str(plan.get("lane", ""))
	if lane == "left" or sequence_type == PossessionSequence.WIDE_OVERLOAD_LEFT:
		return 0.095
	if lane == "right" or sequence_type == PossessionSequence.WIDE_OVERLOAD_RIGHT:
		return 0.905
	if event_end.x < 0.5:
		return 0.095
	return 0.905

func _halfspace_x(lane_x: float) -> float:
	return 0.30 if lane_x < 0.5 else 0.70

func _byline_y(team_id: int) -> float:
	return 0.13 if team_id == 0 else 0.87

func _box_run_y(team_id: int, offset: float = 0.0) -> float:
	return clampf((0.21 if team_id == 0 else 0.79) + offset, 0.08, 0.92)

func _line_break_hold_target(player: PlayerAgent, team_id: int) -> Vector2:
	var defending: TeamController = away if team_id == 0 else home
	var line_y: float = defending.offside_line_y
	var safe_margin: float = 0.026
	var y: float = line_y + safe_margin if team_id == 0 else line_y - safe_margin
	var ball_y: float = ball.pos.y if ball != null else event_start.y
	if team_id == 0:
		y = maxf(y, ball_y - 0.18)
	else:
		y = minf(y, ball_y + 0.18)
	var run_target: Vector2 = _dict_to_vec(current_event.get("projected_receiver_target", {"x": event_end.x, "y": event_end.y}))
	var x: float = clampf(run_target.x + (player.base_pos.x - 0.5) * 0.055, 0.10, 0.90)
	return Vector2(x, clampf(y, 0.08, 0.92))

func _line_hold_y_for_defending_team(team: TeamController) -> float:
	var step: float = -0.012 if team.side == 0 else 0.012
	return clampf(team.offside_line_y + step, 0.10, 0.90)

func _combination_return_target(player: PlayerAgent, team_id: int) -> Vector2:
	var dir: float = -1.0 if team_id == 0 else 1.0
	var side: float = -0.055 if player.pos.x > ball.pos.x else 0.055
	return Vector2(clampf(ball.pos.x + side, 0.10, 0.90), clampf(ball.pos.y - dir * 0.055, 0.08, 0.92))

func _receiver_show_target(receiver: PlayerAgent, team_id: int) -> Vector2:
	var dir: float = -1.0 if team_id == 0 else 1.0
	var side: float = 0.040 if receiver.base_pos.x >= 0.5 else -0.040
	return Vector2(clampf(event_start.x + side, 0.10, 0.90), clampf(event_start.y + dir * 0.055, 0.08, 0.92))

func _apply_event_intents() -> void:
	if current_event.is_empty() or event_actor == null:
		return
	var team_id: int = int(current_event.get("team", 0))
	var action: String = str(current_event.get("action", "SHORT_PASS"))
	var attacking: TeamController = home if team_id == 0 else away
	var defending: TeamController = away if team_id == 0 else home
	if not event_action_started:
		if _is_open_play_action(action) and ball.owner != event_actor:
			event_start = ball.pos
			event_actor.target = ball.pos
			event_actor.current_state = "CHASE_LOOSE_BALL"
		elif _is_pressure_escape_action(action):
			event_actor.target = event_start
			event_actor.current_state = "UNDER_PRESSURE_SCAN"
		elif action in ["CROSS", "CUTBACK"]:
			event_actor.target = Vector2(_wide_lane_x(str(current_event.get("sequence_type", "")), action), _byline_y(team_id))
			event_actor.current_state = "CUTBACK_SHAPE" if action == "CUTBACK" else "BYLINE_DRIVE"
		elif action == "PASS_TO_WING":
			event_actor.target = event_start
			event_actor.current_state = "SCAN_WIDE_RELEASE"
		elif _is_combination_action(action):
			event_actor.target = event_start
			event_actor.current_state = "SCAN_FOR_COMBINATION"
		else:
			event_actor.target = event_start
			event_actor.current_state = "PREPARE_ACTION"
	else:
		if action == "DRIBBLE":
			event_actor.target = event_end
			event_actor.current_state = "DRIBBLE"
		elif action == "SHOOT":
			event_actor.current_state = "SHOOT"
		elif _is_pressure_escape_action(action):
			event_actor.target = _post_action_support_target(event_actor, team_id)
			event_actor.current_state = "ESCAPE_AFTER_PASS"
		elif action in ["CROSS", "CUTBACK"]:
			event_actor.target = _post_action_support_target(event_actor, team_id)
			event_actor.current_state = "RECOVER_WIDE_POSITION"
		elif action == "PASS_TO_WING":
			event_actor.target = _post_action_support_target(event_actor, team_id)
			event_actor.current_state = "SUPPORT_WIDE_RELEASE"
		elif _is_combination_action(action):
			event_actor.target = _combination_return_target(event_actor, team_id)
			event_actor.current_state = "RETURN_OPTION"
		else:
			event_actor.target = _post_action_support_target(event_actor, team_id)
			event_actor.current_state = "POST_ACTION_SUPPORT"
	if event_receiver != null and action != "SHOOT":
		if _is_line_break_action(action) and not event_action_started:
			event_receiver.target = _line_break_hold_target(event_receiver, team_id)
			event_receiver.current_state = "TIME_LINE_RUN"
		elif _is_combination_action(action) and not event_action_started:
			event_receiver.target = _receiver_show_target(event_receiver, team_id)
			event_receiver.current_state = "SHOW_TO_FEET"
		else:
			event_receiver.target = _receiver_run_target(action, event_receiver, event_end, team_id)
			event_receiver.current_state = "RECEIVE_PASS"
	_apply_support_intents(attacking, team_id, action)
	_apply_sequence_beat_intents(attacking, team_id, action)
	_apply_defensive_intents(defending)
	_apply_transition_intents(attacking, defending)

func _apply_support_intents(team: TeamController, team_id: int, action: String) -> void:
	var dir: float = -1.0 if team_id == 0 else 1.0
	for p in team.players:
		if p == event_actor or p == event_receiver or p.is_goalkeeper():
			continue
		if p.assigned_slot != "" and not action in ["CORNER", "THROW_IN", "GOAL_KICK_SHORT", "KEEPER_BUILD_UP", "GOAL_KICK_LONG", "KEEPER_LONG", "CROSS", "CUTBACK", "SHOOT"]:
			continue
		if action == "CORNER":
			if p.is_forward() or p.role in ["AM", "CB"]:
				var box_x: float = clampf(0.42 + float((p.id % 4)) * 0.055, 0.34, 0.66)
				p.target = Vector2(box_x, 0.18 if team_id == 0 else 0.82)
				p.current_state = "ATTACK_CORNER"
			elif p.is_midfielder():
				p.target = Vector2(clampf(0.50 + (p.base_pos.x - 0.5) * 0.35, 0.24, 0.76), 0.30 if team_id == 0 else 0.70)
				p.current_state = "SECOND_BALL"
			else:
				p.target = Vector2(clampf(p.base_pos.x, 0.28, 0.72), 0.55 if team_id == 0 else 0.45)
				p.current_state = "REST_DEFENSE"
			continue
		if action == "THROW_IN":
			var lane_x: float = 0.10 if event_start.x < 0.5 else 0.90
			if p.is_midfielder() or p.role in ["LB", "RB", "LWB", "RWB", "LM", "RM"]:
				p.target = Vector2(clampf(lane_x + (0.08 if p.id % 2 == 0 else -0.08), 0.06, 0.94), clampf(event_start.y + dir * (0.035 + float(p.id % 3) * 0.025), 0.07, 0.93))
				p.current_state = "OFFER_THROW"
			continue
		if action in ["GOAL_KICK_SHORT", "KEEPER_BUILD_UP"]:
			if p.is_defender() or p.role == "DM":
				var spread: float = -0.18 if p.base_pos.x < 0.5 else 0.18
				p.target = Vector2(clampf(0.5 + spread, 0.16, 0.84), 0.76 if team_id == 0 else 0.24)
				p.current_state = "BUILD_FROM_BACK"
			continue
		if action in ["GOAL_KICK_LONG", "KEEPER_LONG"]:
			if p.is_forward() or p.role in ["LW", "RW"]:
				p.target = Vector2(clampf(p.base_pos.x + (p.base_pos.x - 0.5) * 0.16, 0.18, 0.82), 0.42 if team_id == 0 else 0.58)
				p.current_state = "CONTEST_LONG_BALL"
			elif p.is_midfielder():
				p.target = Vector2(clampf(p.base_pos.x, 0.22, 0.78), 0.56 if team_id == 0 else 0.44)
				p.current_state = "SECOND_BALL"
			continue
		if action in ["ONE_TWO", "WALL_PASS", "SIDEWAYS_PASS"]:
			if p.sequence_role in [SequenceRole.PRIMARY_SUPPORT, SequenceRole.SECONDARY_SUPPORT] or p.is_midfielder():
				var slot: float = -0.095 if p.id % 2 == 0 else 0.095
				var depth: float = 0.052 if p.id % 3 != 0 else -0.040
				p.target = Vector2(clampf(event_start.x + slot, 0.08, 0.92), clampf(event_start.y + dir * depth, 0.06, 0.94))
				p.current_state = "PASSING_ANGLE_LEFT" if slot < 0.0 else "PASSING_ANGLE_RIGHT"
			continue
		if action == "SWITCH_PLAY":
			if p.role in ["LW", "RW", "LM", "RM", "LB", "RB", "LWB", "RWB"]:
				var far_x: float = 0.88 if event_end.x > 0.5 else 0.12
				p.target = Vector2(far_x, clampf(event_end.y + dir * 0.02, 0.06, 0.94))
				p.current_state = "HOLD_WIDTH"
			continue
		if action in ["PRESSURED_BACK_PASS", "SAFE_RECYCLE"]:
			if p.is_defender() or p.role == "DM":
				p.target = Vector2(clampf(p.base_pos.x, 0.18, 0.82), clampf(event_end.y - dir * 0.035, 0.08, 0.92))
				p.current_state = "SAFE_SUPPORT"
			continue
		if action == "CUTBACK":
			if p.role in ["AM", "CM"] or p.is_forward():
				p.target = Vector2(clampf(0.45 + float(p.id % 3) * 0.055, 0.34, 0.66), 0.28 if team_id == 0 else 0.72)
				p.current_state = "CUTBACK_OPTION"
			continue
		if action == "SHOOT":
			if p.is_forward() or p.role in ["AM", "CM"]:
				var rebound_x: float = clampf(0.44 + float(p.id % 3) * 0.055, 0.36, 0.64)
				p.target = Vector2(rebound_x, _box_run_y(team_id, -dir * 0.020))
				p.current_state = "REBOUND_RUN"
			elif p.is_defender() or p.role == "DM":
				p.target = Vector2(clampf(p.base_pos.x, 0.28, 0.72), 0.56 if team_id == 0 else 0.44)
				p.current_state = "REST_DEFENSE"
			continue
		if p.sequence_role in [SequenceRole.PRIMARY_SUPPORT, SequenceRole.SECONDARY_SUPPORT] and not p.is_defender():
			var side_step: float = 0.075 if p.id % 2 == 0 else -0.075
			p.target = Vector2(clampf(ball.pos.x + side_step, 0.07, 0.93), clampf(ball.pos.y + dir * 0.055, 0.06, 0.94))
			p.current_state = "SUPPORT_ATTACK"
		if action in ["CROSS", "THROUGH_BALL", "LONG_PASS", "VERTICAL_PASS"] and p.sequence_role == SequenceRole.DEPTH_RUNNER:
			p.target = Vector2(clampf(event_end.x + (p.base_pos.x - 0.5) * 0.12, 0.12, 0.88), clampf(event_end.y + dir * 0.025, 0.06, 0.94))
			p.current_state = "MAKE_RUN"

func _apply_sequence_beat_intents(team: TeamController, team_id: int, action: String) -> void:
	var sequence_type: String = str(current_event.get("sequence_type", ""))
	var beat_type: String = str(current_event.get("beat_type", ""))
	var support_roles: Array = current_event.get("support_roles", [])
	var third_man_role: String = str(current_event.get("third_man_role", ""))
	var dir: float = -1.0 if team_id == 0 else 1.0
	var ball_anchor: Vector2 = ball.pos if ball.owner != null or ball.ball_state != MatchBall.OUT_OF_PLAY else event_start
	for p in team.players:
		if p == event_actor or p == event_receiver or p.is_goalkeeper():
			continue
		if p.assigned_slot != "" and sequence_type in [
			PossessionSequence.BUILD_FROM_BACK_SHORT,
			PossessionSequence.CENTER_TRIANGLE_BUILDUP,
			PossessionSequence.DIRECT_LONG_BALL,
			PossessionSequence.OFFSIDE_TRAP_OR_LINE_BREAK,
			PossessionSequence.PRESSURED_RECYCLE,
			PossessionSequence.SWITCH_PLAY_SEQUENCE
		]:
			_apply_reserved_slot_state(p, sequence_type, action, team_id, support_roles, third_man_role)
			continue
		if sequence_type == PossessionSequence.BUILD_FROM_BACK_SHORT:
			if p.is_defender():
				var split_x: float = 0.30 if p.base_pos.x < 0.5 else 0.70
				p.target = Vector2(split_x, 0.76 if team_id == 0 else 0.24)
				p.current_state = "BUILD_FROM_BACK"
			elif p.role == "DM" or p.role == "CM":
				p.target = Vector2(clampf(ball_anchor.x + (0.08 if p.id % 2 == 0 else -0.08), 0.22, 0.78), clampf(ball_anchor.y + dir * 0.065, 0.08, 0.92))
				p.current_state = "SHOW_FOR_SHORT_PASS"
			continue
		if sequence_type == PossessionSequence.CENTER_TRIANGLE_BUILDUP:
			if p.role in support_roles or p.role == third_man_role or p.is_midfielder():
				var side: float = -1.0 if p.id % 2 == 0 else 1.0
				var third_man: bool = p.role == third_man_role or (third_man_role == "AM" and p.is_midfielder() and p.id % 3 == 1)
				var depth: float = 0.11 if third_man else (-0.050 if p.id % 3 == 0 else 0.040)
				p.target = Vector2(clampf(ball_anchor.x + side * 0.095, 0.10, 0.90), clampf(ball_anchor.y + dir * depth, 0.08, 0.92))
				if third_man:
					p.current_state = "THIRD_MAN_RUN"
				else:
					p.current_state = "PASSING_ANGLE_LEFT" if side < 0.0 else "PASSING_ANGLE_RIGHT"
			continue
		if sequence_type in [PossessionSequence.WIDE_OVERLOAD_LEFT, PossessionSequence.WIDE_OVERLOAD_RIGHT]:
			var left: bool = sequence_type == PossessionSequence.WIDE_OVERLOAD_LEFT
			var lane_x: float = _wide_lane_x(sequence_type, action)
			var half_x: float = _halfspace_x(lane_x)
			var same_side: bool = (left and p.base_pos.x < 0.5) or ((not left) and p.base_pos.x > 0.5)
			var deliver_y: float = _byline_y(team_id)
			if p.role in ["LB", "LWB", "RB", "RWB"] and same_side:
				var overlap_y: float = clampf(ball_anchor.y + dir * 0.115, minf(ball_anchor.y, deliver_y), maxf(ball_anchor.y, deliver_y))
				p.target = Vector2(lane_x, overlap_y)
				p.current_state = "OVERLAP_RUN"
			elif p.role in ["LM", "LW", "RM", "RW"] and same_side:
				var carrier_y: float = deliver_y if action in ["CROSS", "CUTBACK", "DRIBBLE"] else clampf(ball_anchor.y + dir * 0.055, 0.08, 0.92)
				p.target = Vector2(clampf(lane_x + (0.028 if lane_x < 0.5 else -0.028), 0.07, 0.93), carrier_y)
				p.current_state = "BYLINE_DRIVE" if action in ["CROSS", "DRIBBLE"] else ("CUTBACK_SHAPE" if action == "CUTBACK" else "WIDE_OVERLOAD")
			elif p.role in ["LM", "LW", "RM", "RW"] and not same_side:
				p.target = Vector2(clampf(1.0 - lane_x, 0.10, 0.90), _box_run_y(team_id, -dir * 0.020))
				p.current_state = "BOX_FAR_POST"
			elif p.is_midfielder():
				var underlap_y: float = clampf(ball_anchor.y + dir * (0.065 if action in ["CROSS", "CUTBACK"] else 0.025), 0.08, 0.92)
				p.target = Vector2(half_x, underlap_y)
				p.current_state = "HALF_SPACE_SUPPORT" if action != "CUTBACK" else "CUTBACK_ZONE_ATTACK"
			elif p.is_forward():
				var box_x: float = 0.43 if p.id % 2 == 0 else 0.58
				if action == "CUTBACK":
					p.target = Vector2(clampf(0.45 + float(p.id % 3) * 0.055, 0.36, 0.64), _box_run_y(team_id, -dir * 0.065))
					p.current_state = "CUTBACK_ZONE_ATTACK"
				else:
					p.target = Vector2(box_x, _box_run_y(team_id, -dir * (0.025 if p.id % 2 == 0 else -0.020)))
					p.current_state = "BOX_NEAR_POST" if p.id % 2 == 0 else "BOX_FAR_POST"
			continue
		if sequence_type in [PossessionSequence.DIRECT_LONG_BALL, PossessionSequence.OFFSIDE_TRAP_OR_LINE_BREAK]:
			if p.is_forward() or p.role in ["LW", "RW", "AM"]:
				var run_target: Vector2 = _dict_to_vec(current_event.get("projected_receiver_target", {"x": event_end.x, "y": event_end.y}))
				if not event_action_started:
					var hold_target: Vector2 = _line_break_hold_target(p, team_id)
					p.target = Vector2(clampf(hold_target.x + (p.base_pos.x - 0.5) * 0.075, 0.10, 0.90), hold_target.y)
					p.current_state = "TIME_LINE_RUN"
				else:
					p.target = Vector2(clampf(run_target.x + (p.base_pos.x - 0.5) * 0.10, 0.10, 0.90), clampf(run_target.y, 0.06, 0.94))
					p.current_state = "MAKE_RUN"
			elif p.is_midfielder():
				p.target = Vector2(clampf(ball_anchor.x, 0.18, 0.82), 0.56 if team_id == 0 else 0.44)
				p.current_state = "SECOND_BALL"
			continue
		if sequence_type == PossessionSequence.PRESSURED_RECYCLE:
			if p.is_defender() or p.role in ["DM", "CM"]:
				var outlet_depth: float = -0.095 if p.is_defender() else -0.060
				p.target = Vector2(clampf(p.base_pos.x + (p.base_pos.x - 0.5) * 0.08, 0.16, 0.84), clampf(ball_anchor.y + dir * outlet_depth, 0.08, 0.92))
				p.current_state = "RESET_OUTLET" if p.is_defender() else "SAFE_SUPPORT"
			elif p.is_forward():
				p.target = Vector2(clampf(p.base_pos.x, 0.30, 0.70), clampf(ball_anchor.y + dir * 0.12, 0.08, 0.92))
				p.current_state = "RELIEF_OPTION"
			continue
		if sequence_type == PossessionSequence.SWITCH_PLAY_SEQUENCE:
			var far_x: float = 0.88 if event_end.x > 0.5 else 0.12
			if p.role in ["LW", "RW", "LM", "RM", "LB", "RB", "LWB", "RWB"]:
				p.target = Vector2(far_x, clampf(event_end.y + dir * 0.025, 0.08, 0.92))
				p.current_state = "FAR_SIDE_RUN"
			elif p.is_midfielder():
				p.target = Vector2(0.50, clampf(ball_anchor.y - dir * 0.03, 0.10, 0.90))
				p.current_state = "SWITCH_SUPPORT"
			continue
		if sequence_type == PossessionSequence.CUTBACK_ATTACK:
			if p.is_forward() or p.role in ["AM", "CM"]:
				var slot: float = -0.075 if p.id % 2 == 0 else 0.075
				p.target = Vector2(clampf(0.50 + slot, 0.34, 0.66), _box_run_y(team_id, -dir * 0.070))
				p.current_state = "CUTBACK_ZONE_ATTACK" if p.role in ["AM", "CM"] else "PENALTY_SPOT_RUN"
			elif p.is_defender() or p.role == "DM":
				p.target = Vector2(clampf(p.base_pos.x, 0.26, 0.74), 0.56 if team_id == 0 else 0.44)
				p.current_state = "REST_DEFENSE"
			continue
		if beat_type == PossessionSequence.MOVE_OFF_BALL and bool(current_event.get("receiver_pre_run", false)):
			if p.role in support_roles:
				p.target = Vector2(clampf(event_end.x + (p.base_pos.x - 0.5) * 0.08, 0.08, 0.92), clampf(event_end.y, 0.06, 0.94))
				p.current_state = "MOVE_OFF_BALL"

func _post_action_support_target(player: PlayerAgent, team_id: int) -> Vector2:
	var dir: float = -1.0 if team_id == 0 else 1.0
	var side_step: float = -0.06 if player.pos.x > 0.5 else 0.06
	return Vector2(clampf(ball.pos.x + side_step, 0.08, 0.92), clampf(ball.pos.y - dir * 0.045, 0.06, 0.94))

func _apply_reserved_slot_state(p: PlayerAgent, sequence_type: String, action: String, team_id: int, support_roles: Array, third_man_role: String) -> void:
	match sequence_type:
		PossessionSequence.BUILD_FROM_BACK_SHORT:
			if p.is_defender():
				p.current_state = "BUILD_FROM_BACK"
			elif p.role == "DM" or p.role == "CM":
				p.current_state = "SHOW_FOR_SHORT_PASS"
		PossessionSequence.CENTER_TRIANGLE_BUILDUP:
			if p.role == third_man_role or (third_man_role == "AM" and p.is_midfielder() and p.id % 3 == 1):
				p.current_state = "THIRD_MAN_RUN"
			elif p.sequence_role in [SequenceRole.PRIMARY_SUPPORT, SequenceRole.SECONDARY_SUPPORT] or p.role in support_roles or p.is_midfielder():
				p.current_state = "PASSING_ANGLE_LEFT" if p.slot_target_position.x < ball.pos.x else "PASSING_ANGLE_RIGHT"
		PossessionSequence.DIRECT_LONG_BALL, PossessionSequence.OFFSIDE_TRAP_OR_LINE_BREAK:
			if p.sequence_role == SequenceRole.DEPTH_RUNNER or p.is_forward() or p.role in ["LW", "RW", "AM"]:
				p.current_state = "MAKE_RUN" if event_action_started else "TIME_LINE_RUN"
			elif p.is_midfielder():
				p.current_state = "SECOND_BALL"
		PossessionSequence.PRESSURED_RECYCLE:
			if p.is_defender():
				p.current_state = "RESET_OUTLET"
			elif p.role in ["DM", "CM"]:
				p.current_state = "SAFE_SUPPORT"
			elif p.is_forward():
				p.current_state = "RELIEF_OPTION"
		PossessionSequence.SWITCH_PLAY_SEQUENCE:
			if p.role in ["LW", "RW", "LM", "RM", "LB", "RB", "LWB", "RWB"]:
				p.current_state = "FAR_SIDE_RUN"
			elif p.is_midfielder():
				p.current_state = "SWITCH_SUPPORT"

func _apply_defensive_intents(team: TeamController) -> void:
	var action: String = str(current_event.get("action", ""))
	if action == "CORNER":
		for p in team.players:
			if p.is_goalkeeper():
				continue
			if p.is_defender() or p.role == "DM":
				p.target = Vector2(clampf(0.38 + float(p.id % 5) * 0.06, 0.30, 0.70), 0.24 if team.side == 1 else 0.76)
				p.current_state = "DEFEND_CORNER"
			elif p.is_midfielder():
				p.target = Vector2(clampf(p.base_pos.x, 0.24, 0.76), 0.34 if team.side == 1 else 0.66)
				p.current_state = "SECOND_BALL_DEFENSE"
		return
	if action == "THROW_IN":
		for p in team.players:
			if p.is_goalkeeper():
				continue
			if p.pos.distance_to(event_start) < 0.30 or p.is_midfielder():
				p.target = Vector2(clampf(event_start.x + (0.08 if p.base_pos.x < 0.5 else -0.08), 0.06, 0.94), clampf(event_start.y, 0.08, 0.92))
				p.current_state = "MARK_THROW_OPTION"
		return
	var pressure_point: Vector2 = ball.owner.pos if ball.owner != null else ball.pos
	var ranked: Array[PlayerAgent] = []
	var danger: float = _own_goal_danger_for(team.side, ball.pos)
	var response: String = _event_defensive_response(current_event)
	for p in team.players:
		if p.is_goalkeeper():
			continue
		if p.role == "CB" and danger > 0.58:
			continue
		ranked.append(p)
	ranked.sort_custom(func(a: PlayerAgent, b: PlayerAgent) -> bool:
		return a.pos.distance_to(pressure_point) < b.pos.distance_to(pressure_point)
	)
	if ranked.size() > 0 and ball.owner != null:
		ranked[0].target = pressure_point
		ranked[0].current_state = "PRESS"
	if ranked.size() > 1:
		var cover_target: Vector2 = pressure_point
		if event_receiver != null:
			cover_target = pressure_point.lerp(event_receiver.pos, 0.55)
		elif ball.target_player != null:
			cover_target = pressure_point.lerp(ball.target_player.pos, 0.55)
		ranked[1].target = cover_target
		ranked[1].current_state = "COVER_PASSING_LANE"
	if ranked.size() > 2:
		var lane_mid: Vector2 = event_start.lerp(event_end, 0.50)
		ranked[2].target = Vector2(clampf(lane_mid.x, 0.08, 0.92), clampf(lane_mid.y, 0.06, 0.94))
		ranked[2].current_state = "BLOCK_PASSING_LANE"
	_apply_defensive_scheme_shape(team, ranked, pressure_point, response)
	for p in team.players:
		if p.is_goalkeeper():
			continue
		if p.is_defender() and p.current_state not in ["PRESS", "WIDE_PRESS", "COVER_CUTBACK", "COVER_PASSING_LANE", "BLOCK_PASSING_LANE", "OFFSIDE_LINE_HOLD", "OFFSIDE_TRAP", "RECOVERY_RUN", "SHOT_BLOCK", "BOX_MARKING", "BOX_PROTECTOR", "DEFEND_CORNER"]:
			p.target.y = lerpf(p.target.y, team.offside_line_y, 0.48)
			p.current_state = "LINE_HOLDER"

func _apply_defensive_scheme_shape(team: TeamController, ranked: Array[PlayerAgent], pressure_point: Vector2, response: String) -> void:
	if _team_has_reserved_defensive_slots(team):
		var shot_block_assigned: bool = false
		for p in team.players:
			if p.is_goalkeeper() or p.assigned_slot == "":
				continue
			p.apply_tactical_target(p.slot_target_position, 0.014)
			if response == DefensiveScheme.RECOVERY_RUN:
				if p.is_defender() and _is_line_break_action(str(current_event.get("action", ""))) and not event_action_started:
					p.current_state = "OFFSIDE_LINE_HOLD"
				elif p.is_defender():
					p.current_state = "RECOVERY_RUN"
				elif p.is_midfielder():
					p.current_state = "MIDFIELD_SCREEN"
			elif response == DefensiveScheme.BALL_SIDE_PRESS and p.sequence_role == SequenceRole.PRIMARY_PRESSER:
				p.current_state = "WIDE_PRESS"
			elif response == DefensiveScheme.BOX_DEFENSE and p.is_defender():
				if str(current_event.get("action", "")) == "SHOOT" and not shot_block_assigned:
					p.current_state = "SHOT_BLOCK"
					shot_block_assigned = true
				else:
					p.current_state = "BOX_PROTECTOR"
		return
	var own_box_y: float = 0.78 if team.side == 0 else 0.22
	var edge_y: float = 0.64 if team.side == 0 else 0.36
	match response:
		DefensiveScheme.HIGH_PRESS, DefensiveScheme.COUNTER_PRESS:
			for i in range(mini(3, ranked.size())):
				var p: PlayerAgent = ranked[i]
				p.target = pressure_point if i == 0 else pressure_point.lerp(event_receiver.pos if event_receiver != null else event_end, 0.45 + float(i) * 0.12)
				if i == 0:
					p.current_state = "PRESS"
				elif response == DefensiveScheme.COUNTER_PRESS and i == 1:
					p.current_state = "PRESS_TRAP"
				else:
					p.current_state = "COVER_PASSING_LANE"
		DefensiveScheme.BALL_SIDE_PRESS:
			for i in range(mini(4, ranked.size())):
				var p: PlayerAgent = ranked[i]
				var lane_x: float = clampf(ball.pos.x + (0.08 if i % 2 == 0 else -0.08), 0.08, 0.92)
				p.target = Vector2(lane_x, clampf(ball.pos.y + (float(i) - 1.5) * 0.035, 0.06, 0.94))
				if i == 0:
					p.current_state = "WIDE_PRESS"
				elif i == 1 and str(current_event.get("action", "")) in ["CROSS", "CUTBACK", "PASS_TO_WING"]:
					var cutback_y: float = 0.30 if team.side == 1 else 0.70
					p.target = Vector2(0.50, cutback_y)
					p.current_state = "COVER_CUTBACK"
				else:
					p.current_state = "COVER_PASSING_LANE"
			for p in team.players:
				if p.is_goalkeeper():
					continue
				if p.is_defender() and p.current_state not in ["WIDE_PRESS", "COVER_CUTBACK"]:
					p.target = Vector2(clampf(0.38 + float(p.id % 4) * 0.08, 0.30, 0.70), own_box_y)
					p.current_state = "BOX_MARKING"
		DefensiveScheme.RECOVERY_RUN:
			for p in team.players:
				if p.is_goalkeeper():
					continue
				if p.is_defender():
					if _is_line_break_action(str(current_event.get("action", ""))) and not event_action_started:
						var trap_y: float = _line_hold_y_for_defending_team(team)
						p.target = Vector2(clampf(p.base_pos.x, 0.20, 0.80), trap_y)
						p.current_state = "OFFSIDE_LINE_HOLD"
					else:
						p.target = Vector2(clampf(p.base_pos.x, 0.20, 0.80), team.offside_line_y)
						p.current_state = "RECOVERY_RUN"
				elif p.is_midfielder():
					p.target = Vector2(clampf(ball.pos.x, 0.18, 0.82), clampf(team.offside_line_y + (0.12 if team.side == 0 else -0.12), 0.10, 0.90))
					p.current_state = "MIDFIELD_SCREEN"
		DefensiveScheme.BOX_DEFENSE:
			var shot_block_assigned: bool = false
			for p in team.players:
				if p.is_goalkeeper():
					continue
				if p.is_defender():
					if str(current_event.get("action", "")) == "SHOOT" and not shot_block_assigned:
						p.target = event_start.lerp(event_end, 0.22)
						p.current_state = "SHOT_BLOCK"
						shot_block_assigned = true
					else:
						p.target = Vector2(clampf(0.34 + float(p.id % 4) * 0.10, 0.28, 0.72), own_box_y)
						p.current_state = "BOX_PROTECTOR"
				elif p.is_midfielder():
					p.target = Vector2(clampf(p.base_pos.x, 0.26, 0.74), edge_y)
					p.current_state = "MIDFIELD_SCREEN"

func _team_has_reserved_defensive_slots(team: TeamController) -> bool:
	for p in team.players:
		if p.assigned_slot != "" and p.sequence_role in [
			SequenceRole.PRIMARY_PRESSER,
			SequenceRole.SECONDARY_COVER,
			SequenceRole.COVER_SHADOW,
			SequenceRole.MIDFIELD_SCREEN,
			SequenceRole.BOX_PROTECTOR,
			SequenceRole.DEFENSIVE_LINE_HOLDER,
			SequenceRole.LINE_HOLDER,
			SequenceRole.WEAK_SIDE_COMPACT
		]:
			return true
	return false

func _apply_transition_intents(losing_team: TeamController, winning_team: TeamController) -> void:
	if not bool(current_event.get("turnover", false)):
		return
	if not event_action_started and ball.ball_state not in [MatchBall.LOOSE, MatchBall.PASSING, MatchBall.CROSSING]:
		return
	var plan: Dictionary = current_event.get("transition_plan", {})
	if plan.is_empty():
		return
	var restart_type: String = str(plan.get("restart_type", "OPEN_PLAY"))
	var transition_type: String = str(plan.get("transition_type", "OPEN_PLAY_COUNTER_PRESS"))
	var contest_point: Vector2 = ball.pos if ball.ball_state != MatchBall.OUT_OF_PLAY else event_end
	var open_play: bool = restart_type == "OPEN_PLAY" or restart_type == "KEEPER_POSSESSION"
	if not open_play or transition_type in ["OFFSIDE_RESET", "OUT_OF_PLAY_RESET"]:
		for p in losing_team.players:
			if p.is_goalkeeper():
				continue
			p.target = Vector2(clampf(p.base_pos.x, 0.18, 0.82), clampf(p.base_pos.y, 0.08, 0.92))
			p.current_state = "STOP_OUT_OF_PLAY" if p.pos.distance_to(contest_point) < 0.24 else "RESET_SHAPE"
		for p in winning_team.players:
			if p.is_goalkeeper():
				continue
			p.target = Vector2(clampf(p.base_pos.x, 0.18, 0.82), clampf(p.base_pos.y, 0.08, 0.92))
			p.current_state = "RESTART_SHAPE"
		return
	var losing_ranked: Array[PlayerAgent] = _rank_non_keepers_by_distance(losing_team, contest_point)
	for i in range(losing_ranked.size()):
		var p: PlayerAgent = losing_ranked[i]
		if i == 0:
			p.target = contest_point
			p.current_state = "COUNTER_PRESS_REACT"
		elif i == 1:
			p.target = contest_point.lerp(event_start, 0.42)
			p.current_state = "COUNTER_PRESS_COVER"
		elif p.is_defender() or p.role == "DM":
			p.target = Vector2(clampf(p.base_pos.x, 0.24, 0.76), 0.56 if losing_team.side == 0 else 0.44)
			p.current_state = "REST_DEFENSE_DROP"
	var winning_ranked: Array[PlayerAgent] = _rank_non_keepers_by_distance(winning_team, contest_point)
	for i in range(winning_ranked.size()):
		var p: PlayerAgent = winning_ranked[i]
		if i == 0:
			p.target = contest_point
			p.current_state = "INTERCEPT_PASS" if transition_type == "INTERCEPTION_BREAK" else "SECOND_BALL_WINNER"
		elif i == 1:
			var dir: float = -1.0 if winning_team.side == 0 else 1.0
			p.target = Vector2(clampf(contest_point.x + (0.08 if p.base_pos.x > 0.5 else -0.08), 0.08, 0.92), clampf(contest_point.y + dir * 0.055, 0.08, 0.92))
			p.current_state = "SECURE_POSSESSION"
		elif p.is_forward() or p.role in ["AM", "LW", "RW"]:
			var dir_forward: float = -1.0 if winning_team.side == 0 else 1.0
			p.target = Vector2(clampf(p.base_pos.x, 0.16, 0.84), clampf(contest_point.y + dir_forward * 0.16, 0.08, 0.92))
			p.current_state = "BREAK_OUTLET"

func _rank_non_keepers_by_distance(team: TeamController, point: Vector2) -> Array[PlayerAgent]:
	var ranked: Array[PlayerAgent] = []
	for p in team.players:
		if not p.is_goalkeeper():
			ranked.append(p)
	ranked.sort_custom(func(a: PlayerAgent, b: PlayerAgent) -> bool:
		return a.pos.distance_to(point) < b.pos.distance_to(point)
	)
	return ranked

func _own_goal_danger_for(team_id: int, point: Vector2) -> float:
	return point.y if team_id == 1 else 1.0 - point.y

func _update_labels() -> void:
	var owner_text: String = _ball_status_text()
	var chain_text: String = "seq:%s beat:%s chain:%s/%s react:%s" % [
		str(current_event.get("sequence_label", current_event.get("sequence_type", "-"))),
		str(current_event.get("beat_type", "-")),
		str(current_event.get("chain_intent", "-")),
		str(current_event.get("chain_stage", "-")),
		_event_defensive_response(current_event)
	]
	var chance_text: String = "xG:%.2f xT:%.2f %s" % [
		float(current_event.get("xg", 0.0)),
		float(current_event.get("xThreat", 0.0)),
		str(current_event.get("chance_type", "-"))
	]
	status_text = "%s | Ball: %s %.2f, %.2f | %s | %s | Home: %s/%s | Away: %s/%s" % [
		owner_text, ball.ball_state, ball.pos.x, ball.pos.y,
		chain_text,
		chance_text,
		_display_phase(home), _display_plan(home),
		_display_phase(away), _display_plan(away)
	]

func _display_phase(team: TeamController) -> String:
	return "attack" if tactical_director.possession_team_id == team.side else "defend"

func _display_plan(team: TeamController) -> String:
	if tactical_director.possession_team_id == team.side:
		return "%s/%s" % [tactical_director.current_attacking_sequence, tactical_director.sequence_phase]
	return tactical_director.current_defensive_scheme

func _update_view_focus(dt: float) -> void:
	if current_event.is_empty():
		return
	var old_pos: Vector2 = view_focus_pos
	var plan: Dictionary = current_event.get("viewing_plan", {})
	var intensity: float = clampf(float(plan.get("intensity", current_event.get("visual_intensity", 0.35))), 0.10, 1.0)
	var mode: String = str(plan.get("focus_mode", "BALL_FOLLOW"))
	view_tempo_label = str(plan.get("tempo", "FLOW"))
	var raw_target: Vector2 = _view_focus_target_for(mode)
	var target_step_limit: float = clampf(dt * 0.95, 0.025, 0.080)
	view_focus_target = view_focus_target.move_toward(raw_target, target_step_limit)
	var target_radius: float = clampf(float(plan.get("focus_radius", current_event.get("play_bubble_radius", 0.28))), 0.12, 0.42)
	var smooth: float = clampf(dt * lerpf(2.2, 5.2, intensity), 0.0, 1.0)
	var proposed_focus: Vector2 = view_focus_pos.lerp(view_focus_target, smooth)
	view_focus_pos = view_focus_pos.move_toward(proposed_focus, 0.055)
	view_focus_radius = lerpf(view_focus_radius, target_radius, smooth)
	view_focus_step = old_pos.distance_to(view_focus_pos)

func _view_focus_target_for(mode: String) -> Vector2:
	var target: Vector2 = ball.pos
	match mode:
		"RESTART_FOCUS":
			target = event_start
		"BOX_FOCUS":
			target = ball.pos.lerp(event_end, 0.38)
		"TURNOVER_FOCUS":
			target = ball.pos.lerp(event_end, 0.20)
		"PASS_TRIANGLE_FOCUS":
			target = event_start.lerp(event_end, 0.50)
		"LONG_PATH_FOCUS":
			target = ball.pos.lerp(event_end, 0.45)
		_:
			if ball.owner != null:
				target = ball.owner.pos.lerp(ball.pos, 0.35)
			else:
				target = ball.pos
	return Vector2(clampf(target.x, 0.06, 0.94), clampf(target.y, 0.06, 0.94))

func _ball_status_text() -> String:
	match ball.state:
		MatchBall.OWNED:
			if ball.current_owner != null:
				return "%s has possession" % ball.current_owner.name
			return "Invalid possession"
		MatchBall.PASSING:
			if ball.target_player != null:
				return "Passing to %s" % ball.target_player.name
			return "Passing to space"
		MatchBall.CROSSING:
			return "Crossing"
		MatchBall.SHOOTING:
			return "Shot"
		MatchBall.OUT_OF_PLAY:
			return "Out of play"
		_:
			return "Loose ball"

func _cycle_speed() -> void:
	speed = 2.0 if speed == 1.0 else (4.0 if speed == 2.0 else 1.0)

func _toggle_pause() -> void:
	paused = not paused

func _all_players() -> Array[PlayerAgent]:
	var all: Array[PlayerAgent] = []
	all.append_array(home.players)
	all.append_array(away.players)
	return all

func _update_possession_beats(dt: float) -> void:
	for p in _all_players():
		var opponent: TeamController = away if p.team_id == 0 else home
		p.update_possession_beat(dt, opponent.pressure_on(p.pos))

func _possession_beat_allows_release() -> bool:
	if event_actor == null:
		return true
	var action: String = str(current_event.get("action", "SHORT_PASS"))
	if _is_open_play_action(action) and ball.owner != event_actor:
		return false
	if action in ["LONG_PASS", "THROUGH_BALL", "GOAL_KICK_LONG", "KEEPER_LONG", "CORNER"] and event_timer > event_duration - event_action_delay - 0.55:
		return false
	return event_actor.possession_beat in ["CARRY", "RELEASE"] or event_actor.possession_beat_timer > 0.65

func _apply_global_ball_contest() -> void:
	if ball.owner != null:
		_clear_duplicate_possession()
		return
	if ball.ball_state != "LOOSE":
		return
	var home_chaser: PlayerAgent = _nearest_non_keeper(home, ball.pos)
	var away_chaser: PlayerAgent = _nearest_non_keeper(away, ball.pos)
	for p in [home_chaser, away_chaser]:
		if p != null:
			p.current_state = "CHASE_LOOSE_BALL"
			p.target = ball.pos

func _resolve_loose_ball() -> void:
	if ball.owner != null or ball.ball_state != "LOOSE":
		return
	if not current_event.is_empty() and event_actor != null and not event_action_started and _is_open_play_action(str(current_event.get("action", ""))):
		if ball.can_be_controlled_by(event_actor):
			ball.set_owner(event_actor, "event_actor_loose_recovered")
		else:
			event_actor.target = ball.pos
			event_actor.current_state = "CHASE_LOOSE_BALL"
		return
	var best: PlayerAgent = null
	var best_d: float = 999.0
	for p in _all_players():
		if p.is_goalkeeper():
			continue
		var d: float = p.pos.distance_to(ball.pos)
		if d < best_d:
			best = p
			best_d = d
	if best != null and ball.can_be_controlled_by(best):
		ball.set_owner(best, "loose_recovered")

func _nearest_non_keeper(team: TeamController, point: Vector2) -> PlayerAgent:
	var best: PlayerAgent = null
	var best_d: float = 999.0
	for p in team.players:
		if p.is_goalkeeper():
			continue
		var d: float = p.pos.distance_to(point)
		if d < best_d:
			best = p
			best_d = d
	return best

func _clear_duplicate_possession() -> void:
	for p in _all_players():
		p.has_ball = p == ball.owner

func _drain_ball_transition_log() -> void:
	for line in ball.consume_transition_log():
		_log(line, "#d6c8a8")

func _draw_field() -> void:
	var r: Rect2 = Rect2(Vector2.ZERO, field.size)
	field.draw_rect(r, Color("#102018"))
	var zoom: float = clampf(0.38 / maxf(view_focus_radius, 0.10), 1.2, 2.6)
	var pw: float = r.size.x * zoom
	var ph: float = r.size.y * zoom
	var half_w: float = r.size.x * 0.5
	var half_h: float = r.size.y * 0.5
	var ox: float = clampf(view_focus_pos.x * pw, half_w, pw - half_w)
	var oy: float = clampf(view_focus_pos.y * ph, half_h, ph - half_h)
	var pitch: Rect2 = Rect2(Vector2(half_w - ox, half_h - oy), Vector2(pw, ph))
	_draw_pitch(pitch)
	_draw_goals(pitch)
	_draw_players(pitch, home.players, Color("#f5f0e8"))
	_draw_players(pitch, away.players, Color("#d95040"))
	_draw_ball(pitch)
	if goal_flash_timer > 0.0:
		_draw_goal_flash(r)
	if halftime_flash_timer > 0.0:
		_draw_halftime_flash(r)
	_draw_momentum_bar(r)
	_draw_active_cards_panel(r)
	if match_ended:
		_draw_match_summary(r)

func _draw_goal_flash(r: Rect2) -> void:
	var t: float = clampf(goal_flash_timer / 1.2, 0.0, 1.0)
	var burst: float = clampf(t * 2.0 - 0.6, 0.0, 1.0)
	var fade: float = clampf(t * 1.6, 0.0, 1.0)
	field.draw_rect(r, Color(0.24, 0.90, 0.38, burst * 0.38))
	if goal_flash_timer > 0.55:
		var font: Font = field.get_theme_default_font()
		var center: Vector2 = r.get_center()
		field.draw_rect(Rect2(center - Vector2(240, 54), Vector2(480, 108)), Color(0.0, 0.0, 0.0, fade * 0.72))
		field.draw_string(font, center + Vector2(-80, -10), "GOAL!", HORIZONTAL_ALIGNMENT_LEFT, -1, 52, Color(0.98, 0.90, 0.22, fade))
		field.draw_string(font, center + Vector2(-64, 48), goal_flash_score, HORIZONTAL_ALIGNMENT_LEFT, -1, 36, Color(1.0, 1.0, 1.0, fade * 0.9))

func _draw_momentum_bar(r: Rect2) -> void:
	var bar_y: float = 40.0
	var bar_h: float = 7.0
	var bar_w: float = r.size.x
	field.draw_rect(Rect2(Vector2(0, bar_y), Vector2(bar_w, bar_h)), Color("#0a1a10", 0.55))
	var home_frac: float = clampf(home_momentum / 100.0, 0.0, 1.0)
	field.draw_rect(Rect2(Vector2(0, bar_y), Vector2(bar_w * home_frac, bar_h)), Color("#4ade80", 0.62))
	field.draw_rect(Rect2(Vector2(bar_w * home_frac, bar_y), Vector2(bar_w * (1.0 - home_frac), bar_h)), Color("#f87171", 0.55))
	field.draw_rect(Rect2(Vector2(0, bar_y), Vector2(bar_w, bar_h)), Color("#ffffff", 0.08), false, 1.0)
	var mid_x: float = bar_w * 0.5
	field.draw_line(Vector2(mid_x, bar_y), Vector2(mid_x, bar_y + bar_h), Color("#ffffff", 0.22), 1.0)

func _draw_xg_bar(r: Rect2, pitch: Rect2) -> void:
	var font: Font = field.get_theme_default_font()
	var bar_w: float = 96.0
	var bar_h: float = 8.0
	var pad: float = 10.0
	var y: float = pitch.position.y + 14.0
	var total_xg: float = maxf(0.01, home_xg + away_xg)
	var home_frac: float = home_xg / total_xg
	field.draw_rect(Rect2(Vector2(pad, y), Vector2(bar_w, bar_h)), Color("#000000", 0.45))
	field.draw_rect(Rect2(Vector2(pad, y), Vector2(bar_w * home_frac, bar_h)), Color("#f5f0e8", 0.60))
	field.draw_rect(Rect2(Vector2(pad + bar_w * home_frac, y), Vector2(bar_w * (1.0 - home_frac), bar_h)), Color("#d95040", 0.55))
	field.draw_rect(Rect2(Vector2(pad, y), Vector2(bar_w, bar_h)), Color("#ffffff", 0.12), false, 1.0)
	field.draw_string(font, Vector2(pad, y - 2), "xG %.2f" % home_xg, HORIZONTAL_ALIGNMENT_LEFT, -1, 11, Color("#f5f0e8", 0.80))
	field.draw_string(font, Vector2(pad + bar_w - 44, y - 2), "%.2f xG" % away_xg, HORIZONTAL_ALIGNMENT_LEFT, -1, 11, Color("#d95040", 0.80))
	var shots_label: String = "⚽ %d  /  %d ⚽" % [home_shots, away_shots]
	field.draw_string(font, Vector2(pad, y + bar_h + 4), shots_label, HORIZONTAL_ALIGNMENT_LEFT, -1, 11, Color("#d6c8a8", 0.70))

func _draw_active_cards_panel(r: Rect2) -> void:
	if active_cards.is_empty():
		return
	var font: Font = field.get_theme_default_font()
	var panel_w: float = 130.0
	var line_h: float = 15.0
	var panel_h: float = 16.0 + line_h * active_cards.size()
	var px: float = r.size.x - panel_w - 8.0
	var py: float = 52.0
	field.draw_rect(Rect2(Vector2(px, py), Vector2(panel_w, panel_h)), Color("#000000", 0.42))
	field.draw_string(font, Vector2(px + 6, py + 13), "Kartlar", HORIZONTAL_ALIGNMENT_LEFT, -1, 12, Color("#f6c453", 0.85))
	for i in range(active_cards.size()):
		var card = active_cards[i]
		var card_id: String = str(card.get("id", card) if typeof(card) == TYPE_DICTIONARY else card)
		var variant: String = str(card.get("variant", "normal")) if typeof(card) == TYPE_DICTIONARY else "normal"
		var col: Color = Color("#f6c453") if variant == "altin" else (Color("#9b7af4") if variant == "kara" else Color("#d6c8a8"))
		var suffix: String = " ★" if variant == "altin" else (" ●" if variant == "kara" else "")
		field.draw_string(font, Vector2(px + 6, py + 14.0 + line_h * float(i + 1)), card_id + suffix, HORIZONTAL_ALIGNMENT_LEFT, -1, 12, col)

func _draw_halftime_flash(r: Rect2) -> void:
	var t: float = clampf(halftime_flash_timer / 2.4, 0.0, 1.0)
	var alpha: float = t * (1.0 - t) * 4.0
	field.draw_rect(r, Color(0.08, 0.12, 0.22, alpha * 0.55))
	if halftime_flash_timer > 0.8:
		var font: Font = field.get_theme_default_font()
		var center: Vector2 = r.get_center()
		var fade: float = clampf((halftime_flash_timer - 0.8) / 1.6, 0.0, 1.0)
		field.draw_rect(Rect2(center - Vector2(200, 46), Vector2(400, 92)), Color(0.0, 0.0, 0.0, fade * 0.76))
		field.draw_string(font, center + Vector2(-92, -6), "DEVRE ARASI", HORIZONTAL_ALIGNMENT_LEFT, -1, 40, Color(0.85, 0.85, 1.0, fade))
		field.draw_string(font, center + Vector2(-42, 36), "%d - %d" % [score_home, score_away], HORIZONTAL_ALIGNMENT_LEFT, -1, 28, Color(1.0, 1.0, 1.0, fade * 0.88))

func _draw_match_summary(r: Rect2) -> void:
	var font: Font = field.get_theme_default_font()
	field.draw_rect(r, Color(0.04, 0.08, 0.04, 0.86))
	var cx: float = r.size.x * 0.5
	var cy: float = r.size.y * 0.5
	var panel_w: float = minf(600.0, r.size.x - 40.0)
	var panel_h: float = 300.0
	var px: float = cx - panel_w * 0.5
	var py: float = cy - panel_h * 0.5
	field.draw_rect(Rect2(Vector2(px, py), Vector2(panel_w, panel_h)), Color(0.06, 0.12, 0.06, 0.95))
	field.draw_rect(Rect2(Vector2(px, py), Vector2(panel_w, panel_h)), Color(0.40, 0.75, 0.40, 0.45), false, 2.0)
	var winner_text: String = "BERABERLIK"
	var winner_col: Color = Color("#f6c453")
	if score_home > score_away:
		winner_text = home.team_name + " KAZANDI"
		winner_col = Color("#4ade80")
	elif score_away > score_home:
		winner_text = away.team_name + " KAZANDI"
		winner_col = Color("#f87171")
	field.draw_string(font, Vector2(cx - 160, py + 40), winner_text, HORIZONTAL_ALIGNMENT_LEFT, -1, 28, winner_col)
	field.draw_string(font, Vector2(cx - 36, py + 80), "%d  -  %d" % [score_home, score_away], HORIZONTAL_ALIGNMENT_LEFT, -1, 42, Color("#ffffff"))
	field.draw_string(font, Vector2(px + 20, py + 136), home.team_name, HORIZONTAL_ALIGNMENT_LEFT, -1, 14, Color("#f5f0e8", 0.85))
	field.draw_string(font, Vector2(px + panel_w - 160, py + 136), away.team_name, HORIZONTAL_ALIGNMENT_LEFT, -1, 14, Color("#d95040", 0.85))
	var stats: Array = [
		["xG", "%.2f" % home_xg, "%.2f" % away_xg],
		["Şut", "%d" % home_shots, "%d" % away_shots],
		["Momentum", "%.0f%%" % home_momentum, "%.0f%%" % (100.0 - home_momentum)],
	]
	for i in range(stats.size()):
		var row: Array = stats[i]
		var ry: float = py + 160.0 + float(i) * 36.0
		field.draw_string(font, Vector2(cx - 30, ry), str(row[0]), HORIZONTAL_ALIGNMENT_LEFT, -1, 14, Color("#d6c8a8", 0.75))
		field.draw_string(font, Vector2(px + 20, ry), str(row[1]), HORIZONTAL_ALIGNMENT_LEFT, -1, 18, Color("#f5f0e8"))
		field.draw_string(font, Vector2(px + panel_w - 60, ry), str(row[2]), HORIZONTAL_ALIGNMENT_LEFT, -1, 18, Color("#d95040"))
	field.draw_string(font, Vector2(cx - 72, py + panel_h - 24), "R tuşu veya ↺ ile yeniden oyna", HORIZONTAL_ALIGNMENT_LEFT, -1, 12, Color("#d6c8a8", 0.55))

func _draw_pitch(pitch: Rect2) -> void:
	field.draw_rect(pitch, Color("#1f6337"))
	for i in range(10):
		var stripe_h: float = pitch.size.y / 10.0
		if i % 2 == 0:
			field.draw_rect(Rect2(pitch.position + Vector2(0, stripe_h * i), Vector2(pitch.size.x, stripe_h)), Color("#2b7546", 0.35))
	field.draw_rect(pitch, Color("#dcefd8"), false, 3.0)
	field.draw_line(Vector2(pitch.position.x, pitch.get_center().y), Vector2(pitch.end.x, pitch.get_center().y), Color("#dcefd8", 0.75), 2.0)
	field.draw_circle(pitch.get_center(), pitch.size.y * 0.12, Color("#dcefd8", 0.75), false, 2.0)
	var box_w: float = pitch.size.x * 0.42
	var box_h: float = pitch.size.y * 0.16
	var x: float = pitch.get_center().x - box_w * 0.5
	field.draw_rect(Rect2(Vector2(x, pitch.position.y), Vector2(box_w, box_h)), Color("#dcefd8", 0.75), false, 2.0)
	field.draw_rect(Rect2(Vector2(x, pitch.end.y - box_h), Vector2(box_w, box_h)), Color("#dcefd8", 0.75), false, 2.0)

func _draw_goals(pitch: Rect2) -> void:
	var goal_w: float = pitch.size.x * 0.18
	var goal_h: float = 18.0
	var x: float = pitch.get_center().x - goal_w * 0.5
	var top_net: Rect2 = Rect2(Vector2(x, pitch.position.y - goal_h), Vector2(goal_w, goal_h))
	var bottom_net: Rect2 = Rect2(Vector2(x, pitch.end.y), Vector2(goal_w, goal_h))
	_draw_goal_net(top_net, true)
	_draw_goal_net(bottom_net, false)
	field.draw_line(Vector2(x, pitch.position.y), Vector2(x + goal_w, pitch.position.y), Color("#f8fafc"), 4.0)
	field.draw_line(Vector2(x, pitch.end.y), Vector2(x + goal_w, pitch.end.y), Color("#f8fafc"), 4.0)
	field.draw_line(Vector2(x, pitch.position.y), Vector2(x, pitch.position.y - goal_h), Color("#f8fafc", 0.90), 3.0)
	field.draw_line(Vector2(x + goal_w, pitch.position.y), Vector2(x + goal_w, pitch.position.y - goal_h), Color("#f8fafc", 0.90), 3.0)
	field.draw_line(Vector2(x, pitch.end.y), Vector2(x, pitch.end.y + goal_h), Color("#f8fafc", 0.90), 3.0)
	field.draw_line(Vector2(x + goal_w, pitch.end.y), Vector2(x + goal_w, pitch.end.y + goal_h), Color("#f8fafc", 0.90), 3.0)

func _draw_goal_net(net: Rect2, top: bool) -> void:
	field.draw_rect(net, Color("#e2e8f0", 0.08), true)
	field.draw_rect(net, Color("#e2e8f0", 0.58), false, 2.0)
	for i in range(1, 6):
		var x: float = net.position.x + net.size.x * float(i) / 6.0
		field.draw_line(Vector2(x, net.position.y), Vector2(x, net.end.y), Color("#e2e8f0", 0.22), 1.0)
	for j in range(1, 3):
		var y: float = net.position.y + net.size.y * float(j) / 3.0
		field.draw_line(Vector2(net.position.x, y), Vector2(net.end.x, y), Color("#e2e8f0", 0.18), 1.0)
	var back_y: float = net.position.y if top else net.end.y
	field.draw_line(Vector2(net.position.x, back_y), Vector2(net.end.x, back_y), Color("#f8fafc", 0.45), 2.0)

func _draw_ball(pitch: Rect2) -> void:
	var bp: Vector2 = pitch_mgr.to_screen(pitch, ball.pos)
	var halo: Color = Color("#ffffff", 0.18)
	var trail: Color = Color("#ffffff", 0.16)
	if ball.ball_state == MatchBall.SHOOTING:
		halo = Color("#fb7185", 0.34)
		trail = Color("#fb7185", 0.28)
	elif ball.ball_state == MatchBall.CROSSING:
		halo = Color("#7dd3fc", 0.30)
		trail = Color("#7dd3fc", 0.24)
	elif ball.ball_state == MatchBall.PASSING:
		halo = Color("#facc15", 0.22)
		trail = Color("#facc15", 0.18)
	if ball.vel.length() > 0.001:
		var tail: Vector2 = bp - ball.vel.normalized() * clampf(ball.vel.length() * 38.0, 10.0, 34.0)
		field.draw_line(tail, bp, trail, 3.0)
	field.draw_circle(bp + Vector2(0, 4), 7.0, Color("#000000", 0.28))
	field.draw_circle(bp, 14.0, halo)
	field.draw_circle(bp, 7.0, Color("#f8fafc"))
	field.draw_circle(bp, 7.0, Color("#111827"), false, 1.5)
	field.draw_line(bp + Vector2(-4.0, -1.0), bp + Vector2(4.0, 1.0), Color("#111827", 0.70), 1.2)
	field.draw_line(bp + Vector2(-1.0, -4.0), bp + Vector2(1.0, 4.0), Color("#111827", 0.55), 1.0)

func _draw_view_focus(pitch: Rect2) -> void:
	if current_event.is_empty():
		return
	var plan: Dictionary = current_event.get("viewing_plan", {})
	var focus: Vector2 = pitch_mgr.to_screen(pitch, view_focus_pos)
	var radius_px: float = maxf(38.0, minf(pitch.size.x, pitch.size.y) * view_focus_radius)
	var intensity: float = clampf(float(plan.get("intensity", 0.35)), 0.10, 1.0)
	var spotlight: bool = bool(plan.get("spotlight", false))
	var col: Color = Color("#ffffff", 0.055 + intensity * 0.035)
	if spotlight:
		col = Color("#facc15", 0.080 + intensity * 0.045)
	field.draw_circle(focus, radius_px, col, false, 2.0 if not spotlight else 3.0)
	field.draw_circle(focus, radius_px * 0.55, Color("#ffffff", 0.035), false, 1.0)
	var target_screen: Vector2 = pitch_mgr.to_screen(pitch, view_focus_target)
	if focus.distance_to(target_screen) > 8.0:
		field.draw_line(focus, target_screen, Color("#ffffff", 0.055), 1.5)

func _draw_players(pitch: Rect2, players: Array[PlayerAgent], color: Color) -> void:
	for p in players:
		var sp: Vector2 = pitch_mgr.to_screen(pitch, p.pos)
		var radius: float = 10.0 if not p.is_goalkeeper() else 12.0
		field.draw_circle(sp + Vector2(0, 3), radius * 0.78, Color("#000000", 0.22))
		var base_color: Color = Color("#48c7e8") if p.is_goalkeeper() else color
		if p.is_injured:
			base_color = base_color.lerp(Color("#ff4444"), 0.55)
		field.draw_circle(sp, radius, base_color)
		field.draw_circle(sp, radius, Color("#102018"), false, 2.0)
		if p.has_ball:
			field.draw_circle(sp, radius + 7.0, Color("#f6c453", 0.40), false, 3.0)
		if p.is_injured:
			field.draw_line(sp + Vector2(-4, -4), sp + Vector2(4, 4), Color("#ff2222", 0.85), 2.0)
			field.draw_line(sp + Vector2(4, -4), sp + Vector2(-4, 4), Color("#ff2222", 0.85), 2.0)
		var font: Font = field.get_theme_default_font()
		field.draw_string(font, sp + Vector2(-radius, -radius - 13), p.role, HORIZONTAL_ALIGNMENT_LEFT, -1, 10, Color("#ffffff", 0.72))

func _draw_player_facing(sp: Vector2, radius: float, player: PlayerAgent) -> void:
	var dir: Vector2 = _player_facing_dir(player)
	var nose: Vector2 = sp + dir * (radius + 4.0)
	var side: Vector2 = dir.orthogonal() * 3.5
	var col: Color = Color("#102018", 0.92)
	if player.is_goalkeeper():
		col = Color("#eff6ff", 0.88)
	field.draw_line(sp, nose, col, 2.2)
	field.draw_line(nose, nose - dir * 6.0 + side, col, 1.6)
	field.draw_line(nose, nose - dir * 6.0 - side, col, 1.6)

func _player_facing_dir(player: PlayerAgent) -> Vector2:
	if player.vel.length() > 0.018:
		return player.vel.normalized()
	if player.target.distance_to(player.pos) > 0.012:
		return (player.target - player.pos).normalized()
	if player.is_goalkeeper():
		return (ball.pos - player.pos).normalized() if ball.pos.distance_to(player.pos) > 0.001 else Vector2(0, -1 if player.team_id == 0 else 1)
	if player.has_ball:
		return Vector2(0, -1 if player.team_id == 0 else 1)
	return Vector2(0, -1 if player.team_id == 0 else 1)

func _draw_keeper_action_hint(sp: Vector2, radius: float, keeper: PlayerAgent) -> void:
	if keeper.current_state == "KEEPER_DIVE":
		var dir: Vector2 = _player_facing_dir(keeper)
		var end: Vector2 = sp + dir * (radius + 18.0)
		field.draw_line(sp, end, Color("#fb7185", 0.48), 5.0)
		field.draw_circle(end, radius * 0.45, Color("#fb7185", 0.34))
	elif keeper.current_state == "KEEPER_CLAIM_CROSS":
		field.draw_circle(sp, radius + 9.0, Color("#7dd3fc", 0.30), false, 3.0)
		field.draw_line(sp + Vector2(-6, -radius - 4), sp + Vector2(0, -radius - 12), Color("#7dd3fc", 0.42), 2.0)
		field.draw_line(sp + Vector2(6, -radius - 4), sp + Vector2(0, -radius - 12), Color("#7dd3fc", 0.42), 2.0)
	elif keeper.current_state == "KEEPER_ANGLE_COVER":
		field.draw_circle(sp, radius + 5.0, Color("#38bdf8", 0.20), false, 2.0)

func _draw_sequence_role_hint(sp: Vector2, radius: float, player: PlayerAgent) -> void:
	match player.sequence_role:
		SequenceRole.WIDTH_HOLDER:
			field.draw_circle(sp, radius + 4.0, Color("#93c5fd", 0.20), false, 2.0)
		SequenceRole.DEPTH_RUNNER:
			field.draw_circle(sp, radius + 5.0, Color("#a7f3d0", 0.24), false, 2.0)
		SequenceRole.PRIMARY_SUPPORT, SequenceRole.SECONDARY_SUPPORT:
			field.draw_circle(sp, radius + 4.0, Color("#fde68a", 0.18), false, 2.0)
		SequenceRole.REST_DEFENSE, SequenceRole.LINE_HOLDER, SequenceRole.BOX_PROTECTOR:
			field.draw_circle(sp, radius + 3.0, Color("#cbd5e1", 0.14), false, 1.5)

func _draw_defensive_line(pitch: Rect2, team: TeamController, color: Color) -> void:
	var y: float = team.defensive_line_y
	field.draw_line(pitch_mgr.to_screen(pitch, Vector2(0.09, y)), pitch_mgr.to_screen(pitch, Vector2(0.91, y)), color, 1.5)

func _draw_offside_line(pitch: Rect2, team: TeamController, color: Color) -> void:
	var y: float = team.offside_line_y
	var a: Vector2 = pitch_mgr.to_screen(pitch, Vector2(0.07, y))
	var b: Vector2 = pitch_mgr.to_screen(pitch, Vector2(0.93, y))
	var segments: int = 18
	for i in range(segments):
		if i % 2 == 0:
			var t0: float = float(i) / float(segments)
			var t1: float = float(i + 1) / float(segments)
			field.draw_line(a.lerp(b, t0), a.lerp(b, t1), color, 1.4)

func _log(text: String, color: String) -> void:
	log_lines.append(text)
	log_colors.append(color)
	while log_lines.size() > 7:
		log_lines.pop_front()
	while log_colors.size() > 7:
		log_colors.pop_front()

func _draw_overlay(r: Rect2) -> void:
	var font: Font = field.get_theme_default_font()
	var score: String = "%s  %d - %d  %s   %02d'   %sx%s" % [
		home.team_name, score_home, score_away, away.team_name, int(minute), speed, "  ⏸" if paused else ""
	]
	field.draw_rect(Rect2(Vector2(0, 0), Vector2(r.size.x, 38)), Color("#000000", 0.42))
	field.draw_string(font, Vector2(18, 27), score, HORIZONTAL_ALIGNMENT_LEFT, -1, 24, Color("#f8fafc"))
	var log_count: int = mini(log_lines.size(), 7)
	var line_h: float = 16.0
	var log_panel_h: float = 28.0 + line_h * float(log_count)
	var bottom: float = r.size.y
	field.draw_rect(Rect2(Vector2(0, bottom - log_panel_h), Vector2(r.size.x, log_panel_h)), Color("#000000", 0.36))
	field.draw_string(font, Vector2(18, bottom - log_panel_h + 14), status_text, HORIZONTAL_ALIGNMENT_LEFT, -1, 12, Color("#d8ead4", 0.72))
	field.draw_string(font, Vector2(r.size.x - 260, bottom - log_panel_h + 14), "View: %s" % view_tempo_label, HORIZONTAL_ALIGNMENT_LEFT, 240, 12, Color("#fde68a", 0.78))
	for i in range(log_count):
		var idx: int = log_lines.size() - log_count + i
		var col: Color = Color(log_colors[idx]) if idx < log_colors.size() else Color("#b9d7ff")
		var age_alpha: float = lerpf(0.48, 1.0, float(i + 1) / float(log_count))
		col.a = age_alpha
		field.draw_string(font, Vector2(18, bottom - log_panel_h + 26.0 + line_h * float(i)), log_lines[idx], HORIZONTAL_ALIGNMENT_LEFT, -1, 13, col)

func _post_live_update() -> void:
	if not OS.has_feature("web"):
		return
	var payload: String = JSON.stringify({
		"type": "godot_live_update",
		"minute": int(minute),
		"score_home": score_home,
		"score_away": score_away,
		"shots_home": home_shots,
		"shots_away": away_shots,
		"home_momentum": int(home_momentum)
	})
	JavaScriptBridge.eval("window.parent.postMessage(%s, '*')" % payload, true)

func _post_event_to_parent(text: String, is_goal: bool = false) -> void:
	if not OS.has_feature("web"):
		return
	var payload: String = JSON.stringify({
		"type": "godot_match_event",
		"minute": int(minute),
		"text": text,
		"goal": is_goal
	})
	JavaScriptBridge.eval("window.parent.postMessage(%s, '*')" % payload, true)

func _post_result_to_parent() -> void:
	if not OS.has_feature("web"):
		return
	var won: bool = score_home > score_away
	var payload: String = JSON.stringify({
		"type": "godot_match_result",
		"won": won,
		"score_home": score_home,
		"score_away": score_away,
		"score": "%d–%d" % [score_home, score_away]
	})
	var js: String = "window.parent.postMessage(%s, '*')" % payload
	JavaScriptBridge.eval(js, true)
