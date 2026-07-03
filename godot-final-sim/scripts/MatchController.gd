extends Control

signal pass_started(from_pos: Vector2, to_pos: Vector2, pass_type: String)
signal pass_received(receiver)
signal pass_failed(target_pos: Vector2)
signal shot_taken(from_pos: Vector2, target_pos: Vector2)
signal cross_started(from_pos: Vector2, target_area: Vector2)
signal ball_lost(position: Vector2)
signal possession_changed(old_player, new_player)
signal press_triggered(player)
signal loose_ball_contested(players: Array)
signal out_of_play(position: Vector2)
signal goal_scored(team_id: int)

const TEST_INPUT_PATH: String = "res://data/test_match.json"
const STATE_KICK_OFF: String = "KICK_OFF"
const STATE_IN_PLAY: String = "IN_PLAY"
const STATE_OUT_OF_PLAY: String = "OUT_OF_PLAY"
const STATE_GOAL: String = "GOAL"
const STATE_THROW_IN: String = "THROW_IN"
const STATE_CORNER: String = "CORNER"
const STATE_GOAL_KICK: String = "GOAL_KICK"
const STATE_FREE_KICK: String = "FREE_KICK"
const STATE_PAUSED: String = "PAUSED"

var home: TeamController = TeamController.new()
var away: TeamController = TeamController.new()
var ball: MatchBall = MatchBall.new()
var movement: MovementSystem = MovementSystem.new()
var decision: DecisionSystem = DecisionSystem.new()
var event_generator: MatchEventGenerator = MatchEventGenerator.new()
var archive: MatchArchive = MatchArchive.new()
var pitch_mgr: PitchManager = PitchManager.new()
var debug_overlay: DebugOverlay = DebugOverlay.new()
var pitch_visual: PitchVisual = PitchVisual.new()
var player_visual: PlayerVisual = PlayerVisual.new()
var ball_visual: BallVisual = BallVisual.new()
var tactical_visual: TacticalVisualManager = TacticalVisualManager.new()
var effect_manager: EffectManager = EffectManager.new()
var camera_controller: CameraController = CameraController.new()
var match_ui: MatchUI = MatchUI.new()

var score_home: int = 0
var score_away: int = 0
var minute: float = 0.0
var match_state: String = STATE_KICK_OFF
var decision_timer: float = 0.0
var restart_timer: float = 0.0
var commentary: Array[String] = []
var paused: bool = false
var speed: float = 1.0
var home_phase: String = "build_up"
var away_phase: String = "defense"
var last_phase_text: String = ""
var replay_data: Dictionary = {}
var event_list: Array = []
var event_index: int = -1
var current_event: Dictionary = {}
var event_timer: float = 0.0
var event_elapsed: float = 0.0
var event_duration: float = 1.15
var event_release_delay: float = 0.25
var event_action_started: bool = false
var event_actor: PlayerAgent = null
var event_receiver: PlayerAgent = null
var event_ball_path: Array[Vector2] = []
var replay_mode: bool = true
var advanced_visuals_enabled: bool = false
var visual_events_enabled: bool = false
var emergency_safe_draw: bool = true
var emergency_disable_process: bool = true

var score_label: Label
var info_label: Label
var log_box: RichTextLabel
var field: Control
var speed_button: Button
var debug_button: Button
var camera_button: Button

func _ready() -> void:
	_build_ui()
	if visual_events_enabled:
		_connect_visual_events()
	_start_match()
	if emergency_disable_process:
		set_process(false)

func _process(delta: float) -> void:
	if paused:
		return
	var dt: float = delta * speed
	if replay_mode:
		_process_replay(dt)
	else:
		_process_live(dt)
	if visual_events_enabled:
		effect_manager.update(dt)
		ball_visual.update(ball, dt)
		camera_controller.update(ball, _possession_center(), dt)
	_update_labels()
	field.queue_redraw()

func _process_live(dt: float) -> void:
	if match_state == STATE_OUT_OF_PLAY or match_state == STATE_GOAL:
		restart_timer -= dt
		if restart_timer <= 0.0:
			_restart_after_stoppage()
		return
	minute += dt * 2.4
	decision_timer -= dt
	_update_phases()
	home.update_shape(ball, away, dt, home_phase)
	away.update_shape(ball, home, dt, away_phase)
	movement.update_players(_all_players(), dt, pitch_mgr)
	ball.update(dt, pitch_mgr)
	_check_out_of_play()
	_resolve_loose_ball()
	if ball.owner != null and decision_timer <= 0.0:
		_make_ball_decision()
	_check_goal()

func _process_replay(dt: float) -> void:
	if event_list.is_empty():
		return
	event_timer -= dt
	event_elapsed += dt
	_update_replay_shapes(dt)
	_apply_replay_event_intents()
	movement.update_players(_all_players(), dt, pitch_mgr)
	if not event_action_started and event_elapsed >= event_release_delay:
		_start_event_action()
	_update_replay_ball(dt)
	_resolve_replay_receive()
	if event_timer <= 0.0:
		_finish_current_event()
		_start_next_event()

func _build_ui() -> void:
	var root: VBoxContainer = VBoxContainer.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.offset_left = 18
	root.offset_top = 14
	root.offset_right = -18
	root.offset_bottom = -14
	root.add_theme_constant_override("separation", 10)
	add_child(root)

	var top: HBoxContainer = HBoxContainer.new()
	root.add_child(top)

	score_label = Label.new()
	score_label.add_theme_font_size_override("font_size", 30)
	top.add_child(score_label)

	var spacer: Control = Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.add_child(spacer)

	var reset_button: Button = Button.new()
	reset_button.text = "Restart"
	reset_button.pressed.connect(_start_match)
	top.add_child(reset_button)

	var instant_button: Button = Button.new()
	instant_button.text = "Instant"
	instant_button.pressed.connect(_show_instant_result)
	top.add_child(instant_button)

	var summary_button: Button = Button.new()
	summary_button.text = "Summary"
	summary_button.pressed.connect(_show_archive_summary)
	top.add_child(summary_button)

	debug_button = Button.new()
	debug_button.text = "Debug ON" if debug_overlay.enabled else "Debug OFF"
	debug_button.pressed.connect(_toggle_debug)
	top.add_child(debug_button)

	speed_button = Button.new()
	speed_button.text = "Speed 1x"
	speed_button.pressed.connect(_cycle_speed)
	top.add_child(speed_button)

	camera_button = Button.new()
	camera_button.text = "Cam Full"
	camera_button.pressed.connect(_cycle_camera)
	top.add_child(camera_button)

	var pause_button: Button = Button.new()
	pause_button.text = "Pause"
	pause_button.pressed.connect(func(): paused = not paused)
	top.add_child(pause_button)

	var body: HBoxContainer = HBoxContainer.new()
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	body.add_theme_constant_override("separation", 14)
	root.add_child(body)

	field = Control.new()
	field.custom_minimum_size = Vector2(880, 560)
	field.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	field.size_flags_vertical = Control.SIZE_EXPAND_FILL
	field.draw.connect(_draw_field)
	body.add_child(field)

	var side: VBoxContainer = VBoxContainer.new()
	side.custom_minimum_size = Vector2(330, 0)
	body.add_child(side)

	info_label = Label.new()
	info_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	side.add_child(info_label)

	log_box = RichTextLabel.new()
	log_box.bbcode_enabled = true
	log_box.size_flags_vertical = Control.SIZE_EXPAND_FILL
	side.add_child(log_box)

func _start_match() -> void:
	var input: Dictionary = _load_input()
	home.setup(0, str(input.get("home_name", "copa.life XI")), "4-4-2", str(input.get("style", "gegen")))
	away.setup(1, str(input.get("away_name", "Final Rakibi")), "4-3-3", "balanced")
	decision.seed_from(str(input.get("seed", "2026")))
	replay_data = event_generator.generate(input)
	event_list = replay_data.get("events", [])
	score_home = 0
	score_away = 0
	minute = 0.0
	match_state = STATE_IN_PLAY
	decision_timer = 0.8
	restart_timer = 0.0
	event_index = -1
	event_timer = 0.0
	current_event = {}
	event_actor = null
	event_receiver = null
	commentary.clear()
	log_box.clear()
	var starter: PlayerAgent = home.players[9]
	ball.reset(starter.pos)
	ball.attach(starter)
	_log("Generated %d weighted events. Replay starts." % event_list.size(), "#d6c8a8")
	_log("Event archive is the source of truth. Visual layer only replays it.", "#d6c8a8")
	_start_next_event()

func _load_input() -> Dictionary:
	if not FileAccess.file_exists(TEST_INPUT_PATH):
		return {}
	var parsed = JSON.parse_string(FileAccess.get_file_as_string(TEST_INPUT_PATH))
	return parsed if typeof(parsed) == TYPE_DICTIONARY else {}

func _start_next_event() -> void:
	event_index += 1
	if event_index >= event_list.size():
		match_state = STATE_PAUSED
		_log("Full time. Replay event list complete.", "#d6c8a8")
		return
	current_event = event_list[event_index]
	minute = float(current_event.get("minute", minute))
	match_state = STATE_IN_PLAY
	event_duration = _duration_for_event(current_event)
	event_timer = event_duration
	event_elapsed = 0.0
	event_action_started = false
	_apply_event_start(current_event)

func _apply_event_start(ev: Dictionary) -> void:
	var team_id: int = int(ev.get("team", 0))
	var actor_role: String = str(ev.get("actor_role", "CM"))
	var receiver_role: String = str(ev.get("receiver_role", ""))
	var team: TeamController = home if team_id == 0 else away
	var start: Vector2 = _dict_to_vec(ev.get("start", {"x": 0.5, "y": 0.5}))
	var end: Vector2 = _dict_to_vec(ev.get("end", {"x": 0.5, "y": 0.5}))
	var action: String = str(ev.get("action", "SHORT_PASS"))
	event_actor = _player_for_role(team, actor_role, start)
	event_receiver = _player_for_role(team, receiver_role, end)
	if ball.owner != null and ball.owner.team_id == team_id and not _requires_role_actor(action) and ball.owner.pos.distance_to(start) < 0.45:
		event_actor = ball.owner
	if event_index == 0:
		event_actor.pos = start
	ball.reset(event_actor.pos)
	ball.attach(event_actor)
	event_ball_path = _event_ball_path(ev, event_actor.pos, end)
	event_release_delay = _release_delay_for_action(action)
	event_actor.target = end if action == "DRIBBLE" else start
	_set_replay_phase(team_id, str(ev.get("phase", "progression")), str(ev.get("pattern", "BUILD_UP_CENTER")))
	if action == "DRIBBLE":
		_start_event_action()
	_log("%02d' %s" % [int(minute), str(ev.get("label", ""))], "#b9d7ff")

func _start_event_action() -> void:
	if event_action_started or current_event.is_empty() or event_actor == null:
		return
	event_action_started = true
	var action: String = str(current_event.get("action", "SHORT_PASS"))
	var end: Vector2 = _dict_to_vec(current_event.get("end", {"x": 0.5, "y": 0.5}))
	var pressure: float = float(current_event.get("pressure", 0.2))
	var power: float = _power_for_action(action, event_actor.pos.distance_to(end))
	var error: float = 0.0
	event_ball_path = _event_ball_path(current_event, event_actor.pos, end)
	match action:
		"SHOOT":
			ball.shoot_to_goal(event_actor, end, power, 0.86 - pressure * 0.12)
			event_actor.current_state = "SHOOT"
			if visual_events_enabled:
				shot_taken.emit(event_actor.pos, end)
		"DRIBBLE":
			event_actor.target = end
			ball.attach(event_actor)
			event_actor.current_state = "DRIBBLE"
		"CROSS":
			ball.pass_to_space(event_actor, end, power, error, "CROSSING")
			if visual_events_enabled:
				cross_started.emit(event_actor.pos, end)
				pass_started.emit(event_actor.pos, end, action)
		"THROUGH_BALL", "LONG_PASS":
			if event_receiver != null:
				event_receiver.current_state = "RECEIVE_PASS"
				event_receiver.target = end
			ball.pass_to_space(event_actor, end, power, error, "PASSING")
			if visual_events_enabled:
				pass_started.emit(event_actor.pos, end, action)
		_:
			if event_receiver != null:
				event_receiver.current_state = "RECEIVE_PASS"
				event_receiver.target = end
				ball.pass_to_space(event_actor, end, power, error, "PASSING")
			else:
				ball.pass_to_space(event_actor, end, power, error, "PASSING")
			if visual_events_enabled:
				pass_started.emit(event_actor.pos, end, action)

func _finish_current_event() -> void:
	if current_event.is_empty():
		return
	score_home = int(current_event.get("score_home", score_home))
	score_away = int(current_event.get("score_away", score_away))
	var success: bool = bool(current_event.get("success", false))
	var goal: bool = bool(current_event.get("goal", false))
	var turnover: bool = bool(current_event.get("turnover", false))
	if goal:
		match_state = STATE_GOAL
		_log("%02d' GOAL. Score %d-%d." % [int(minute), score_home, score_away], "#4ade80")
		if visual_events_enabled:
			goal_scored.emit(int(current_event.get("team", 0)))
	elif success and event_receiver != null:
		ball.attach(event_receiver)
		if visual_events_enabled:
			pass_received.emit(event_receiver)
	elif turnover:
		var opp_team: TeamController = away if int(current_event.get("team", 0)) == 0 else home
		var taker: PlayerAgent = opp_team.nearest_to(ball.pos)
		if taker != null:
			if visual_events_enabled:
				possession_changed.emit(event_actor, taker)
			ball.attach(taker)
	else:
		ball.make_loose("event_failed")
		if visual_events_enabled:
			pass_failed.emit(_dict_to_vec(current_event.get("end", {"x": ball.pos.x, "y": ball.pos.y})))
			ball_lost.emit(ball.pos)

func _update_replay_shapes(dt: float) -> void:
	var home_match_phase: String = home_phase
	var away_match_phase: String = away_phase
	home.update_shape(ball, away, dt, home_match_phase)
	away.update_shape(ball, home, dt, away_match_phase)
	var defending: TeamController = away if int(current_event.get("team", 0)) == 0 else home
	if ball.owner == null:
		var presser: PlayerAgent = defending.nearest_to(ball.pos)
		if presser != null:
			presser.current_state = "PRESS"
			presser.target = ball.pos

func _apply_replay_event_intents() -> void:
	if current_event.is_empty() or event_actor == null:
		return
	var team_id: int = int(current_event.get("team", 0))
	var action: String = str(current_event.get("action", "SHORT_PASS"))
	var start: Vector2 = _dict_to_vec(current_event.get("start", {"x": 0.5, "y": 0.5}))
	var end: Vector2 = _dict_to_vec(current_event.get("end", {"x": 0.5, "y": 0.5}))
	var attack_dir: float = -1.0 if team_id == 0 else 1.0
	var attacking: TeamController = home if team_id == 0 else away
	var defending: TeamController = away if team_id == 0 else home
	if event_action_started:
		if event_receiver != null and ball.owner == null:
			event_receiver.target = end
		return
	event_actor.target = start
	if event_receiver != null and event_receiver != event_actor:
		event_receiver.current_state = "ANTICIPATE_PASS"
		event_receiver.target = _receiver_run_target(action, event_receiver, end, attack_dir)
	_prepare_support_runs(attacking, event_actor, event_receiver, end, attack_dir)
	_prepare_defensive_reaction(defending, event_actor.pos, end)

func _resolve_replay_receive() -> void:
	if ball.owner != null:
		return
	if event_receiver != null and ball.can_be_controlled_by(event_receiver):
		if bool(current_event.get("success", false)):
			ball.attach(event_receiver)

func _update_replay_ball(dt: float) -> void:
	if ball.owner != null or not _event_uses_ball_path(str(current_event.get("action", ""))):
		ball.update(dt, null)
		return
	if event_ball_path.size() < 2:
		ball.update(dt, null)
		return
	var previous: Vector2 = ball.pos
	var travel_elapsed: float = maxf(0.0, event_elapsed - event_release_delay)
	var travel_duration: float = maxf((event_duration - event_release_delay) * 0.92, 0.01)
	var t: float = clampf(travel_elapsed / travel_duration, 0.0, 1.0)
	var eased: float = t * t * (3.0 - 2.0 * t)
	ball.pos = _sample_path(event_ball_path, eased)
	ball.target_position = event_ball_path[event_ball_path.size() - 1]
	ball.vel = (ball.pos - previous) / maxf(dt, 0.001)
	ball.loose_timer += dt
	if t >= 1.0:
		ball.vel = Vector2.ZERO

func _event_uses_ball_path(action: String) -> bool:
	return action in ["SHORT_PASS", "BACK_PASS", "PASS_TO_WING", "THROUGH_BALL", "LONG_PASS", "CROSS", "SHOOT"]

func _release_delay_for_action(action: String) -> float:
	match action:
		"DRIBBLE":
			return 0.0
		"SHOOT":
			return 0.18
		"CROSS", "THROUGH_BALL", "LONG_PASS":
			return 0.42
		_:
			return 0.32

func _receiver_run_target(action: String, receiver: PlayerAgent, end: Vector2, attack_dir: float) -> Vector2:
	var target: Vector2 = end
	match action:
		"THROUGH_BALL":
			target.y = clampf(end.y + attack_dir * 0.045, 0.05, 0.95)
		"CROSS":
			target.x = clampf(0.50 + (receiver.base_pos.x - 0.5) * 0.24, 0.26, 0.74)
			target.y = end.y
		"PASS_TO_WING":
			target.x = end.x
			target.y = clampf(end.y + attack_dir * 0.025, 0.06, 0.94)
		"BACK_PASS":
			target.y = clampf(end.y - attack_dir * 0.025, 0.06, 0.94)
		_:
			target.x = clampf(end.x + (receiver.base_pos.x - 0.5) * 0.07, 0.07, 0.93)
	return target

func _prepare_support_runs(team: TeamController, actor: PlayerAgent, receiver: PlayerAgent, end: Vector2, attack_dir: float) -> void:
	for p in team.players:
		if p == actor or p == receiver or p.is_goalkeeper():
			continue
		if p.pos.distance_to(actor.pos) < 0.34:
			var side: float = -1.0 if p.id % 2 == 0 else 1.0
			p.target = Vector2(
				clampf(p.target.x + side * 0.045, 0.07, 0.93),
				clampf(p.target.y + attack_dir * (0.035 if p.is_forward() or p.is_midfielder() else 0.015), 0.06, 0.94)
			)
			p.current_state = "OFFER_PASSING_ANGLE"

func _prepare_defensive_reaction(team: TeamController, from_pos: Vector2, to_pos: Vector2) -> void:
	var presser: PlayerAgent = team.nearest_to(from_pos)
	if presser != null and not presser.is_goalkeeper():
		presser.target = from_pos
		presser.current_state = "PRESS_BALL_CARRIER"
		if visual_events_enabled:
			press_triggered.emit(presser)
	var lane_mid: Vector2 = from_pos.lerp(to_pos, 0.55)
	var cover: PlayerAgent = _nearest_non_keeper_to(team, lane_mid, presser)
	if cover != null:
		cover.target = lane_mid
		cover.current_state = "BLOCK_PASSING_LANE"

func _nearest_non_keeper_to(team: TeamController, point: Vector2, ignore: PlayerAgent = null) -> PlayerAgent:
	var best: PlayerAgent = null
	var best_d: float = 999.0
	for p in team.players:
		if p == ignore or p.is_goalkeeper():
			continue
		var d: float = p.pos.distance_to(point)
		if d < best_d:
			best = p
			best_d = d
	return best

func _event_ball_path(ev: Dictionary, actual_start: Vector2, fallback_end: Vector2) -> Array[Vector2]:
	var result: Array[Vector2] = [actual_start]
	var raw_path = ev.get("path", [])
	if typeof(raw_path) == TYPE_ARRAY and raw_path.size() >= 2:
		for i in range(1, raw_path.size()):
			result.append(_dict_to_vec(raw_path[i]))
	else:
		result.append(actual_start.lerp(fallback_end, 0.5))
		result.append(fallback_end)
	return result

func _sample_path(points: Array[Vector2], t: float) -> Vector2:
	if points.size() == 2:
		return points[0].lerp(points[1], t)
	if points.size() == 3:
		var a: Vector2 = points[0].lerp(points[1], t)
		var b: Vector2 = points[1].lerp(points[2], t)
		return a.lerp(b, t)
	var scaled: float = t * float(points.size() - 1)
	var idx: int = mini(int(floor(scaled)), points.size() - 2)
	return points[idx].lerp(points[idx + 1], scaled - float(idx))

func _set_replay_phase(team_id: int, phase: String, pattern: String) -> void:
	if team_id == 0:
		home_phase = phase
		home.current_attack_pattern = pattern
		home.team_phase = "ATTACK"
		away_phase = "press" if phase in ["build_up", "progression"] else "defense"
		away.team_phase = "DEFEND"
	else:
		away_phase = phase
		away.current_attack_pattern = pattern
		away.team_phase = "ATTACK"
		home_phase = "press" if phase in ["build_up", "progression"] else "defense"
		home.team_phase = "DEFEND"

func _duration_for_event(ev: Dictionary) -> float:
	var intensity: float = float(ev.get("visual_intensity", 0.35))
	match str(ev.get("action", "SHORT_PASS")):
		"SHOOT":
			return 1.05 + intensity * 0.25
		"CROSS", "LONG_PASS", "THROUGH_BALL":
			return 1.45 + intensity * 0.35
		"DRIBBLE":
			return 1.75 + intensity * 0.35
		_:
			return 1.25 + intensity * 0.25

func _power_for_action(action: String, distance: float) -> float:
	match action:
		"SHOOT":
			return 1.10
		"CROSS", "LONG_PASS", "THROUGH_BALL":
			return clampf(0.72 + distance * 0.90, 0.74, 1.12)
		"DRIBBLE":
			return 0.0
		_:
			return clampf(0.42 + distance * 0.82, 0.42, 0.86)

func _requires_role_actor(action: String) -> bool:
	return action in ["SHOOT", "CROSS"]

func _player_for_role(team: TeamController, role: String, preferred_pos: Vector2 = Vector2(-1.0, -1.0)) -> PlayerAgent:
	var candidates: Array[PlayerAgent] = []
	for p in team.players:
		if p.role == role:
			candidates.append(p)
	if role == "LM":
		for p in team.players:
			if p.role in ["LW", "LWB", "LB"]:
				candidates.append(p)
	if role == "RM":
		for p in team.players:
			if p.role in ["RW", "RWB", "RB"]:
				candidates.append(p)
	if candidates.size() > 0:
		return _nearest_candidate(candidates, preferred_pos)
	for p in team.players:
		if not p.is_goalkeeper():
			candidates.append(p)
	if candidates.size() > 0:
		return _nearest_candidate(candidates, preferred_pos)
	return team.players[0]

func _nearest_candidate(candidates: Array[PlayerAgent], preferred_pos: Vector2) -> PlayerAgent:
	if preferred_pos.x < 0.0:
		return candidates[0]
	var best: PlayerAgent = candidates[0]
	var best_d: float = best.pos.distance_to(preferred_pos)
	for p in candidates:
		var d: float = p.pos.distance_to(preferred_pos)
		if d < best_d:
			best = p
			best_d = d
	return best

func _dict_to_vec(v) -> Vector2:
	if typeof(v) == TYPE_DICTIONARY:
		return Vector2(float(v.get("x", 0.5)), float(v.get("y", 0.5)))
	return Vector2(0.5, 0.5)

func _make_ball_decision() -> void:
	var owner: PlayerAgent = ball.owner
	var team: TeamController = home if owner.team_id == 0 else away
	var opp: TeamController = away if owner.team_id == 0 else home
	var score_diff: int = score_home - score_away if owner.team_id == 0 else score_away - score_home
	var phase: String = home_phase if owner.team_id == 0 else away_phase
	var action: Dictionary = decision.decide(owner, team, opp, ball, score_diff, minute, phase)
	var kind: String = str(action.get("type", "hold"))
	var target: Vector2 = action.get("target", owner.pos)
	var receiver: PlayerAgent = action.get("receiver", null)
	var quality: float = float(action.get("quality", 0.6))
	var pressure: float = opp.pressure_on(owner.pos)
	decision_timer = 0.75 + randf() * 0.55

	match kind:
		"SHOOT":
			ball.shoot_to_goal(owner, target, 1.02, quality - pressure * 0.18)
			owner.current_state = "SHOOT"
			_log("%02d' %s shoots." % [int(minute), owner.name], "#e6ad2e")
		"DRIBBLE":
			owner.target = target
			owner.current_state = "DRIBBLE"
			ball.attach(owner)
			decision_timer = 0.45
		"HOLD_BALL":
			owner.current_state = "HOLD_POSITION"
			decision_timer = 0.35
		_:
			var error: float = _pass_error(owner, receiver, pressure)
			var power: float = 0.42 + owner.pos.distance_to(target) * 0.9
			if kind == "THROUGH_BALL" or kind == "LONG_PASS":
				power += 0.22
				if receiver != null:
					target = _lead_target(owner, receiver)
					ball.pass_to_space(owner, target, power, error, "PASSING")
				else:
					ball.pass_to_space(owner, target, power, error, "PASSING")
			elif kind == "CROSS":
				ball.pass_to_space(owner, target, power + 0.18, error + 0.03, "CROSSING")
			elif receiver != null:
				ball.pass_to_player(owner, receiver, power, error)
				receiver.current_state = "RECEIVE_PASS"
			else:
				ball.pass_to_space(owner, target, power, error)
			if receiver != null:
				_log("%02d' [%s/%s] %s -> %s" % [int(minute), phase, kind, owner.name, receiver.name], "#b9d7ff")

func _pass_error(owner: PlayerAgent, receiver: PlayerAgent, pressure: float) -> float:
	var distance: float = 0.20
	if receiver != null:
		distance = owner.pos.distance_to(receiver.pos)
	return clampf(0.015 + distance * 0.045 + pressure * 0.035 - owner.passing * 0.00035 - owner.vision * 0.00020, 0.004, 0.085)

func _lead_target(owner: PlayerAgent, receiver: PlayerAgent) -> Vector2:
	var attack_dir: float = -1.0 if owner.team_id == 0 else 1.0
	return Vector2(receiver.pos.x, clampf(receiver.pos.y + attack_dir * 0.08, 0.04, 0.96))

func _update_phases() -> void:
	home_phase = _phase_for_team(home, away)
	away_phase = _phase_for_team(away, home)
	var text: String = "Home: %s | Away: %s" % [home_phase, away_phase]
	if text != last_phase_text:
		last_phase_text = text

func _phase_for_team(team: TeamController, opponent: TeamController) -> String:
	var has_it: bool = team.has_ball(ball)
	var other_has_it: bool = opponent.has_ball(ball)
	var home_side: bool = team.side == 0
	var attack_progress: float = (1.0 - ball.pos.y) if home_side else ball.pos.y
	var own_third: bool = attack_progress < 0.34
	var middle_third: bool = attack_progress >= 0.34 and attack_progress < 0.68
	var final_third: bool = attack_progress >= 0.68

	if has_it:
		if final_third:
			if ball.pos.x < 0.28 or ball.pos.x > 0.72:
				return "wide_attack"
			if abs(ball.pos.x - 0.5) < 0.18:
				return "central_attack"
			return "final_third"
		if middle_third:
			if ball.pos.x < 0.22 or ball.pos.x > 0.78:
				return "wide_attack"
			return "progression"
		if own_third:
			return "build_up"
	elif other_has_it:
		var pressure_line: float = opponent.tactic.pressing
		var team_goal_danger: float = ball.pos.y if team.side == 1 else 1.0 - ball.pos.y
		if ball.loose_timer < 1.2 and pressure_line > 0.55:
			return "press"
		if team_goal_danger < 0.28:
			return "low_block"
		if ball.last_touch_team == team.side:
			return "transition_defense"
		return "defense"
	return "transition_defense"

func _resolve_loose_ball() -> void:
	if ball.owner != null or ball.ball_state == "OUT_OF_PLAY":
		return
	var best: PlayerAgent = null
	var best_d: float = 999.0
	var best_chaser: PlayerAgent = null
	for p in _all_players():
		var d: float = p.pos.distance_to(ball.pos)
		if d < best_d:
			best_chaser = p
			best_d = d
		if ball.can_be_controlled_by(p):
			best = p
			break
	if best_chaser != null and best == null:
		best_chaser.current_state = "CHASE_LOOSE_BALL"
		best_chaser.target = ball.pos
	if best != null:
		ball.attach(best)
		decision_timer = 0.25

func _check_goal() -> void:
	if ball.owner != null:
		return
	if pitch_mgr.is_goal(ball.pos) == 0:
		score_home += 1
		match_state = STATE_GOAL
		_log("%02d' GOAL! %s" % [int(minute), home.team_name], "#4ade80")
		_prepare_stoppage(1.6)
	elif pitch_mgr.is_goal(ball.pos) == 1:
		score_away += 1
		match_state = STATE_GOAL
		_log("%02d' GOAL! %s" % [int(minute), away.team_name], "#ff8a75")
		_prepare_stoppage(1.6)

func _check_out_of_play() -> void:
	if ball.ball_state != "OUT_OF_PLAY":
		return
	if pitch_mgr.is_goal(ball.pos) != -1:
		return
	match_state = STATE_OUT_OF_PLAY
	_log("%02d' Ball out of play. Temporary restart." % int(minute), "#d6c8a8")
	_prepare_stoppage(1.0)

func _prepare_stoppage(seconds: float) -> void:
	restart_timer = seconds
	decision_timer = seconds
	ball.vel = Vector2.ZERO

func _restart_after_stoppage() -> void:
	var starter: PlayerAgent = home.players[9] if ball.last_touch_team == 1 else away.players[9]
	if match_state == STATE_GOAL:
		starter = away.players[9] if score_home > score_away else home.players[9]
	ball.reset(Vector2(0.5, 0.5))
	for p in home.players:
		p.pos = p.base_pos
		p.target = p.base_pos
	for p in away.players:
		p.pos = p.base_pos
		p.target = p.base_pos
	ball.attach(starter)
	match_state = STATE_IN_PLAY
	decision_timer = 1.0

func _update_labels() -> void:
	score_label.text = match_ui.score_text(home.team_name, away.team_name, score_home, score_away, minute)
	info_label.text = match_ui.info_text(ball, match_state, home, away, home_phase, away_phase)

func _cycle_speed() -> void:
	if speed == 1.0:
		speed = 2.0
	elif speed == 2.0:
		speed = 4.0
	else:
		speed = 1.0
	speed_button.text = "Speed %sx" % speed

func _toggle_debug() -> void:
	debug_overlay.enabled = not debug_overlay.enabled
	debug_button.text = "Debug ON" if debug_overlay.enabled else "Debug OFF"
	field.queue_redraw()

func _cycle_camera() -> void:
	camera_controller.cycle_mode()
	camera_button.text = "Cam %s" % camera_controller.mode_text()

func _show_instant_result() -> void:
	if replay_data.is_empty():
		return
	score_home = int(replay_data.get("score_home", score_home))
	score_away = int(replay_data.get("score_away", score_away))
	event_index = event_list.size()
	current_event = {}
	match_state = STATE_PAUSED
	ball.reset(Vector2(0.5, 0.5))
	_log("Instant result: %s %d-%d %s. Event list preserved for replay." % [
		home.team_name, score_home, score_away, away.team_name
	], "#e6ad2e")
	_update_labels()
	field.queue_redraw()

func _show_archive_summary() -> void:
	if replay_data.is_empty():
		return
	_log(archive.summary(replay_data).replace("\n", " | "), "#e6ad2e")

func _all_players() -> Array[PlayerAgent]:
	var all: Array[PlayerAgent] = []
	all.append_array(home.players)
	all.append_array(away.players)
	return all

func _connect_visual_events() -> void:
	pass_started.connect(effect_manager.on_pass_started)
	pass_received.connect(effect_manager.on_pass_received)
	pass_failed.connect(effect_manager.on_pass_failed)
	shot_taken.connect(effect_manager.on_shot_taken)
	cross_started.connect(func(_from_pos: Vector2, _target_area: Vector2) -> void: pass)
	ball_lost.connect(effect_manager.on_ball_lost)
	goal_scored.connect(effect_manager.on_goal_scored)

func _possession_center() -> Vector2:
	var team: TeamController = home
	if ball.owner != null and ball.owner.team_id == 1:
		team = away
	var sum: Vector2 = Vector2.ZERO
	var count: int = 0
	for p in team.players:
		if p.pos.distance_to(ball.pos) < 0.42:
			sum += p.pos
			count += 1
	if count == 0:
		return ball.pos
	return sum / float(count)

func _log(text: String, color: String) -> void:
	log_box.append_text("[color=%s]%s[/color]\n" % [color, text])
	log_box.scroll_to_line(maxi(0, log_box.get_line_count() - 1))

func _draw_field() -> void:
	var r: Rect2 = Rect2(Vector2.ZERO, field.size)
	field.draw_rect(r, Color("#102018"))
	var margin: float = 28.0
	var pitch: Rect2 = Rect2(Vector2(margin, margin), r.size - Vector2(margin * 2.0, margin * 2.0))
	if emergency_safe_draw:
		field.draw_rect(pitch, Color("#1f6337"))
		field.draw_rect(pitch, Color("#dcefd8"), false, 3.0)
		field.draw_line(Vector2(pitch.position.x, pitch.get_center().y), Vector2(pitch.end.x, pitch.get_center().y), Color("#dcefd8", 0.75), 2.0)
		field.draw_circle(pitch.get_center(), pitch.size.y * 0.12, Color("#dcefd8", 0.75), false, 2.0)
		return
	if not advanced_visuals_enabled:
		_draw_basic_field(pitch)
		return
	pitch_visual.draw(field, pitch)
	tactical_visual.draw(field, pitch, pitch_mgr, home, away, ball, current_event, debug_overlay.enabled)
	var font: Font = field.get_theme_default_font()
	player_visual.draw_team(field, pitch, pitch_mgr, home.players, font, debug_overlay.enabled)
	player_visual.draw_team(field, pitch, pitch_mgr, away.players, font, debug_overlay.enabled)
	debug_overlay.draw(field, pitch, pitch_mgr, home, away, ball, match_state)
	var action: String = str(current_event.get("action", ""))
	var progress: float = clampf(maxf(0.0, event_elapsed - event_release_delay) / maxf(event_duration - event_release_delay, 0.01), 0.0, 1.0)
	effect_manager.draw(field, pitch, pitch_mgr)
	ball_visual.draw(field, pitch, pitch_mgr, ball, action, progress)

func _draw_basic_field(pitch: Rect2) -> void:
	field.draw_rect(pitch, Color("#1f6337"))
	field.draw_rect(pitch, Color("#dcefd8"), false, 3.0)
	field.draw_line(Vector2(pitch.position.x, pitch.get_center().y), Vector2(pitch.end.x, pitch.get_center().y), Color("#dcefd8", 0.75), 2.0)
	field.draw_circle(pitch.get_center(), pitch.size.y * 0.12, Color("#dcefd8", 0.75), false, 2.0)
	_draw_boxes(pitch)
	_draw_players(pitch, home.players, Color("#f5f0e8"))
	_draw_players(pitch, away.players, Color("#d95040"))
	debug_overlay.draw(field, pitch, pitch_mgr, home, away, ball, match_state)
	var bp: Vector2 = pitch_mgr.to_screen(pitch, ball.pos)
	field.draw_circle(bp, 13.0, Color("#ffffff", 0.18))
	field.draw_circle(bp, 6.0, Color.WHITE)
	field.draw_circle(bp, 2.5, Color.BLACK)

func _draw_boxes(pitch: Rect2) -> void:
	var box_w: float = pitch.size.x * 0.42
	var box_h: float = pitch.size.y * 0.16
	var x: float = pitch.get_center().x - box_w * 0.5
	field.draw_rect(Rect2(Vector2(x, pitch.position.y), Vector2(box_w, box_h)), Color("#dcefd8", 0.75), false, 2.0)
	field.draw_rect(Rect2(Vector2(x, pitch.end.y - box_h), Vector2(box_w, box_h)), Color("#dcefd8", 0.75), false, 2.0)

func _draw_players(pitch: Rect2, players: Array[PlayerAgent], color: Color) -> void:
	for p in players:
		var sp: Vector2 = _to_screen(pitch, p.pos)
		var tp: Vector2 = _to_screen(pitch, p.target)
		if debug_overlay.enabled:
			var faint: Color = color
			faint.a = 0.18
			field.draw_line(sp, tp, faint, 1.0)
		field.draw_circle(sp, 10.0 if not p.is_goalkeeper() else 12.0, color)
		field.draw_circle(sp, 10.0 if not p.is_goalkeeper() else 12.0, Color("#102018"), false, 2.0)
		if p.has_ball:
			field.draw_circle(sp, 16.0, Color("#e6ad2e", 0.38), false, 3.0)

func _to_screen(pitch: Rect2, point: Vector2) -> Vector2:
	return pitch_mgr.to_screen(pitch, point)
