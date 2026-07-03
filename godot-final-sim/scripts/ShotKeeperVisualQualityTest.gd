extends SceneTree

const MAX_RUNTIME_FRAMES: int = 5200

var sim: Node = null
var frames: int = 0
var sampled_shot_frames: int = 0
var sampled_cross_frames: int = 0
var max_keeper_dive: int = 0
var max_keeper_claim: int = 0
var max_shot_blocks: int = 0
var max_rebound_runs: int = 0
var max_nonzero_facing: int = 0

func _initialize() -> void:
	var failures: Array[String] = []
	_test_archive_shot_keeper_plans(failures)
	if not failures.is_empty():
		_report_failures(failures)
		return
	var packed: PackedScene = load("res://scenes/FinalSim.tscn")
	sim = packed.instantiate()
	root.add_child(sim)
	sim.speed = 6.0

func _process(_delta: float) -> bool:
	if sim == null:
		return false
	frames += 1
	_sample_runtime_box_play()
	if frames >= MAX_RUNTIME_FRAMES:
		var failures: Array[String] = []
		if sampled_shot_frames < 8:
			failures.append("Shot frames were not sampled enough: %d" % sampled_shot_frames)
		if max_keeper_dive < 1:
			failures.append("Keeper dive state was not observed.")
		if max_shot_blocks < 1:
			failures.append("Shot block state was not observed.")
		if max_rebound_runs < 1:
			failures.append("Rebound run state was not observed.")
		if sampled_cross_frames > 0 and max_keeper_claim < 1:
			failures.append("Keeper cross-claim state was not observed despite cross frames.")
		if max_nonzero_facing < 18:
			failures.append("Player facing markers are not available for enough players: %d" % max_nonzero_facing)
		print("SHOT_KEEPER_RUNTIME shot_frames=%d cross_frames=%d keeper_dive=%d keeper_claim=%d shot_blocks=%d rebound=%d facing=%d" % [
			sampled_shot_frames,
			sampled_cross_frames,
			max_keeper_dive,
			max_keeper_claim,
			max_shot_blocks,
			max_rebound_runs,
			max_nonzero_facing
		])
		if failures.is_empty():
			print("SHOT_KEEPER_VISUAL_OK")
			quit(0)
		else:
			_report_failures(failures)
	return false

func _test_archive_shot_keeper_plans(failures: Array[String]) -> void:
	var generator: MatchEventGenerator = MatchEventGenerator.new()
	var seeds: Array[String] = ["shot-a", "shot-b", "shot-c", "shot-d", "shot-e"]
	var shots: int = 0
	var crosses: int = 0
	var plans: int = 0
	var dive_plans: int = 0
	var claim_plans: int = 0
	var shot_restarts: int = 0
	for seed in seeds:
		var data: Dictionary = generator.generate({"seed": seed, "style": "gegen"})
		for ev in data.get("events", []):
			if typeof(ev) != TYPE_DICTIONARY:
				continue
			var action: String = str(ev.get("action", ""))
			var plan: Dictionary = ev.get("shot_keeper_plan", {})
			if action == "SHOOT":
				shots += 1
				if str(ev.get("restart_type", "OPEN_PLAY")) in ["GOAL_KICK", "CORNER", "KICK_OFF"]:
					shot_restarts += 1
			if action in ["CROSS", "CORNER"]:
				crosses += 1
			if not plan.is_empty():
				plans += 1
				if str(plan.get("keeper_state", "")) == "KEEPER_DIVE":
					dive_plans += 1
				if str(plan.get("keeper_state", "")) == "KEEPER_CLAIM_CROSS":
					claim_plans += 1
	print("SHOT_KEEPER_ARCHIVE shots=%d crosses=%d plans=%d dives=%d claims=%d shot_restarts=%d" % [
		shots,
		crosses,
		plans,
		dive_plans,
		claim_plans,
		shot_restarts
	])
	if shots < 8:
		failures.append("Too few shot events: %d" % shots)
	if crosses < 12:
		failures.append("Too few cross/corner events: %d" % crosses)
	if dive_plans < shots:
		failures.append("Not every shot has keeper-dive visual plan: %d/%d" % [dive_plans, shots])
	if claim_plans < 8:
		failures.append("Too few keeper cross-claim visual plans: %d" % claim_plans)
	if shot_restarts < maxi(1, shots - 3):
		failures.append("Too few shot restart outcomes: %d/%d" % [shot_restarts, shots])

func _sample_runtime_box_play() -> void:
	if sim.current_event.is_empty():
		return
	var action: String = str(sim.current_event.get("action", ""))
	var attacking = sim.home if int(sim.current_event.get("team", 0)) == 0 else sim.away
	var defending = sim.away if int(sim.current_event.get("team", 0)) == 0 else sim.home
	var keeper_dive: int = 0
	var keeper_claim: int = 0
	var shot_blocks: int = 0
	var rebound_runs: int = 0
	for p in defending.players:
		if p.current_state == "KEEPER_DIVE":
			keeper_dive += 1
		if p.current_state == "KEEPER_CLAIM_CROSS":
			keeper_claim += 1
		if p.current_state == "SHOT_BLOCK":
			shot_blocks += 1
	for p in attacking.players:
		if p.current_state == "REBOUND_RUN":
			rebound_runs += 1
	if action == "SHOOT" or sim.ball.ball_state == MatchBall.SHOOTING:
		sampled_shot_frames += 1
	if action in ["CROSS", "CORNER"] or sim.ball.ball_state == MatchBall.CROSSING:
		sampled_cross_frames += 1
	max_keeper_dive = maxi(max_keeper_dive, keeper_dive)
	max_keeper_claim = maxi(max_keeper_claim, keeper_claim)
	max_shot_blocks = maxi(max_shot_blocks, shot_blocks)
	max_rebound_runs = maxi(max_rebound_runs, rebound_runs)
	var facing_count: int = 0
	for p in sim._all_players():
		if sim._player_facing_dir(p).length() > 0.5:
			facing_count += 1
	max_nonzero_facing = maxi(max_nonzero_facing, facing_count)

func _report_failures(failures: Array[String]) -> void:
	for failure in failures:
		push_error(failure)
	quit(20)
