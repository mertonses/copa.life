extends SceneTree

const PossessionSequence = preload("res://scripts/PossessionSequence.gd")

const SEEDS: Array[String] = [
	"line-a",
	"line-b",
	"line-c",
	"line-d",
	"line-e"
]

const MAX_RUNTIME_FRAMES: int = 4600

var sim: Node = null
var frames: int = 0
var sampled_line_frames: int = 0
var max_timed_runs: int = 0
var max_offside_holders: int = 0
var max_recovery_runs: int = 0
var saw_before_release: bool = false
var saw_after_release: bool = false

func _initialize() -> void:
	var failures: Array[String] = []
	_test_archive_line_breaks(failures)
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
	_sample_runtime_line_break()
	if frames >= MAX_RUNTIME_FRAMES:
		var failures: Array[String] = []
		if sampled_line_frames < 30:
			failures.append("Line-break/direct sequences were not sampled enough: %d" % sampled_line_frames)
		if max_timed_runs < 1:
			failures.append("No attacker timed a run before a line-break pass.")
		if max_offside_holders < 2:
			failures.append("Defensive line did not visibly hold before release. max=%d" % max_offside_holders)
		if max_recovery_runs < 2:
			failures.append("Defensive line did not recover after release. max=%d" % max_recovery_runs)
		if not saw_before_release:
			failures.append("No pre-release line-break frame was observed.")
		if not saw_after_release:
			failures.append("No post-release line-break frame was observed.")
		print("LINE_BREAK_RUNTIME frames=%d timed_runs=%d line_holders=%d recovery=%d before=%s after=%s" % [
			sampled_line_frames,
			max_timed_runs,
			max_offside_holders,
			max_recovery_runs,
			str(saw_before_release),
			str(saw_after_release)
		])
		if failures.is_empty():
			print("LINE_BREAK_QUALITY_OK")
			quit(0)
		else:
			_report_failures(failures)
	return false

func _test_archive_line_breaks(failures: Array[String]) -> void:
	var generator: MatchEventGenerator = MatchEventGenerator.new()
	var line_events: int = 0
	var timed_plans: int = 0
	var offside_events: int = 0
	var offside_restarts: int = 0
	var varied_releases: Dictionary = {}
	for seed in SEEDS:
		var data: Dictionary = generator.generate({"seed": seed, "style": "gegen"})
		var events: Array = data.get("events", [])
		for i in range(events.size()):
			var ev = events[i]
			if typeof(ev) != TYPE_DICTIONARY:
				continue
			var sequence_type: String = str(ev.get("sequence_type", ""))
			var action: String = str(ev.get("action", ""))
			if sequence_type in [PossessionSequence.DIRECT_LONG_BALL, PossessionSequence.OFFSIDE_TRAP_OR_LINE_BREAK]:
				line_events += 1
				varied_releases[action] = true
				var plan: Dictionary = ev.get("line_break_plan", {})
				if bool(plan.get("runner_pre_run", false)) and str(plan.get("timing", "")) == "run_then_pass":
					timed_plans += 1
				if str(ev.get("loss_reason", "")) == "OFFSIDE":
					offside_events += 1
					if _has_offside_restart(events, i):
						offside_restarts += 1
	print("LINE_BREAK_ARCHIVE line_events=%d timed=%d offside=%d restarts=%d release_types=%d" % [
		line_events,
		timed_plans,
		offside_events,
		offside_restarts,
		varied_releases.size()
	])
	if line_events < 28:
		failures.append("Too few direct/line-break events: %d" % line_events)
	if timed_plans < 20:
		failures.append("Too few run-then-pass line-break plans: %d" % timed_plans)
	if varied_releases.size() < 3:
		failures.append("Line-break releases are not varied enough: %d" % varied_releases.size())
	if offside_events < 3:
		failures.append("Too few offside outcomes across seeds: %d" % offside_events)
	if offside_restarts < offside_events:
		failures.append("Not every offside is followed by a short free-kick restart: %d/%d" % [offside_restarts, offside_events])

func _has_offside_restart(events: Array, index: int) -> bool:
	for j in range(index + 1, mini(index + 4, events.size())):
		var next_ev = events[j]
		if typeof(next_ev) == TYPE_DICTIONARY and str(next_ev.get("action", "")) == "FREE_KICK_SHORT":
			return true
	return false

func _sample_runtime_line_break() -> void:
	if sim.current_event.is_empty():
		return
	var sequence_type: String = str(sim.current_event.get("sequence_type", ""))
	if not (sequence_type in [PossessionSequence.DIRECT_LONG_BALL, PossessionSequence.OFFSIDE_TRAP_OR_LINE_BREAK]):
		return
	sampled_line_frames += 1
	var attacking = sim.home if int(sim.current_event.get("team", 0)) == 0 else sim.away
	var defending = sim.away if int(sim.current_event.get("team", 0)) == 0 else sim.home
	var timed_runs: int = 0
	var holders: int = 0
	var recoveries: int = 0
	for p in attacking.players:
		if p.current_state == "TIME_LINE_RUN":
			timed_runs += 1
	for p in defending.players:
		if p.current_state in ["OFFSIDE_LINE_HOLD", "OFFSIDE_TRAP"]:
			holders += 1
		if p.current_state == "RECOVERY_RUN":
			recoveries += 1
	max_timed_runs = maxi(max_timed_runs, timed_runs)
	max_offside_holders = maxi(max_offside_holders, holders)
	max_recovery_runs = maxi(max_recovery_runs, recoveries)
	if timed_runs > 0 and holders >= 2:
		saw_before_release = true
	if recoveries >= 2:
		saw_after_release = true

func _report_failures(failures: Array[String]) -> void:
	for failure in failures:
		push_error(failure)
	quit(20)
