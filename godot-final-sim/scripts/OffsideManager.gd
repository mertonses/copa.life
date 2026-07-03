class_name OffsideManager
extends RefCounted

static func line_for(defending_team: TeamController) -> float:
	var ys: Array[float] = []
	for p in defending_team.players:
		ys.append(p.pos.y)
	if ys.size() < 2:
		return 0.28 if defending_team.side == 1 else 0.72
	ys.sort()
	if defending_team.side == 1:
		return ys[1]
	return ys[ys.size() - 2]

static func is_offside_position(attacker: PlayerAgent, ball_pos: Vector2, defending_team: TeamController) -> bool:
	if attacker.is_goalkeeper() or not attacker.is_forward():
		return false
	var line: float = line_for(defending_team)
	if attacker.team_id == 0:
		return attacker.pos.y < line and attacker.pos.y < ball_pos.y
	return attacker.pos.y > line and attacker.pos.y > ball_pos.y

static func clamp_attacking_target(target: Vector2, attacker: PlayerAgent, ball_pos: Vector2, defending_team: TeamController, margin: float = 0.022) -> Vector2:
	if attacker.is_goalkeeper() or not (attacker.is_forward() or attacker.sequence_role == SequenceRole.DEPTH_RUNNER):
		return target
	var line: float = line_for(defending_team)
	if attacker.team_id == 0:
		var legal_y: float = minf(ball_pos.y - 0.012, line + margin)
		target.y = maxf(target.y, legal_y)
	else:
		var legal_y: float = maxf(ball_pos.y + 0.012, line - margin)
		target.y = minf(target.y, legal_y)
	return target
