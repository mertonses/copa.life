class_name MatchBall
extends RefCounted

const OWNED: String = "OWNED"
const PASSING: String = "PASSING"
const LOOSE: String = "LOOSE"
const SHOOTING: String = "SHOOTING"
const CROSSING: String = "CROSSING"
const OUT_OF_PLAY: String = "OUT_OF_PLAY"

var pos: Vector2 = Vector2(0.5, 0.5)
var vel: Vector2 = Vector2.ZERO
var owner: PlayerAgent = null
var current_owner: PlayerAgent = null
var state: String = LOOSE
var previous_owner: PlayerAgent = null
var target_player: PlayerAgent = null
var target_position: Vector2 = Vector2.ZERO
var last_touch_team: int = 0
var last_touch_player: PlayerAgent = null
var loose_timer: float = 0.0
var ball_state: String = LOOSE
var friction: float = 0.34
var max_speed: float = 1.15
var pass_error_amount: float = 0.0
var transition_log: Array[String] = []
var travel_path: Array[Vector2] = []
var travel_elapsed: float = 0.0
var travel_duration: float = 0.0
var path_start_pos: Vector2 = Vector2.ZERO
var travel_reason: String = ""

func reset(center: Vector2) -> void:
	pos = center
	vel = Vector2.ZERO
	owner = null
	current_owner = null
	previous_owner = null
	target_player = null
	target_position = center
	loose_timer = 0.0
	_clear_path()
	_set_state(LOOSE, "reset")

func attach(player: PlayerAgent) -> void:
	set_owner(player, "attach")

func set_owner(player: PlayerAgent, reason: String = "set_owner") -> void:
	if player == null:
		make_loose("set_owner_null")
		return
	for p_owner in [owner, previous_owner]:
		if p_owner != null:
			p_owner.has_ball = false
	if owner != null:
		owner.has_ball = false
	previous_owner = owner
	owner = player
	current_owner = player
	target_player = null
	target_position = player.pos
	vel = Vector2.ZERO
	loose_timer = 0.0
	owner.has_ball = true
	owner.start_possession_beat("RECEIVE")
	_clear_path()
	last_touch_team = owner.team_id
	last_touch_player = owner
	pos = owner.pos
	_set_state(OWNED, "%s | owner: %s" % [reason, owner.name])

func clear_owner(reason: String = "clear_owner") -> void:
	if owner != null:
		owner.has_ball = false
	previous_owner = owner
	owner = null
	current_owner = null
	_set_state(ball_state, reason)

func make_loose(reason: String = "loose") -> void:
	if owner != null:
		owner.has_ball = false
	previous_owner = owner
	owner = null
	current_owner = null
	target_player = null
	loose_timer = 0.0
	_clear_path()
	_set_state(LOOSE, reason)

func start_pass(from_player: PlayerAgent, receiver: PlayerAgent, target: Vector2, pass_power: float, error_amount: float = 0.0, reason: String = "pass") -> void:
	_start_travel(target + _error_vector(error_amount), pass_power, from_player, receiver, PASSING, error_amount, reason)

func start_shot(from_player: PlayerAgent, target_goal_position: Vector2, power: float, accuracy: float, reason: String = "shot") -> void:
	var error: float = clampf((1.0 - accuracy) * 0.10, 0.0, 0.16)
	_start_travel(target_goal_position + _error_vector(error), power, from_player, null, SHOOTING, error, reason)

func start_cross(from_player: PlayerAgent, target: Vector2, receiver: PlayerAgent = null, power: float = 1.0, error_amount: float = 0.0, reason: String = "cross") -> void:
	_start_travel(target + _error_vector(error_amount), power, from_player, receiver, CROSSING, error_amount, reason)

func set_out_of_play(reason: String = "out_of_play") -> void:
	if owner != null:
		owner.has_ball = false
	previous_owner = owner
	owner = null
	current_owner = null
	target_player = null
	vel = Vector2.ZERO
	_clear_path()
	_set_state(OUT_OF_PLAY, reason)

func pass_to_player(from_player: PlayerAgent, to_player: PlayerAgent, pass_power: float, error_amount: float) -> void:
	start_pass(from_player, to_player, to_player.pos, pass_power, error_amount, "pass_to_player")

func pass_to_space(from_player: PlayerAgent, target: Vector2, pass_power: float, error_amount: float, state: String = "PASSING") -> void:
	if state == CROSSING:
		start_cross(from_player, target, null, pass_power, error_amount, "pass_to_space_cross")
	else:
		start_pass(from_player, null, target, pass_power, error_amount, "pass_to_space")

func shoot_to_goal(from_player: PlayerAgent, target_goal_position: Vector2, power: float, accuracy: float) -> void:
	start_shot(from_player, target_goal_position, power, accuracy, "shoot_to_goal")

func release_ball(direction: Vector2, power: float, from_player: PlayerAgent = null) -> void:
	var target: Vector2 = pos + direction.normalized() * 0.2
	_start_travel(target, power, from_player, null, LOOSE, 0.0, "release_ball")

func kick_to(target: Vector2, power: float, passer: PlayerAgent = null, receiver: PlayerAgent = null) -> void:
	start_pass(passer, receiver, target, power, 0.0, "kick_to")

func start_path_action(from_player: PlayerAgent, receiver: PlayerAgent, path: Array[Vector2], duration: float, next_state: String, reason: String) -> void:
	if path.is_empty():
		var fallback_target: Vector2 = pos
		if receiver != null:
			fallback_target = receiver.pos
		_start_travel(fallback_target, 0.80, from_player, receiver, next_state, 0.0, reason)
		return
	var clean_path: Array[Vector2] = []
	for point in path:
		clean_path.append(Vector2(clampf(point.x, -0.08, 1.08), clampf(point.y, -0.08, 1.08)))
	if not clean_path.is_empty() and pos.distance_to(clean_path[0]) > 0.035:
		clean_path[0] = pos
	if owner != null:
		owner.has_ball = false
	previous_owner = owner
	owner = null
	current_owner = null
	target_player = receiver
	target_position = clean_path[clean_path.size() - 1]
	pass_error_amount = 0.0
	if from_player != null:
		last_touch_team = from_player.team_id
		last_touch_player = from_player
	path_start_pos = clean_path[0]
	pos = path_start_pos
	travel_path = clean_path
	travel_elapsed = 0.0
	travel_duration = maxf(0.18, duration)
	travel_reason = reason
	loose_timer = 0.0
	_set_state(next_state, "%s | path_points: %d" % [reason, travel_path.size()])

func _start_travel(target: Vector2, power: float, passer: PlayerAgent, receiver: PlayerAgent, next_state: String, error_amount: float, reason: String) -> void:
	if owner != null:
		owner.has_ball = false
	previous_owner = owner
	owner = null
	current_owner = null
	target_player = receiver
	target_position = target
	pass_error_amount = error_amount
	_clear_path()
	if passer != null:
		last_touch_team = passer.team_id
		last_touch_player = passer
	var dir: Vector2 = target_position - pos
	if dir.length() > 0.001:
		vel = dir.normalized() * minf(power, max_speed)
	loose_timer = 0.0
	_set_state(next_state, "%s | from: %s | target: %s" % [reason, passer.name if passer != null else "-", receiver.name if receiver != null else "space"])

func update(delta: float, pitch: PitchManager = null) -> void:
	if owner != null:
		var foot_offset: Vector2 = owner.ball_control_offset
		if foot_offset.length() < 0.004:
			foot_offset = owner.facing_direction * 0.014
		pos = owner.pos + foot_offset
		vel = Vector2.ZERO
		if ball_state != OWNED:
			_set_state(OWNED, "owner_in_update")
		return
	if not travel_path.is_empty():
		_update_path_travel(delta)
		if pitch != null and not pitch.contains(pos):
			set_out_of_play("pitch_bounds")
		return
	pos += vel * delta
	var slow_near_target: bool = ball_state in [PASSING, CROSSING] and pos.distance_to(target_position) < 0.10
	var fr: float = friction * (2.3 if slow_near_target else 1.0)
	vel = vel.move_toward(Vector2.ZERO, delta * fr)
	loose_timer += delta
	if ball_state in [PASSING, CROSSING] and vel.length() < 0.06:
		if target_player != null and can_be_controlled_by(target_player):
			set_owner(target_player, "received")
		else:
			make_loose("missed_%s" % ball_state.to_lower())
	if pitch != null and not pitch.contains(pos):
		set_out_of_play("pitch_bounds")

func _update_path_travel(delta: float) -> void:
	var old_pos: Vector2 = pos
	travel_elapsed += delta
	var t: float = clampf(travel_elapsed / maxf(0.001, travel_duration), 0.0, 1.0)
	pos = _sample_path(t)
	vel = (pos - old_pos) / maxf(0.001, delta)
	loose_timer += delta
	if t >= 1.0:
		vel = Vector2.ZERO
		var finishing_state: String = ball_state
		_clear_path()
		if finishing_state == PASSING or finishing_state == CROSSING:
			if target_player != null and target_player.pos.distance_to(pos) < 0.080:
				set_owner(target_player, "path_received")
			else:
				make_loose("path_missed_%s" % finishing_state.to_lower())
		elif finishing_state == SHOOTING:
			make_loose("shot_finished")

func _sample_path(t: float) -> Vector2:
	var eased_t: float = _travel_ease(t)
	if travel_path.size() == 1:
		return travel_path[0]
	if travel_path.size() == 2:
		return travel_path[0].lerp(travel_path[1], eased_t)
	if travel_path.size() == 3:
		var a0: Vector2 = travel_path[0].lerp(travel_path[1], eased_t)
		var b0: Vector2 = travel_path[1].lerp(travel_path[2], eased_t)
		return a0.lerp(b0, smoothstep(0.0, 1.0, eased_t))
	var scaled: float = eased_t * float(travel_path.size() - 1)
	var index: int = clampi(int(floor(scaled)), 0, travel_path.size() - 2)
	var local_t: float = scaled - float(index)
	var a: Vector2 = travel_path[index]
	var b: Vector2 = travel_path[index + 1]
	return a.lerp(b, smoothstep(0.0, 1.0, local_t))

func _travel_ease(t: float) -> float:
	if ball_state == SHOOTING:
		return 1.0 - pow(1.0 - t, 1.35)
	if ball_state == CROSSING or travel_reason.contains("long") or travel_reason.contains("keeper"):
		return smoothstep(0.0, 1.0, t)
	if travel_reason.contains("one_two") or travel_reason.contains("wall"):
		return 1.0 - pow(1.0 - t, 1.18)
	return smoothstep(0.0, 1.0, t)

func can_be_controlled_by(player: PlayerAgent) -> bool:
	if ball_state == OUT_OF_PLAY:
		return false
	var radius: float = 0.028 if vel.length() < 0.32 else 0.018
	return player.pos.distance_to(pos) < radius and vel.length() < 0.62

func is_loose() -> bool:
	return ball_state == LOOSE

func is_passing() -> bool:
	return ball_state == PASSING

func is_owned() -> bool:
	return ball_state == OWNED and owner != null

func consume_transition_log() -> Array[String]:
	var out: Array[String] = transition_log.duplicate()
	transition_log.clear()
	return out

func _set_state(next_state: String, reason: String) -> void:
	var old_state: String = ball_state
	ball_state = next_state
	state = next_state
	if old_state != next_state:
		transition_log.append("BallState: %s -> %s | reason: %s" % [old_state, next_state, reason])
	_enforce_invariants(reason)

func _clear_path() -> void:
	travel_path.clear()
	travel_elapsed = 0.0
	travel_duration = 0.0
	travel_reason = ""

func _enforce_invariants(reason: String) -> void:
	if ball_state == OWNED:
		if owner == null:
			transition_log.append("Ball invariant repaired: OWNED without owner | %s" % reason)
			make_loose("owned_without_owner")
			return
		target_player = null
		target_position = owner.pos
	elif ball_state == PASSING:
		if owner != null:
			owner.has_ball = false
			owner = null
			current_owner = null
		if target_player == null and target_position == Vector2.ZERO:
			make_loose("passing_without_target")
	elif ball_state == LOOSE:
		if owner != null:
			owner.has_ball = false
			owner = null
			current_owner = null
		target_player = null
	elif ball_state in [SHOOTING, CROSSING, OUT_OF_PLAY]:
		if owner != null:
			owner.has_ball = false
			owner = null
			current_owner = null

func _error_vector(amount: float) -> Vector2:
	if amount <= 0.0:
		return Vector2.ZERO
	var angle: float = randf() * TAU
	var mag: float = randf() * amount
	return Vector2(cos(angle), sin(angle)) * mag
