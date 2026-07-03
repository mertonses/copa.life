extends SceneTree

const MAX_RUNTIME_FRAMES: int = 4200

var sim: Node = null
var frames: int = 0
var sampled_frames: int = 0
var max_focus_step: float = 0.0
var max_focus_error: float = 0.0
var min_focus_radius: float = 999.0
var max_focus_radius: float = 0.0
var tempo_labels: Dictionary = {}
var spotlight_frames: int = 0

func _initialize() -> void:
	var failures: Array[String] = []
	_test_archive_viewing_plans(failures)
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
	_sample_runtime_viewing()
	if frames >= MAX_RUNTIME_FRAMES:
		var failures: Array[String] = []
		if sampled_frames < 500:
			failures.append("Viewing focus was not sampled enough: %d" % sampled_frames)
		if tempo_labels.size() < 4:
			failures.append("Viewing tempo labels are not varied enough: %d" % tempo_labels.size())
		if spotlight_frames < 40:
			failures.append("Spotlight focus was not observed enough: %d" % spotlight_frames)
		if max_focus_error > 0.42:
			failures.append("View focus drifts too far from target: %.3f" % max_focus_error)
		if max_focus_step > 0.070:
			failures.append("View focus jumps too much per frame: %.3f" % max_focus_step)
		if min_focus_radius >= max_focus_radius:
			failures.append("Focus radius did not adapt.")
		print("VIEWING_RUNTIME frames=%d labels=%d spotlight=%d max_step=%.4f max_error=%.4f radius=%.3f..%.3f" % [
			sampled_frames,
			tempo_labels.size(),
			spotlight_frames,
			max_focus_step,
			max_focus_error,
			min_focus_radius,
			max_focus_radius
		])
		if failures.is_empty():
			print("VIEWING_TEMPO_QUALITY_OK")
			quit(0)
		else:
			_report_failures(failures)
	return false

func _test_archive_viewing_plans(failures: Array[String]) -> void:
	var generator: MatchEventGenerator = MatchEventGenerator.new()
	var seeds: Array[String] = ["view-a", "view-b", "view-c", "view-d", "view-e"]
	var total: int = 0
	var plans: int = 0
	var labels: Dictionary = {}
	var spotlight: int = 0
	var scaled: int = 0
	for seed in seeds:
		var data: Dictionary = generator.generate({"seed": seed, "style": "gegen"})
		for ev in data.get("events", []):
			if typeof(ev) != TYPE_DICTIONARY:
				continue
			total += 1
			var plan: Dictionary = ev.get("viewing_plan", {})
			if plan.is_empty():
				continue
			plans += 1
			labels[str(plan.get("tempo", ""))] = true
			if bool(plan.get("spotlight", false)):
				spotlight += 1
			if absf(float(plan.get("duration_multiplier", 1.0)) - 1.0) > 0.01:
				scaled += 1
	print("VIEWING_ARCHIVE total=%d plans=%d labels=%d spotlight=%d scaled=%d" % [
		total,
		plans,
		labels.size(),
		spotlight,
		scaled
	])
	if plans < total:
		failures.append("Not every event has viewing plan: %d/%d" % [plans, total])
	if labels.size() < 5:
		failures.append("Too few viewing tempo types: %d" % labels.size())
	if spotlight < 40:
		failures.append("Too few spotlight events: %d" % spotlight)
	if scaled < 50:
		failures.append("Too few duration-scaled events: %d" % scaled)

func _sample_runtime_viewing() -> void:
	if sim.current_event.is_empty():
		return
	sampled_frames += 1
	tempo_labels[sim.view_tempo_label] = true
	var plan: Dictionary = sim.current_event.get("viewing_plan", {})
	if bool(plan.get("spotlight", false)):
		spotlight_frames += 1
	max_focus_step = maxf(max_focus_step, sim.view_focus_step)
	max_focus_error = maxf(max_focus_error, sim.view_focus_pos.distance_to(sim.view_focus_target))
	min_focus_radius = minf(min_focus_radius, sim.view_focus_radius)
	max_focus_radius = maxf(max_focus_radius, sim.view_focus_radius)

func _report_failures(failures: Array[String]) -> void:
	for failure in failures:
		push_error(failure)
	quit(20)
