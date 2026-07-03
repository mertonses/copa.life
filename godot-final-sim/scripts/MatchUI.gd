class_name MatchUI
extends RefCounted

func score_text(home_name: String, away_name: String, score_home: int, score_away: int, minute: float) -> String:
	return "%s  %d - %d  %s   %02d'" % [home_name, score_home, score_away, away_name, int(minute)]

func info_text(ball: MatchBall, match_state: String, home: TeamController, away: TeamController, home_phase: String, away_phase: String) -> String:
	var owner_text: String = "Loose ball"
	if ball.owner != null:
		owner_text = "%s has possession" % ball.owner.name
	return "%s\nMatch: %s\nBall: %s %.2f, %.2f\nHome: %s / %s / %s\nAway: %s / %s / %s" % [
		owner_text, match_state, ball.ball_state, ball.pos.x, ball.pos.y,
		home.team_phase, home_phase, home.current_attack_pattern,
		away.team_phase, away_phase, away.current_attack_pattern
	]
