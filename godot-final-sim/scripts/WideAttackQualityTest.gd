extends SceneTree

const PossessionSequence = preload("res://scripts/PossessionSequence.gd")

const SEEDS: Array[String] = [
	"wide-a",
	"wide-b",
	"wide-c",
	"wide-d",
	"wide-e"
]

const MAX_RUNTIME_FRAMES: int = 5000

var sim: Node = null
var frames: int = 0
var sampled_wide_frames: int = 0
var sampled_cutback_frames: int = 0
var max_overlap: int = 0
var max_byline: int = 0
var max_halfspace: int = 0
var max_box_runs: int = 0
var max_cutback_options: int = 0
var max_wide_defense: int = 0

func _initialize() -> void:
	var failures: Array[String] = []
	_test_archive_wide_attacks(failures)
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
	_sample_runtime_wide_attack()
	if frames >= MAX_RUNTIME_FRAMES:
		var failures: Array[String] = []
		if sampled_wide_frames < 120:
			failures.append("Wide attacks were not sampled enough: %d" % sampled_wide_frames)
		if max_overlap < 1:
			failures.append("Wide attack did not create a fullback overlap.")
		if max_byline < 1:
			failures.append("Wide attack did not create a byline drive.")
		if max_halfspace < 1:
			failures.append("Wide attack did not create half-space/underlap support.")
		if max_box_runs < 2:
			failures.append("Wide attack did not create enough box runs. max=%d" % max_box_runs)
		if sampled_cutback_frames > 0 and max_cutback_options < 1:
			failures.append("Cutback attack did not create a cutback zone option.")
		if max_wide_defense < 2:
			failures.append("Wide defense did not create press/cutback/box coverage. max=%d" % max_wide_defense)
		print("WIDE_RUNTIME frames=%d overlap=%d byline=%d halfspace=%d box=%d cutback_frames=%d cutback_options=%d wide_defense=%d" % [
			sampled_wide_frames,
			max_overlap,
			max_byline,
			max_halfspace,
			max_box_runs,
			sampled_cutback_frames,
			max_cutback_options,
			max_wide_defense
		])
		if failures.is_empty():
			print("WIDE_ATTACK_QUALITY_OK")
			quit(0)
		else:
			_report_failures(failures)
	return false

func _test_archive_wide_attacks(failures: Array[String]) -> void:
	var generator: MatchEventGenerator = MatchEventGenerator.new()
	var wide_events: int = 0
	var wide_plans: int = 0
	var cross_choices: int = 0
	var cutback_choices: int = 0
	var left_lane: int = 0
	var right_lane: int = 0
	for seed in SEEDS:
		var data: Dictionary = generator.generate({"seed": seed, "style": "gegen"})
		var events: Array = data.get("events", [])
		for ev in events:
			if typeof(ev) != TYPE_DICTIONARY:
				continue
			var sequence_type: String = str(ev.get("sequence_type", ""))
			if not (sequence_type in [PossessionSequence.WIDE_OVERLOAD_LEFT, PossessionSequence.WIDE_OVERLOAD_RIGHT, PossessionSequence.CUTBACK_ATTACK]):
				continue
			wide_events += 1
			var plan: Dictionary = ev.get("wide_attack_plan", {})
			if str(plan.get("timing", "")) == "wide_receive_overlap_decide_deliver":
				wide_plans += 1
			var choice: String = str(plan.get("final_choice", ""))
			if choice == "CROSS":
				cross_choices += 1
			elif choice == "CUTBACK":
				cutback_choices += 1
			var lane: String = str(plan.get("lane", ""))
			if lane == "left":
				left_lane += 1
			elif lane == "right":
				right_lane += 1
	print("WIDE_ARCHIVE events=%d plans=%d cross=%d cutback=%d left=%d right=%d" % [
		wide_events,
		wide_plans,
		cross_choices,
		cutback_choices,
		left_lane,
		right_lane
	])
	if wide_events < 70:
		failures.append("Too few wide/cutback events: %d" % wide_events)
	if wide_plans < 60:
		failures.append("Too few wide attack plans: %d" % wide_plans)
	if cross_choices < 15:
		failures.append("Too few cross choices: %d" % cross_choices)
	if cutback_choices < 10:
		failures.append("Too few cutback choices: %d" % cutback_choices)
	if left_lane < 15 or right_lane < 15:
		failures.append("Wide attacks are not balanced enough. left=%d right=%d" % [left_lane, right_lane])

func _sample_runtime_wide_attack() -> void:
	if sim.current_event.is_empty():
		return
	var sequence_type: String = str(sim.current_event.get("sequence_type", ""))
	if not (sequence_type in [PossessionSequence.WIDE_OVERLOAD_LEFT, PossessionSequence.WIDE_OVERLOAD_RIGHT, PossessionSequence.CUTBACK_ATTACK]):
		return
	sampled_wide_frames += 1
	if sequence_type == PossessionSequence.CUTBACK_ATTACK:
		sampled_cutback_frames += 1
	var attacking = sim.home if int(sim.current_event.get("team", 0)) == 0 else sim.away
	var defending = sim.away if int(sim.current_event.get("team", 0)) == 0 else sim.home
	var overlap: int = 0
	var byline: int = 0
	var halfspace: int = 0
	var box: int = 0
	var cutback: int = 0
	for p in attacking.players:
		if p.current_state == "OVERLAP_RUN":
			overlap += 1
		if p.current_state in ["BYLINE_DRIVE", "WIDE_OVERLOAD"]:
			byline += 1
		if p.current_state in ["HALF_SPACE_SUPPORT", "UNDERLAP_SUPPORT"]:
			halfspace += 1
		if p.current_state in ["BOX_NEAR_POST", "BOX_FAR_POST", "PENALTY_SPOT_RUN"]:
			box += 1
		if p.current_state in ["CUTBACK_ZONE_ATTACK", "CUTBACK_OPTION"]:
			cutback += 1
	var defense: int = 0
	for p in defending.players:
		if p.current_state in ["WIDE_PRESS", "COVER_CUTBACK", "BOX_MARKING"]:
			defense += 1
	max_overlap = maxi(max_overlap, overlap)
	max_byline = maxi(max_byline, byline)
	max_halfspace = maxi(max_halfspace, halfspace)
	max_box_runs = maxi(max_box_runs, box)
	max_cutback_options = maxi(max_cutback_options, cutback)
	max_wide_defense = maxi(max_wide_defense, defense)

func _report_failures(failures: Array[String]) -> void:
	for failure in failures:
		push_error(failure)
	quit(20)
