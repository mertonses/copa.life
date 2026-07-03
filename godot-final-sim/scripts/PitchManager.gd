class_name PitchManager
extends RefCounted

var left: float = 0.0
var right: float = 1.0
var top: float = 0.0
var bottom: float = 1.0
var goal_left_x: float = 0.39
var goal_right_x: float = 0.61

func contains(point: Vector2) -> bool:
	return point.x >= left and point.x <= right and point.y >= top and point.y <= bottom

func is_goal(point: Vector2) -> int:
	if point.x < goal_left_x or point.x > goal_right_x:
		return -1
	if point.y < top:
		return 0
	if point.y > bottom:
		return 1
	return -1

func restart_point(last_touch_team: int) -> Vector2:
	if last_touch_team == 0:
		return Vector2(0.50, 0.78)
	return Vector2(0.50, 0.22)

func clamp_player(point: Vector2) -> Vector2:
	return Vector2(clampf(point.x, 0.035, 0.965), clampf(point.y, 0.055, 0.945))

func to_screen(pitch_rect: Rect2, point: Vector2) -> Vector2:
	return pitch_rect.position + Vector2(point.x * pitch_rect.size.x, point.y * pitch_rect.size.y)
