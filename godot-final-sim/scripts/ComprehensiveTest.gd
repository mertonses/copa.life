extends SceneTree

const PossessionSequence = preload("res://scripts/PossessionSequence.gd")

const SEEDS: Array[String] = [
	"flow-a",
	"flow-b",
	"flow-c",
	"offside-a",
	"restart-a",
	"wide-a",
	"direct-a",
	"gegen-a"
]

func _initialize() -> void:
	var failures: Array[String] = []
	_test_archives(failures)
	_test_shape_and_ball_flow(failures)
	if failures.is_empty():
		print("COMPREHENSIVE_OK")
		quit(0)
	else:
		for failure in failures:
			push_error(failure)
		quit(10)

func _test_archives(failures: Array[String]) -> void:
	var generator: MatchEventGenerator = MatchEventGenerator.new()
	var archive: MatchArchive = MatchArchive.new()
	var aggregate_actions: Dictionary = {}
	var offside_count: int = 0
	var restart_count: int = 0
	var continuity_breaks: int = 0
	var sequence_types: Dictionary = {}
	var beat_types: Dictionary = {}
	var open_play_contracts: int = 0
	for seed in SEEDS:
		var data: Dictionary = generator.generate({"seed": seed, "style": "gegen"})
		var warnings: Array[String] = archive.validate(data)
		if not warnings.is_empty():
			failures.append("%s archive warning: %s" % [seed, warnings[0]])
		var events: Array = data.get("events", [])
		if events.size() < 120:
			failures.append("%s produced too few events: %d" % [seed, events.size()])
		var last_end: Vector2 = Vector2.ZERO
		var has_last: bool = false
		for ev in events:
			if typeof(ev) != TYPE_DICTIONARY:
				continue
			var action: String = str(ev.get("action", ""))
			aggregate_actions[action] = int(aggregate_actions.get(action, 0)) + 1
			var sequence_type: String = str(ev.get("sequence_type", ""))
			var beat_type: String = str(ev.get("beat_type", ""))
			if sequence_type == "":
				failures.append("%s event %d missing sequence_type." % [seed, int(ev.get("id", -1))])
			if beat_type == "":
				failures.append("%s event %d missing beat_type." % [seed, int(ev.get("id", -1))])
			sequence_types[sequence_type] = int(sequence_types.get(sequence_type, 0)) + 1
			beat_types[beat_type] = int(beat_types.get(beat_type, 0)) + 1
			if str(ev.get("ball_continuity", "")) == PossessionSequence.OPEN_PLAY_CONTINUOUS:
				open_play_contracts += 1
			if str(ev.get("loss_reason", "")) == "OFFSIDE":
				offside_count += 1
			if str(ev.get("phase", "")) == "set_piece":
				restart_count += 1
			var start: Vector2 = _dict_to_vec(ev.get("start", {}))
			var end: Vector2 = _dict_to_vec(ev.get("end", {}))
			if has_last and str(ev.get("phase", "")) != "set_piece":
				if start.distance_to(last_end) > 0.42:
					continuity_breaks += 1
			last_end = end
			has_last = true
	if restart_count < SEEDS.size():
		failures.append("Expected restart events across seeds, got %d." % restart_count)
	if offside_count < 1:
		failures.append("Expected at least one offside across seeds.")
	for required in ["ONE_TWO", "SWITCH_PLAY", "CUTBACK", "VERTICAL_PASS", "SIDEWAYS_PASS"]:
		if int(aggregate_actions.get(required, 0)) < 1:
			failures.append("Missing expanded action across seeds: %s" % required)
	if continuity_breaks > 8:
		failures.append("Too many archive continuity breaks: %d" % continuity_breaks)
	for required_sequence in [PossessionSequence.BUILD_FROM_BACK_SHORT, PossessionSequence.CENTER_TRIANGLE_BUILDUP, PossessionSequence.WIDE_OVERLOAD_LEFT, PossessionSequence.WIDE_OVERLOAD_RIGHT, PossessionSequence.OFFSIDE_TRAP_OR_LINE_BREAK]:
		if int(sequence_types.get(required_sequence, 0)) < 1:
			failures.append("Missing sequence type across seeds: %s" % required_sequence)
	for required_beat in [PossessionSequence.MOVE_OFF_BALL, PossessionSequence.RELEASE_PASS, PossessionSequence.REACTION, PossessionSequence.FINAL_ACTION]:
		if int(beat_types.get(required_beat, 0)) < 1:
			failures.append("Missing beat type across seeds: %s" % required_beat)
	if open_play_contracts < 80:
		failures.append("Too few open-play continuity contracts: %d" % open_play_contracts)
	print("ARCHIVE_STATS actions=%s sequences=%s beats=%s offside=%d restarts=%d continuity_breaks=%d" % [str(aggregate_actions), str(sequence_types), str(beat_types), offside_count, restart_count, continuity_breaks])

func _test_shape_and_ball_flow(failures: Array[String]) -> void:
	var home: TeamController = TeamController.new()
	var away: TeamController = TeamController.new()
	var ball: MatchBall = MatchBall.new()
	var director: TacticalDirector = TacticalDirector.new()
	var spacing: TeamSpacingManager = TeamSpacingManager.new()
	var movement: MovementSystem = MovementSystem.new()
	home.setup(0, "Home", "4-4-2", "gegen")
	away.setup(1, "Away", "4-3-3", "balanced")
	home.tactical_director = director
	away.tactical_director = director
	ball.set_owner(home.players[9], "comprehensive")
	var max_ball_step: float = 0.0
	for i in range(80):
		var before: Vector2 = ball.pos
		director.update(home, away, ball, 0.05, "")
		home.update_shape(ball, away, 0.05, "progression")
		away.update_shape(ball, home, 0.05, "defense")
		spacing.apply_spacing_rules(home, ball, director)
		spacing.apply_spacing_rules(away, ball, director)
		movement.update_players(home.players, 0.05)
		movement.update_players(away.players, 0.05)
		ball.update(0.05)
		max_ball_step = maxf(max_ball_step, before.distance_to(ball.pos))
	var home_depth: float = _team_depth(home)
	var away_depth: float = _team_depth(away)
	if home_depth > 0.58:
		failures.append("Home team too stretched: %.3f" % home_depth)
	if away_depth > 0.58:
		failures.append("Away team too stretched: %.3f" % away_depth)
	if home.offside_line_y <= 0.0 or away.offside_line_y <= 0.0:
		failures.append("Invalid offside line values.")
	if max_ball_step > 0.08:
		failures.append("Ball jump too large in owned flow: %.3f" % max_ball_step)
	print("SHAPE_STATS home_depth=%.3f away_depth=%.3f max_ball_step=%.3f lines=%.3f/%.3f" % [home_depth, away_depth, max_ball_step, home.offside_line_y, away.offside_line_y])

func _team_depth(team: TeamController) -> float:
	var min_y: float = 999.0
	var max_y: float = -999.0
	for p in team.players:
		if p.is_goalkeeper():
			continue
		min_y = minf(min_y, p.pos.y)
		max_y = maxf(max_y, p.pos.y)
	return max_y - min_y

func _dict_to_vec(v) -> Vector2:
	if typeof(v) == TYPE_DICTIONARY:
		return Vector2(float(v.get("x", 0.5)), float(v.get("y", 0.5)))
	return Vector2(0.5, 0.5)
