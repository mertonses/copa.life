class_name CrowdDirector
extends Node

var crowd_intensity: float = 0.15
var target_intensity: float = 0.15
var current_layer: String = "CROWD_IDLE"
var reaction_log: Array[Dictionary] = []
var clock: float = 0.0

func setup() -> void:
	_ensure_bus("Crowd")
	_ensure_bus("CrowdBed")
	_ensure_bus("CrowdReactions")

func update_crowd(delta: float, context: Dictionary) -> void:
	clock += delta
	target_intensity = maxf(0.15, calculate_danger(context))
	crowd_intensity = move_toward(crowd_intensity, target_intensity, delta * 0.70)
	current_layer = _layer_for_intensity(crowd_intensity)

func calculate_danger(context: Dictionary) -> float:
	var ball_pos: Vector2 = context.get("ball_pos", Vector2(0.5, 0.5))
	var attacking_team: int = int(context.get("attacking_team", -1))
	var action: String = str(context.get("action", ""))
	var minute: float = float(context.get("minute", 0.0))
	var score_close: bool = bool(context.get("score_close", true))
	var box_occupation: float = float(context.get("box_occupation", 0.0))
	var goal_y: float = 0.06 if attacking_team == 0 else 0.94
	var goal_proximity: float = clampf((0.55 - abs(ball_pos.y - goal_y)) / 0.55, 0.0, 1.0)
	var final_third: float = 1.0 if goal_proximity > 0.62 else 0.0
	var shot_threat: float = 1.0 if action in ["SHOOT", "CUTBACK", "CROSS", "THROUGH_BALL"] else 0.0
	var late_match: float = 0.18 if minute >= 75.0 and score_close else 0.0
	var danger: float = 0.0
	danger += goal_proximity * 0.35
	danger += final_third * 0.15
	danger += box_occupation * 0.15
	danger += shot_threat * 0.20
	danger += late_match
	return clampf(danger, 0.0, 1.0)

func trigger_anticipation(danger: float, team_id: int) -> void:
	_log_reaction("CROWD_ANTICIPATION", clampf(danger, 0.35, 1.0), team_id)

func trigger_goal(team_id: int) -> void:
	_log_reaction("CROWD_GOAL", 1.0, team_id)
	crowd_intensity = 1.0

func trigger_miss(danger: float, team_id: int) -> void:
	_log_reaction("CROWD_MISS", clampf(danger, 0.35, 0.92), team_id)

func trigger_save(danger: float, team_id: int) -> void:
	_log_reaction("CROWD_SAVE", clampf(danger, 0.35, 0.88), team_id)

func trigger_disappointed(team_id: int) -> void:
	_log_reaction("CROWD_DISAPPOINTED", 0.58, team_id)

func clear_log() -> void:
	reaction_log.clear()

func _layer_for_intensity(value: float) -> String:
	if value < 0.25:
		return "CROWD_IDLE"
	if value < 0.50:
		return "CROWD_ACTIVE"
	if value < 0.75:
		return "CROWD_ATTACK"
	if value < 0.95:
		return "CROWD_DANGER"
	return "CROWD_PEAK"

func _log_reaction(key: String, intensity: float, team_id: int) -> void:
	reaction_log.append({
		"time": clock,
		"key": key,
		"intensity": intensity,
		"team": team_id
	})

func _ensure_bus(bus_name: String) -> void:
	if AudioServer.get_bus_index(bus_name) >= 0:
		return
	AudioServer.add_bus(AudioServer.bus_count)
	AudioServer.set_bus_name(AudioServer.bus_count - 1, bus_name)
