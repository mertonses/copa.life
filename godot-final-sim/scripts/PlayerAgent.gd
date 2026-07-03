class_name PlayerAgent
extends RefCounted

enum DefensiveTask {
	NONE,
	PRESS_BALL,
	COVER_PASSING_LANE,
	HOLD_BLOCK,
	MARK_RUNNER,
	PROTECT_BOX
}

var id: int = 0
var team_id: int = 0
var name: String = ""
var role: String = "CM"
var base_pos: Vector2 = Vector2.ZERO
var pos: Vector2 = Vector2.ZERO
var vel: Vector2 = Vector2.ZERO
var target: Vector2 = Vector2.ZERO
var has_ball: bool = false
var current_state: String = "IDLE"
var intent_label: String = ""
var defensive_task: DefensiveTask = DefensiveTask.NONE
var is_receive_target: bool = false
var is_primary_presser: bool = false
var is_secondary_cover: bool = false
var is_loose_contender: bool = false
var sequence_role: String = "NONE"
var sequence_target_offset: Vector2 = Vector2.ZERO
var sequence_active: bool = false
var assigned_slot: String = ""
var previous_slot: String = ""
var role_commit_until: float = 0.0
var slot_target_position: Vector2 = Vector2.ZERO
var last_target_position: Vector2 = Vector2.ZERO
var target_change_distance_sum: float = 0.0
var target_change_count: int = 0
var slot_change_count: int = 0
var role_commit_started_at: float = 0.0
var is_injured: bool = false
var possession_beat: String = "IDLE"
var possession_beat_timer: float = 0.0
var facing_direction: Vector2 = Vector2(0.0, -1.0)
var dribble_direction: Vector2 = Vector2(0.0, -1.0)
var preferred_foot_side: float = 1.0
var ball_control_offset: Vector2 = Vector2.ZERO

var speed: float = 0.22
var acceleration: float = 7.0
var stamina: float = 1.0
var passing: float = 60.0
var shooting: float = 55.0
var dribbling: float = 55.0
var vision: float = 55.0
var decision: float = 55.0
var technique: float = 55.0
var defending: float = 55.0
var aggression: float = 52.0
var positioning: float = 55.0
var goalkeeping: float = 45.0
var teamwork: float = 55.0
var work_rate: float = 55.0

func setup(player_id: int, side: int, player_role: String, initial: Vector2) -> void:
	id = player_id
	team_id = side
	role = player_role
	base_pos = initial
	pos = initial
	target = initial
	slot_target_position = initial
	last_target_position = initial
	facing_direction = Vector2(0.0, -1.0 if side == 0 else 1.0)
	dribble_direction = facing_direction
	preferred_foot_side = -1.0 if id % 2 == 0 else 1.0
	name = "%s %02d" % [role, id + 1]
	var role_bonus: float = 0.0
	if role in ["LW", "RW", "ST"]:
		role_bonus = 8.0
	passing = 55.0 + role_bonus + float((id * 7) % 19)
	shooting = 48.0 + role_bonus + float((id * 11) % 22)
	dribbling = 50.0 + role_bonus + float((id * 19) % 18)
	vision = 52.0 + float((id * 5) % 24)
	decision = 52.0 + float((id * 9) % 23)
	technique = 54.0 + float((id * 13) % 21)
	defending = 46.0 + float((id * 3) % 27)
	aggression = 48.0 + float((id * 15) % 24)
	positioning = 50.0 + float((id * 4) % 25)
	goalkeeping = 70.0 if role == "GK" else 35.0
	teamwork = 52.0 + float((id * 6) % 24)
	work_rate = 56.0 + float((id * 17) % 18)
	speed = 0.18 + float((id * 5) % 9) * 0.006
	if role == "GK":
		speed *= 0.82

func is_goalkeeper() -> bool:
	return role == "GK"

func is_defender() -> bool:
	return role in ["CB", "LB", "RB", "LWB", "RWB", "WB"]

func is_midfielder() -> bool:
	return role in ["DM", "CM", "AM", "LM", "RM"]

func is_forward() -> bool:
	return role in ["LW", "RW", "ST"]

func distance_to_ball(ball_pos: Vector2) -> float:
	return pos.distance_to(ball_pos)

func clear_frame_flags() -> void:
	defensive_task = DefensiveTask.NONE
	is_receive_target = false
	is_primary_presser = false
	is_secondary_cover = false
	is_loose_contender = false
	if not has_ball:
		current_state = "MOVE_TO_SHAPE"

func can_switch_role(now: float, emergency: bool = false) -> bool:
	return emergency or sequence_role == "NONE" or now >= role_commit_until

func assign_sequence_role(role_name: String, now: float, commit_duration: float, emergency: bool = false) -> bool:
	if sequence_role != role_name and not can_switch_role(now, emergency):
		return false
	if sequence_role != role_name:
		role_commit_started_at = now
		slot_change_count += 1
	sequence_role = role_name
	sequence_active = SequenceRole.is_active(role_name)
	role_commit_until = maxf(role_commit_until, now + commit_duration)
	return true

func assign_slot(slot_name: String, slot_target: Vector2, now: float, commit_duration: float = 0.85, emergency: bool = false) -> bool:
	if assigned_slot != "" and assigned_slot != slot_name and not can_switch_role(now, emergency):
		return false
	if assigned_slot != slot_name:
		previous_slot = assigned_slot
		assigned_slot = slot_name
		slot_change_count += 1
		role_commit_started_at = now
	role_commit_until = maxf(role_commit_until, now + commit_duration)
	slot_target_position = _clamp_pitch(slot_target)
	return true

func apply_tactical_target(candidate: Vector2, dead_zone: float = 0.014, force: bool = false) -> void:
	var clean: Vector2 = _clamp_pitch(candidate)
	if not force and target.distance_to(clean) < dead_zone:
		return
	target_change_distance_sum += target.distance_to(clean)
	target_change_count += 1
	last_target_position = target
	target = clean

func update_facing(delta: float) -> void:
	var desired: Vector2 = Vector2.ZERO
	if vel.length() > 0.006:
		desired = vel.normalized()
	elif target.distance_to(pos) > 0.014:
		desired = (target - pos).normalized()
	elif has_ball and dribble_direction.length() > 0.001:
		desired = dribble_direction.normalized()
	if desired.length() > 0.001:
		var turn_rate: float = 12.0
		if is_defender():
			turn_rate = 8.0
		elif is_goalkeeper():
			turn_rate = 7.0
		facing_direction = facing_direction.lerp(desired, clampf(delta * turn_rate, 0.0, 1.0)).normalized()
		dribble_direction = facing_direction
	var lateral: Vector2 = facing_direction.orthogonal() * preferred_foot_side
	ball_control_offset = facing_direction * 0.014 + lateral * 0.006

func average_target_change_distance() -> float:
	if target_change_count <= 0:
		return 0.0
	return target_change_distance_sum / float(target_change_count)

func _clamp_pitch(point: Vector2) -> Vector2:
	return Vector2(clampf(point.x, 0.045, 0.955), clampf(point.y, 0.055, 0.945))

func start_possession_beat(beat: String = "RECEIVE") -> void:
	possession_beat = beat
	possession_beat_timer = 0.0

func update_possession_beat(delta: float, pressure: float) -> void:
	if not has_ball:
		possession_beat = "IDLE"
		possession_beat_timer = 0.0
		return
	possession_beat_timer += delta
	var pressure_speed: float = clampf(1.0 - pressure * 0.45, 0.55, 1.0)
	var decision_speed: float = clampf((decision + technique + vision) / 190.0, 0.72, 1.16)
	match possession_beat:
		"RECEIVE":
			if possession_beat_timer >= 0.16 * pressure_speed / decision_speed:
				possession_beat = "SETTLE"
				possession_beat_timer = 0.0
		"SETTLE":
			if possession_beat_timer >= 0.26 * pressure_speed / decision_speed:
				possession_beat = "SCAN"
				possession_beat_timer = 0.0
		"SCAN":
			if possession_beat_timer >= 0.34 * pressure_speed / decision_speed:
				possession_beat = "CARRY"
				possession_beat_timer = 0.0
		"CARRY":
			if possession_beat_timer >= 0.80 * pressure_speed / decision_speed:
				possession_beat = "RELEASE"
