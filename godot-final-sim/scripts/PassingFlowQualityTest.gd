extends SceneTree

const PossessionSequence = preload("res://scripts/PossessionSequence.gd")

const SEEDS: Array[String] = [
	"pass-flow-a",
	"pass-flow-b",
	"pass-flow-c",
	"pass-flow-d",
	"pass-flow-e"
]

const MAX_RUNTIME_FRAMES: int = 4600

var sim: Node = null
var frames: int = 0
var sampled_center_frames: int = 0
var sampled_recycle_frames: int = 0
var max_passing_angles: int = 0
var max_third_or_return: int = 0
var max_safe_outlets: int = 0
var max_pressure_shapes: int = 0

func _initialize() -> void:
	var failures: Array[String] = []
	_test_archive_pass_flow(failures)
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
	_sample_runtime_pass_flow()
	if frames >= MAX_RUNTIME_FRAMES:
		var failures: Array[String] = []
		if sampled_center_frames < 80:
			failures.append("Center passing flow was not sampled enough: %d" % sampled_center_frames)
		if max_passing_angles < 2:
			failures.append("Center play did not create at least two visible passing angles. max=%d" % max_passing_angles)
		if max_third_or_return < 1:
			failures.append("Center play did not create a third-man or return option.")
		if sampled_recycle_frames < 20:
			failures.append("Pressure recycle was not sampled enough: %d" % sampled_recycle_frames)
		if max_safe_outlets < 2:
			failures.append("Pressure recycle did not create enough safe outlets. max=%d" % max_safe_outlets)
		if max_pressure_shapes < 2:
			failures.append("Defensive pressure did not create enough press/cover shapes. max=%d" % max_pressure_shapes)
		print("PASS_FLOW_RUNTIME center=%d angles=%d third_or_return=%d recycle=%d outlets=%d pressure_shapes=%d" % [
			sampled_center_frames,
			max_passing_angles,
			max_third_or_return,
			sampled_recycle_frames,
			max_safe_outlets,
			max_pressure_shapes
		])
		if failures.is_empty():
			print("PASS_FLOW_QUALITY_OK")
			quit(0)
		else:
			_report_failures(failures)
	return false

func _test_archive_pass_flow(failures: Array[String]) -> void:
	var generator: MatchEventGenerator = MatchEventGenerator.new()
	var combo_events: int = 0
	var combo_plans: int = 0
	var escape_events: int = 0
	var escape_plans: int = 0
	var pressure_losses: int = 0
	for seed in SEEDS:
		var data: Dictionary = generator.generate({"seed": seed, "style": "gegen"})
		var events: Array = data.get("events", [])
		for ev in events:
			if typeof(ev) != TYPE_DICTIONARY:
				continue
			var action: String = str(ev.get("action", ""))
			var sequence_type: String = str(ev.get("sequence_type", ""))
			var plan: Dictionary = ev.get("pass_flow_plan", {})
			if sequence_type == PossessionSequence.CENTER_TRIANGLE_BUILDUP or action in ["ONE_TWO", "WALL_PASS", "SIDEWAYS_PASS"]:
				combo_events += 1
				if str(plan.get("plan_type", "")) == "CENTER_TRIANGLE" and str(plan.get("timing", "")) == "scan_support_release_reposition":
					combo_plans += 1
			if sequence_type == PossessionSequence.PRESSURED_RECYCLE or action in ["PRESSURED_BACK_PASS", "SAFE_RECYCLE", "BACK_PASS"]:
				escape_events += 1
				if str(plan.get("plan_type", "")) == "PRESSURE_ESCAPE":
					escape_plans += 1
			if str(ev.get("loss_reason", "")) in ["PRESSURE_MISTAKE", "INTERCEPTED_PASS"]:
				pressure_losses += 1
	print("PASS_FLOW_ARCHIVE combo=%d combo_plans=%d escape=%d escape_plans=%d pressure_losses=%d" % [
		combo_events,
		combo_plans,
		escape_events,
		escape_plans,
		pressure_losses
	])
	if combo_events < 120:
		failures.append("Too few center/combo pass events: %d" % combo_events)
	if combo_plans < 90:
		failures.append("Too few center triangle pass-flow plans: %d" % combo_plans)
	if escape_events < 20:
		failures.append("Too few pressure escape events: %d" % escape_events)
	if escape_plans < 20:
		failures.append("Too few pressure escape plans: %d" % escape_plans)
	if pressure_losses < 8:
		failures.append("Too few pressure/interception losses across seeds: %d" % pressure_losses)

func _sample_runtime_pass_flow() -> void:
	if sim.current_event.is_empty():
		return
	var sequence_type: String = str(sim.current_event.get("sequence_type", ""))
	var attacking = sim.home if int(sim.current_event.get("team", 0)) == 0 else sim.away
	var defending = sim.away if int(sim.current_event.get("team", 0)) == 0 else sim.home
	var pressure_shapes: int = 0
	for p in defending.players:
		if p.current_state in ["PRESS", "PRESS_TRAP", "COVER_PASSING_LANE", "BLOCK_PASSING_LANE"]:
			pressure_shapes += 1
	max_pressure_shapes = maxi(max_pressure_shapes, pressure_shapes)
	if sequence_type == PossessionSequence.CENTER_TRIANGLE_BUILDUP:
		sampled_center_frames += 1
		var angles: int = 0
		var third_or_return: int = 0
		for p in attacking.players:
			if p.current_state in ["PASSING_ANGLE_LEFT", "PASSING_ANGLE_RIGHT", "SHOW_TO_FEET"]:
				angles += 1
			if p.current_state in ["THIRD_MAN_RUN", "RETURN_OPTION"]:
				third_or_return += 1
		max_passing_angles = maxi(max_passing_angles, angles)
		max_third_or_return = maxi(max_third_or_return, third_or_return)
	elif sequence_type == PossessionSequence.PRESSURED_RECYCLE:
		sampled_recycle_frames += 1
		var outlets: int = 0
		for p in attacking.players:
			if p.current_state in ["SAFE_SUPPORT", "RESET_OUTLET", "RELIEF_OPTION", "SHOW_TO_FEET"]:
				outlets += 1
		max_safe_outlets = maxi(max_safe_outlets, outlets)

func _report_failures(failures: Array[String]) -> void:
	for failure in failures:
		push_error(failure)
	quit(20)
