class_name GoalkeeperAI
extends RefCounted

var danger_score: float = 0.0
var keeper_state: String = "KEEPER_SAFE"

func update_keeper(keeper: PlayerAgent, ball: MatchBall, team_has_ball: bool) -> void:
	var home: bool = keeper.team_id == 0
	var goal_y: float = 0.91 if home else 0.09
	var box_y: float = 0.78 if home else 0.22
	var goal_center_x: float = 0.50
	var x: float = lerpf(goal_center_x, ball.pos.x, 0.25)
	var y: float = goal_y
	danger_score = _danger_score(keeper, ball, team_has_ball)
	keeper_state = _keeper_state(ball, team_has_ball)
	match keeper_state:
		"KEEPER_SAFE":
			x = lerpf(goal_center_x, ball.pos.x, 0.08)
			y = goal_y
		"KEEPER_ANGLE_COVER":
			x = lerpf(goal_center_x, ball.pos.x, 0.36)
			y = lerpf(goal_y, box_y, clampf(danger_score, 0.0, 0.72))
		"KEEPER_DIVE":
			x = lerpf(keeper.pos.x, clampf(ball.pos.x, 0.34, 0.66), 0.88)
			y = lerpf(keeper.pos.y, goal_y, 0.72)
		"KEEPER_CLAIM_CROSS":
			x = lerpf(keeper.pos.x, clampf(ball.pos.x, 0.34, 0.66), 0.72)
			y = lerpf(goal_y, box_y, 0.96)
		"KEEPER_EMERGENCY":
			x = lerpf(goal_center_x, ball.pos.x, 0.58)
			y = lerpf(goal_y, box_y, 0.92)
			if ball.ball_state == "CROSSING":
				y = lerpf(y, ball.pos.y, 0.20)
	keeper.defensive_task = PlayerAgent.DefensiveTask.NONE
	keeper.sequence_role = SequenceRole.GOALKEEPER
	keeper.current_state = keeper_state
	keeper.target = _clamp_to_box(Vector2(x, y), home)

func _keeper_state(ball: MatchBall, team_has_ball: bool) -> String:
	if team_has_ball or danger_score < 0.25:
		return "KEEPER_SAFE"
	if ball.ball_state == "SHOOTING":
		return "KEEPER_DIVE"
	if ball.ball_state == "CROSSING":
		return "KEEPER_CLAIM_CROSS"
	if danger_score > 0.68:
		return "KEEPER_EMERGENCY"
	return "KEEPER_ANGLE_COVER"

func _danger_score(keeper: PlayerAgent, ball: MatchBall, team_has_ball: bool) -> float:
	if team_has_ball:
		return 0.0
	var goal_y: float = 0.91 if keeper.team_id == 0 else 0.09
	var dist_goal: float = abs(ball.pos.y - goal_y)
	var proximity: float = clampf((0.36 - dist_goal) / 0.36, 0.0, 1.0)
	var speed_threat: float = clampf(ball.vel.length() / 1.0, 0.0, 1.0)
	var state_bonus: float = 0.0
	if ball.ball_state == "SHOOTING":
		state_bonus = 0.45
	elif ball.ball_state == "CROSSING":
		state_bonus = 0.25
	elif ball.ball_state == "PASSING":
		state_bonus = 0.10
	return clampf(proximity * 0.65 + speed_threat * 0.20 + state_bonus, 0.0, 1.0)

func _clamp_to_box(target: Vector2, home: bool) -> Vector2:
	var min_y: float = 0.78 if home else 0.07
	var max_y: float = 0.93 if home else 0.22
	return Vector2(clampf(target.x, 0.34, 0.66), clampf(target.y, min_y, max_y))
