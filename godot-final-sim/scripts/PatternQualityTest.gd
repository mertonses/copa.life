extends SceneTree

const PossessionSequence = preload("res://scripts/PossessionSequence.gd")

const SEEDS: Array[String] = [
	"build-a",
	"build-b",
	"press-a",
	"press-b",
	"keeper-a"
]

const MAX_RUNTIME_FRAMES: int = 3600

var sim: Node = null
var frames: int = 0
var sampled_build_frames: int = 0
var max_split_defenders: int = 0
var max_short_options: int = 0
var max_pressers: int = 0
var max_lane_covers: int = 0
var sampled_triangle_frames: int = 0
var max_triangle_support: int = 0
var max_third_man_runs: int = 0
var sampled_wide_frames: int = 0
var max_wide_overload: int = 0
var max_box_runs: int = 0
var sampled_recycle_frames: int = 0
var max_safe_support: int = 0
var sampled_direct_frames: int = 0
var max_depth_runs: int = 0
var max_recovery_runs: int = 0

func _initialize() -> void:
	var failures: Array[String] = []
	_test_archive_build_from_back(failures)
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
	_sample_runtime_build_pattern()
	if frames >= MAX_RUNTIME_FRAMES:
		var failures: Array[String] = []
		if sampled_build_frames < 20:
			failures.append("Build-from-back was not sampled enough in runtime: %d" % sampled_build_frames)
		if max_split_defenders < 2:
			failures.append("Build-from-back did not split at least two defenders. max=%d" % max_split_defenders)
		if max_short_options < 1:
			failures.append("Build-from-back did not create a short midfield option.")
		if max_pressers < 2:
			failures.append("High press did not create at least two press/cover responders. max=%d" % max_pressers)
		if max_lane_covers < 1:
			failures.append("High press did not create a visible lane cover.")
		if sampled_triangle_frames > 0 and max_triangle_support < 2:
			failures.append("Center triangle did not create two support players.")
		if sampled_triangle_frames > 0 and max_third_man_runs < 1:
			failures.append("Center triangle did not create a third-man run.")
		if sampled_wide_frames > 0 and max_wide_overload < 1:
			failures.append("Wide overload did not create a wide overload player.")
		if sampled_wide_frames > 0 and max_box_runs < 1:
			failures.append("Wide overload did not create a box run.")
		if sampled_recycle_frames > 0 and max_safe_support < 2:
			failures.append("Pressured recycle did not create enough safe support.")
		if sampled_direct_frames > 0 and max_depth_runs < 1:
			failures.append("Direct/line-break sequence did not create a depth run.")
		if sampled_direct_frames > 0 and max_recovery_runs < 2:
			failures.append("Direct/line-break sequence did not trigger defensive recovery runs.")
		print("PATTERN_RUNTIME build_frames=%d split_defenders=%d short_options=%d pressers=%d lane_covers=%d" % [
			sampled_build_frames,
			max_split_defenders,
			max_short_options,
			max_pressers,
			max_lane_covers
		])
		print("PATTERN_RUNTIME_EXTRA triangle=%d/%d/%d wide=%d/%d/%d recycle=%d/%d direct=%d/%d/%d" % [
			sampled_triangle_frames,
			max_triangle_support,
			max_third_man_runs,
			sampled_wide_frames,
			max_wide_overload,
			max_box_runs,
			sampled_recycle_frames,
			max_safe_support,
			sampled_direct_frames,
			max_depth_runs,
			max_recovery_runs
		])
		if failures.is_empty():
			print("PATTERN_QUALITY_OK")
			quit(0)
		else:
			_report_failures(failures)
	return false

func _test_archive_build_from_back(failures: Array[String]) -> void:
	var generator: MatchEventGenerator = MatchEventGenerator.new()
	var build_events: int = 0
	var high_press_responses: int = 0
	var keeper_short_events: int = 0
	var long_build_sequences: int = 0
	var center_events: int = 0
	var wide_events: int = 0
	var direct_events: int = 0
	var recycle_events: int = 0
	var cutback_events: int = 0
	var sequence_lengths: Dictionary = {}
	for seed in SEEDS:
		var data: Dictionary = generator.generate({"seed": seed, "style": "gegen"})
		var events: Array = data.get("events", [])
		for ev in events:
			if typeof(ev) != TYPE_DICTIONARY:
				continue
			if str(ev.get("sequence_type", "")) != PossessionSequence.BUILD_FROM_BACK_SHORT:
				match str(ev.get("sequence_type", "")):
					PossessionSequence.CENTER_TRIANGLE_BUILDUP:
						center_events += 1
					PossessionSequence.WIDE_OVERLOAD_LEFT, PossessionSequence.WIDE_OVERLOAD_RIGHT:
						wide_events += 1
					PossessionSequence.DIRECT_LONG_BALL, PossessionSequence.OFFSIDE_TRAP_OR_LINE_BREAK:
						direct_events += 1
					PossessionSequence.PRESSURED_RECYCLE:
						recycle_events += 1
					PossessionSequence.CUTBACK_ATTACK:
						cutback_events += 1
				continue
			build_events += 1
			var sid: int = int(ev.get("sequence_id", -1))
			sequence_lengths[sid] = int(sequence_lengths.get(sid, 0)) + 1
			if str(ev.get("defensive_response", "")) == DefensiveScheme.HIGH_PRESS:
				high_press_responses += 1
			if str(ev.get("action", "")) in ["GOAL_KICK_SHORT", "KEEPER_BUILD_UP", "KICK_OFF"]:
				keeper_short_events += 1
	for sid in sequence_lengths.keys():
		if int(sequence_lengths[sid]) >= 3:
			long_build_sequences += 1
	print("PATTERN_ARCHIVE build_events=%d high_press=%d keeper_short=%d long_sequences=%d center=%d wide=%d direct=%d recycle=%d cutback=%d" % [
		build_events,
		high_press_responses,
		keeper_short_events,
		long_build_sequences,
		center_events,
		wide_events,
		direct_events,
		recycle_events,
		cutback_events
	])
	if build_events < 60:
		failures.append("Too few build-from-back events: %d" % build_events)
	if high_press_responses < 30:
		failures.append("Too few high-press responses to build-up: %d" % high_press_responses)
	if keeper_short_events < SEEDS.size():
		failures.append("Too few keeper/kick-off short build events: %d" % keeper_short_events)
	if long_build_sequences < 4:
		failures.append("Too few multi-beat build-up sequences: %d" % long_build_sequences)
	if center_events < 50:
		failures.append("Too few center triangle events: %d" % center_events)
	if wide_events < 35:
		failures.append("Too few wide overload events: %d" % wide_events)
	if direct_events < 15:
		failures.append("Too few direct/line-break events: %d" % direct_events)
	if recycle_events < 12:
		failures.append("Too few pressured recycle events: %d" % recycle_events)

func _sample_runtime_build_pattern() -> void:
	if sim.current_event.is_empty():
		return
	if str(sim.current_event.get("sequence_type", "")) != PossessionSequence.BUILD_FROM_BACK_SHORT:
		_sample_runtime_other_patterns()
		return
	sampled_build_frames += 1
	var attacking = sim.home if int(sim.current_event.get("team", 0)) == 0 else sim.away
	var defending = sim.away if int(sim.current_event.get("team", 0)) == 0 else sim.home
	var split_defenders: int = 0
	var short_options: int = 0
	for p in attacking.players:
		if p.current_state == "BUILD_FROM_BACK":
			split_defenders += 1
		if p.current_state == "SHOW_FOR_SHORT_PASS":
			short_options += 1
	max_split_defenders = maxi(max_split_defenders, split_defenders)
	max_short_options = maxi(max_short_options, short_options)
	var pressers: int = 0
	var lane_covers: int = 0
	for p in defending.players:
		if p.current_state in ["PRESS", "BALL_SIDE_PRESS"]:
			pressers += 1
		if p.current_state in ["COVER_PASSING_LANE", "BLOCK_PASSING_LANE"]:
			lane_covers += 1
	max_pressers = maxi(max_pressers, pressers + lane_covers)
	max_lane_covers = maxi(max_lane_covers, lane_covers)

func _sample_runtime_other_patterns() -> void:
	var sequence_type: String = str(sim.current_event.get("sequence_type", ""))
	var attacking = sim.home if int(sim.current_event.get("team", 0)) == 0 else sim.away
	var defending = sim.away if int(sim.current_event.get("team", 0)) == 0 else sim.home
	if sequence_type == PossessionSequence.CENTER_TRIANGLE_BUILDUP:
		sampled_triangle_frames += 1
		var supports: int = 0
		var thirds: int = 0
		for p in attacking.players:
			if p.current_state in ["TRIANGLE_SUPPORT", "PASSING_ANGLE_LEFT", "PASSING_ANGLE_RIGHT", "SHOW_TO_FEET", "RETURN_OPTION"]:
				supports += 1
			if p.current_state == "THIRD_MAN_RUN":
				thirds += 1
		max_triangle_support = maxi(max_triangle_support, supports)
		max_third_man_runs = maxi(max_third_man_runs, thirds)
	elif sequence_type in [PossessionSequence.WIDE_OVERLOAD_LEFT, PossessionSequence.WIDE_OVERLOAD_RIGHT, PossessionSequence.CUTBACK_ATTACK]:
		sampled_wide_frames += 1
		var wide_count: int = 0
		var box_count: int = 0
		for p in attacking.players:
			if p.current_state in ["WIDE_OVERLOAD", "UNDERLAP_SUPPORT", "HALF_SPACE_SUPPORT", "OVERLAP_RUN", "BYLINE_DRIVE"]:
				wide_count += 1
			if p.current_state in ["BOX_RUN", "CUTBACK_OPTION", "BOX_NEAR_POST", "BOX_FAR_POST", "PENALTY_SPOT_RUN", "CUTBACK_ZONE_ATTACK"]:
				box_count += 1
		max_wide_overload = maxi(max_wide_overload, wide_count)
		max_box_runs = maxi(max_box_runs, box_count)
	elif sequence_type == PossessionSequence.PRESSURED_RECYCLE:
		sampled_recycle_frames += 1
		var safe_count: int = 0
		for p in attacking.players:
			if p.current_state in ["SAFE_SUPPORT", "RESET_OUTLET", "RELIEF_OPTION"]:
				safe_count += 1
		max_safe_support = maxi(max_safe_support, safe_count)
	elif sequence_type in [PossessionSequence.DIRECT_LONG_BALL, PossessionSequence.OFFSIDE_TRAP_OR_LINE_BREAK]:
		sampled_direct_frames += 1
		var depth_count: int = 0
		var recovery_count: int = 0
		for p in attacking.players:
			if p.current_state == "MAKE_RUN":
				depth_count += 1
		for p in defending.players:
			if p.current_state == "RECOVERY_RUN":
				recovery_count += 1
		max_depth_runs = maxi(max_depth_runs, depth_count)
		max_recovery_runs = maxi(max_recovery_runs, recovery_count)

func _report_failures(failures: Array[String]) -> void:
	for failure in failures:
		push_error(failure)
	quit(20)
