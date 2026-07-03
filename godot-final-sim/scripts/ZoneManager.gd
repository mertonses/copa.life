class_name ZoneManager
extends RefCounted

const LEFT_WIDE: String = "LEFT_WIDE"
const LEFT_HALFSPACE: String = "LEFT_HALFSPACE"
const CENTER: String = "CENTER"
const RIGHT_HALFSPACE: String = "RIGHT_HALFSPACE"
const RIGHT_WIDE: String = "RIGHT_WIDE"

const OWN_THIRD: String = "OWN_THIRD"
const MIDDLE_THIRD: String = "MIDDLE_THIRD"
const FINAL_THIRD: String = "FINAL_THIRD"
const PENALTY_AREA: String = "PENALTY_AREA"
const DANGER_ZONE: String = "DANGER_ZONE"

func get_channel(position: Vector2) -> String:
	if position.x < 0.18:
		return LEFT_WIDE
	if position.x < 0.38:
		return LEFT_HALFSPACE
	if position.x < 0.62:
		return CENTER
	if position.x < 0.82:
		return RIGHT_HALFSPACE
	return RIGHT_WIDE

func get_third(position: Vector2, team_side: int) -> String:
	var attack_y: float = position.y if team_side == 1 else 1.0 - position.y
	if attack_y > 0.82 and position.x > 0.30 and position.x < 0.70:
		return DANGER_ZONE
	if attack_y > 0.72 and position.x > 0.18 and position.x < 0.82:
		return PENALTY_AREA
	if attack_y > 0.66:
		return FINAL_THIRD
	if attack_y > 0.33:
		return MIDDLE_THIRD
	return OWN_THIRD

func get_zone(position: Vector2, team_side: int) -> Dictionary:
	return {
		"channel": get_channel(position),
		"third": get_third(position, team_side)
	}

func get_attack_side(ball_position: Vector2) -> String:
	if ball_position.x < 0.40:
		return "LEFT"
	if ball_position.x > 0.60:
		return "RIGHT"
	return "CENTER"

func get_support_zone_for_role(role: String, sequence_type: String, team_side: int) -> Vector2:
	var dir: float = -1.0 if team_side == 0 else 1.0
	match sequence_type:
		"ATTACK_LEFT", "CROSS_SEQUENCE":
			match role:
				SequenceRole.WIDTH_HOLDER:
					return Vector2(0.08, 0.42 if team_side == 0 else 0.58)
				SequenceRole.PRIMARY_SUPPORT:
					return Vector2(0.22, 0.50 if team_side == 0 else 0.50)
				SequenceRole.DEPTH_RUNNER:
					return Vector2(0.42, 0.23 if team_side == 0 else 0.77)
		"ATTACK_RIGHT":
			match role:
				SequenceRole.WIDTH_HOLDER:
					return Vector2(0.92, 0.42 if team_side == 0 else 0.58)
				SequenceRole.PRIMARY_SUPPORT:
					return Vector2(0.78, 0.50 if team_side == 0 else 0.50)
				SequenceRole.DEPTH_RUNNER:
					return Vector2(0.58, 0.23 if team_side == 0 else 0.77)
		"DIRECT_LONG_BALL":
			if role == SequenceRole.DEPTH_RUNNER:
				return Vector2(0.50, 0.20 if team_side == 0 else 0.80)
			if role == SequenceRole.SECONDARY_SUPPORT:
				return Vector2(0.50, 0.44 if team_side == 0 else 0.56)
		"RECYCLE_POSSESSION":
			if role == SequenceRole.PRIMARY_SUPPORT:
				return Vector2(0.50, 0.62 if team_side == 0 else 0.38)
			if role == SequenceRole.REST_DEFENSE:
				return Vector2(0.50, 0.76 if team_side == 0 else 0.24)
		"CUTBACK_SEQUENCE":
			if role == SequenceRole.PRIMARY_SUPPORT or role == SequenceRole.SECONDARY_SUPPORT:
				return Vector2(0.50, 0.30 if team_side == 0 else 0.70)
			if role == SequenceRole.DEPTH_RUNNER:
				return Vector2(0.50, 0.20 if team_side == 0 else 0.80)
		"FINAL_THIRD_COMBINATION":
			if role == SequenceRole.PRIMARY_SUPPORT:
				return Vector2(0.42, 0.30 if team_side == 0 else 0.70)
			if role == SequenceRole.SECONDARY_SUPPORT:
				return Vector2(0.58, 0.31 if team_side == 0 else 0.69)
			if role == SequenceRole.DEPTH_RUNNER:
				return Vector2(0.50, 0.18 if team_side == 0 else 0.82)
	var base_y: float = 0.50 + dir * 0.04
	return Vector2(0.50, base_y)

func get_defensive_zone_for_role(role: String, ball_position: Vector2, team_side: int) -> Vector2:
	var own_goal_y: float = 0.90 if team_side == 0 else 0.10
	var ball_side_x: float = clampf(ball_position.x, 0.18, 0.82)
	match role:
		SequenceRole.PRIMARY_PRESSER:
			return ball_position
		SequenceRole.SECONDARY_COVER, SequenceRole.COVER_SHADOW:
			return Vector2(lerpf(ball_side_x, 0.50, 0.35), lerpf(ball_position.y, own_goal_y, 0.22))
		SequenceRole.BALL_SIDE_MIDFIELD_COVER:
			return Vector2(lerpf(ball_side_x, 0.50, 0.20), lerpf(ball_position.y, own_goal_y, 0.36))
		SequenceRole.WEAK_SIDE_COMPACTNESS:
			return Vector2(0.68 if ball_position.x < 0.5 else 0.32, lerpf(ball_position.y, own_goal_y, 0.42))
		SequenceRole.BOX_PROTECTOR, SequenceRole.LINE_HOLDER:
			return Vector2(lerpf(ball_side_x, 0.50, 0.48), 0.72 if team_side == 0 else 0.28)
	return Vector2(0.50, lerpf(ball_position.y, own_goal_y, 0.40))

func get_penalty_area_targets(attack_direction: float) -> Array[Vector2]:
	var y: float = 0.18 if attack_direction < 0.0 else 0.82
	return [
		Vector2(0.42, y),
		Vector2(0.50, y + (-0.04 if attack_direction < 0.0 else 0.04)),
		Vector2(0.62, y),
		Vector2(0.50, y + (0.08 if attack_direction < 0.0 else -0.08))
	]
