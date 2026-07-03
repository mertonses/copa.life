class_name MovementSystem
extends RefCounted

var separation_radius: float = 0.048
var separation_weight: float = 0.10
var arrive_radius: float = 0.08

func update_players(players: Array[PlayerAgent], delta: float, pitch: PitchManager = null) -> void:
	for p in players:
		var desired_velocity: Vector2 = _arrive(p, p.target)
		var steering: Vector2 = desired_velocity - p.vel
		steering += _separation(p, players) * separation_weight
		p.vel += steering * p.acceleration * delta
		p.vel = p.vel.limit_length(p.speed * _state_speed_multiplier(p))
		p.pos += p.vel * delta
		if pitch != null:
			p.pos = pitch.clamp_player(p.pos)
		else:
			p.pos.x = clampf(p.pos.x, 0.04, 0.96)
			p.pos.y = clampf(p.pos.y, 0.06, 0.94)
		p.update_facing(delta)

func _arrive(player: PlayerAgent, target: Vector2) -> Vector2:
	var to_target: Vector2 = target - player.pos
	var dist: float = to_target.length()
	if dist < 0.002:
		return Vector2.ZERO
	var desired_speed: float = player.speed * (0.62 if player.is_injured else 1.0)
	if dist < arrive_radius:
		desired_speed *= dist / arrive_radius
	return to_target.normalized() * desired_speed

func _state_speed_multiplier(player: PlayerAgent) -> float:
	match player.current_state:
		"RECEIVE_PASS", "ANTICIPATE_PASS":
			return 1.60
		"SHOW_TO_FEET":
			return 1.34
		"CHASE_LOOSE_BALL", "SECOND_BALL_WINNER":
			return 1.70
		"KEEPER_DIVE":
			return 1.62
		"KEEPER_CLAIM_CROSS":
			return 1.48
		"PRESS", "PRESS_BALL_CARRIER", "PRESS_TRAP", "WIDE_PRESS", "COUNTER_PRESS_REACT":
			return 1.45
		"INTERCEPT_PASS":
			return 1.44
		"MAKE_RUN", "CONTEST_LONG_BALL", "ATTACK_CORNER", "REBOUND_RUN":
			return 1.42
		"TIME_LINE_RUN":
			return 1.30
		"THIRD_MAN_RUN", "BOX_RUN", "BOX_NEAR_POST", "BOX_FAR_POST", "PENALTY_SPOT_RUN":
			return 1.36
		"TRIANGLE_SUPPORT", "PASSING_ANGLE_LEFT", "PASSING_ANGLE_RIGHT", "RETURN_OPTION", "CUTBACK_OPTION", "CUTBACK_ZONE_ATTACK", "OFFER_THROW", "OVERLAP_RUN", "BYLINE_DRIVE":
			return 1.28
		"RELIEF_OPTION", "UNDERLAP_SUPPORT", "HALF_SPACE_SUPPORT", "WIDE_OVERLOAD", "RESET_OUTLET", "SUPPORT_WIDE_RELEASE", "SECURE_POSSESSION", "BREAK_OUTLET":
			return 1.20
		"COUNTER_PRESS_COVER", "REST_DEFENSE_DROP":
			return 1.18
		"COVER_CUTBACK", "BOX_MARKING", "SHOT_BLOCK":
			return 1.14
		"UNDER_PRESSURE_SCAN", "ESCAPE_AFTER_PASS":
			return 1.16
		"STOP_OUT_OF_PLAY", "RESET_SHAPE", "RESTART_SHAPE":
			return 1.08
		"OFFSIDE_LINE_HOLD", "OFFSIDE_TRAP":
			return 1.12
	return 1.0

func _separation(player: PlayerAgent, players: Array[PlayerAgent]) -> Vector2:
	var force: Vector2 = Vector2.ZERO
	for other in players:
		if other == player:
			continue
		var d: float = player.pos.distance_to(other.pos)
		if d > 0.001 and d < separation_radius:
			var team_weight: float = 1.0 if other.team_id == player.team_id else 0.65
			force += (player.pos - other.pos).normalized() * ((separation_radius - d) / separation_radius) * team_weight
	return force
