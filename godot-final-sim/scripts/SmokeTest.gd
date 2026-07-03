extends SceneTree

func _initialize() -> void:
	var generator: MatchEventGenerator = MatchEventGenerator.new()
	var archive: MatchArchive = MatchArchive.new()
	var data: Dictionary = generator.generate({"seed": "smoke-test"})
	var warnings: Array[String] = archive.validate(data)
	if not warnings.is_empty():
		push_error("Archive warning: %s" % warnings[0])
		quit(2)
		return
	var events: Array = data.get("events", [])
	if events.size() < 20:
		push_error("Too few generated events: %d" % events.size())
		quit(3)
		return
	var has_kickoff: bool = false
	var has_restart: bool = false
	var has_combination: bool = false
	for ev in events:
		if typeof(ev) != TYPE_DICTIONARY:
			continue
		var action: String = str(ev.get("action", ""))
		if action == "KICK_OFF":
			has_kickoff = true
		if action in ["CORNER", "THROW_IN", "GOAL_KICK_SHORT", "GOAL_KICK_LONG", "KEEPER_BUILD_UP", "KEEPER_LONG", "FREE_KICK_SHORT"]:
			has_restart = true
		if action in ["ONE_TWO", "WALL_PASS", "SIDEWAYS_PASS", "SWITCH_PLAY", "CUTBACK", "VERTICAL_PASS"]:
			has_combination = true
	if not has_kickoff:
		push_error("No kick-off event generated.")
		quit(4)
		return
	if not has_combination:
		push_error("No expanded passing event generated.")
		quit(5)
		return
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
	ball.set_owner(home.players[9], "smoke")
	for i in range(12):
		director.update(home, away, ball, 0.1, "")
		home.update_shape(ball, away, 0.1, "progression")
		away.update_shape(ball, home, 0.1, "defense")
		spacing.apply_spacing_rules(home, ball, director)
		spacing.apply_spacing_rules(away, ball, director)
		movement.update_players(home.players, 0.1)
		movement.update_players(away.players, 0.1)
		ball.update(0.1)
	print("SMOKE_OK events=%d restart=%s combo=%s" % [events.size(), str(has_restart), str(has_combination)])
	quit(0)
