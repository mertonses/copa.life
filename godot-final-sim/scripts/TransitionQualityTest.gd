extends SceneTree

const MAX_RUNTIME_FRAMES: int = 5600

var sim: Node = null
var frames: int = 0
var sampled_turnover_frames: int = 0
var max_counter_press: int = 0
var max_second_ball: int = 0
var max_secure: int = 0
var max_rest_defense: int = 0
var max_reset_shape: int = 0

func _initialize() -> void:
	var failures: Array[String] = []
	_test_archive_transitions(failures)
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
	_sample_runtime_transition()
	if frames >= MAX_RUNTIME_FRAMES:
		var failures: Array[String] = []
		if sampled_turnover_frames < 80:
			failures.append("Turnover frames were not sampled enough: %d" % sampled_turnover_frames)
		if max_counter_press < 2:
			failures.append("Counter-press reaction did not create enough immediate pressure. max=%d" % max_counter_press)
		if max_second_ball < 1:
			failures.append("Second-ball/interception winner was not observed.")
		if max_secure < 1:
			failures.append("Winning team secure/break outlet was not observed.")
		if max_rest_defense < 1:
			failures.append("Losing team rest-defense drop was not observed.")
		if max_reset_shape < 1:
			failures.append("Out-of-play/restart reset shape was not observed.")
		print("TRANSITION_RUNTIME frames=%d counter_press=%d second_ball=%d secure=%d rest_defense=%d reset=%d" % [
			sampled_turnover_frames,
			max_counter_press,
			max_second_ball,
			max_secure,
			max_rest_defense,
			max_reset_shape
		])
		if failures.is_empty():
			print("TRANSITION_QUALITY_OK")
			quit(0)
		else:
			_report_failures(failures)
	return false

func _test_archive_transitions(failures: Array[String]) -> void:
	var generator: MatchEventGenerator = MatchEventGenerator.new()
	var seeds: Array[String] = ["transition-a", "transition-b", "transition-c", "transition-d", "transition-e"]
	var turnovers: int = 0
	var plans: int = 0
	var open_play_plans: int = 0
	var resets: int = 0
	var interceptions: int = 0
	var second_balls: int = 0
	for seed in seeds:
		var data: Dictionary = generator.generate({"seed": seed, "style": "gegen"})
		for ev in data.get("events", []):
			if typeof(ev) != TYPE_DICTIONARY:
				continue
			if not bool(ev.get("turnover", false)):
				continue
			turnovers += 1
			var plan: Dictionary = ev.get("transition_plan", {})
			if plan.is_empty():
				continue
			plans += 1
			var transition_type: String = str(plan.get("transition_type", ""))
			if transition_type in ["OPEN_PLAY_COUNTER_PRESS", "INTERCEPTION_BREAK", "LOOSE_SECOND_BALL", "KEEPER_CLAIM_RESET"]:
				open_play_plans += 1
			if transition_type in ["OUT_OF_PLAY_RESET", "OFFSIDE_RESET"]:
				resets += 1
			if transition_type == "INTERCEPTION_BREAK":
				interceptions += 1
			if transition_type == "LOOSE_SECOND_BALL":
				second_balls += 1
	print("TRANSITION_ARCHIVE turnovers=%d plans=%d open=%d resets=%d interceptions=%d second_balls=%d" % [
		turnovers,
		plans,
		open_play_plans,
		resets,
		interceptions,
		second_balls
	])
	if turnovers < 30:
		failures.append("Too few turnover events: %d" % turnovers)
	if plans < turnovers:
		failures.append("Not every turnover has a transition plan: %d/%d" % [plans, turnovers])
	if open_play_plans < 12:
		failures.append("Too few open-play transition plans: %d" % open_play_plans)
	if resets < 5:
		failures.append("Too few reset transition plans: %d" % resets)
	if interceptions < 8:
		failures.append("Too few interception transitions: %d" % interceptions)
	if second_balls < 5:
		failures.append("Too few second-ball transitions: %d" % second_balls)

func _sample_runtime_transition() -> void:
	if sim.current_event.is_empty():
		return
	var is_turnover: bool = bool(sim.current_event.get("turnover", false))
	var plan: Dictionary = sim.current_event.get("transition_plan", {})
	if not is_turnover and plan.is_empty():
		return
	sampled_turnover_frames += 1
	var counter_press: int = 0
	var second_ball: int = 0
	var secure: int = 0
	var rest: int = 0
	var reset: int = 0
	for p in sim._all_players():
		if p.current_state in ["COUNTER_PRESS_REACT", "COUNTER_PRESS_COVER"]:
			counter_press += 1
		if p.current_state in ["SECOND_BALL_WINNER", "INTERCEPT_PASS", "CHASE_LOOSE_BALL"]:
			second_ball += 1
		if p.current_state in ["SECURE_POSSESSION", "BREAK_OUTLET"]:
			secure += 1
		if p.current_state == "REST_DEFENSE_DROP":
			rest += 1
		if p.current_state in ["STOP_OUT_OF_PLAY", "RESET_SHAPE", "RESTART_SHAPE"]:
			reset += 1
	max_counter_press = maxi(max_counter_press, counter_press)
	max_second_ball = maxi(max_second_ball, second_ball)
	max_secure = maxi(max_secure, secure)
	max_rest_defense = maxi(max_rest_defense, rest)
	max_reset_shape = maxi(max_reset_shape, reset)

func _report_failures(failures: Array[String]) -> void:
	for failure in failures:
		push_error(failure)
	quit(20)
