extends SceneTree

const MAX_FRAMES: int = 2600
const WARMUP_FRAMES: int = 300

var sim: Node = null
var frames: int = 0
var sampled_frames: int = 0
var orbit_warning_frames: int = 0
var duplicate_slot_frames: int = 0
var bead_warning_frames: int = 0
var owner_offset_samples: int = 0
var owner_offset_failures: int = 0
var defense_stagger_samples: int = 0
var defense_stagger_failures: int = 0
var max_slot_changes: int = 0
var max_avg_target_change: float = 0.0
var duplicate_examples: Array[String] = []

func _initialize() -> void:
	var packed: PackedScene = load("res://scenes/FinalSim.tscn")
	sim = packed.instantiate()
	root.add_child(sim)
	sim.speed = 6.0

func _process(_delta: float) -> bool:
	if sim == null:
		return false
	frames += 1
	if frames == WARMUP_FRAMES:
		_reset_runtime_metrics()
	if frames > WARMUP_FRAMES:
		_sample_slot_quality()
	if frames >= MAX_FRAMES:
		_finish()
	return false

func _sample_slot_quality() -> void:
	if sim.current_event.is_empty():
		return
	sampled_frames += 1
	_sample_team(sim.home)
	_sample_team(sim.away)
	_sample_ball_owner_offset()
	_sample_defensive_stagger(sim.home)
	_sample_defensive_stagger(sim.away)

func _sample_team(team: TeamController) -> void:
	var assigned: Dictionary = {}
	var active_distances: Array[float] = []
	var y_channels: Dictionary = {}
	for p in team.players:
		max_slot_changes = maxi(max_slot_changes, p.slot_change_count)
		if p.target_change_count > 20:
			max_avg_target_change = maxf(max_avg_target_change, p.average_target_change_distance())
		if p.is_goalkeeper():
			continue
		if p.assigned_slot != "":
			if assigned.has(p.assigned_slot):
				duplicate_slot_frames += 1
				if duplicate_examples.size() < 8:
					duplicate_examples.append("%s slot=%s role=%s other=%s frame=%d" % [
						team.team_name,
						p.assigned_slot,
						p.sequence_role,
						assigned[p.assigned_slot],
						frames
					])
			assigned[p.assigned_slot] = p.name
		if p.sequence_active and p.pos.distance_to(sim.ball.pos) < 0.38:
			active_distances.append(p.pos.distance_to(sim.ball.pos))
		var y_key: int = int(round(p.target.y * 20.0))
		y_channels[y_key] = int(y_channels.get(y_key, 0)) + 1
	for key in y_channels.keys():
		if int(y_channels[key]) >= 6:
			bead_warning_frames += 1
			break
	if _has_orbit_cluster(active_distances):
		orbit_warning_frames += 1

func _has_orbit_cluster(distances: Array[float]) -> bool:
	if distances.size() < 5:
		return false
	var buckets: Dictionary = {}
	for d in distances:
		var key: int = int(round(d / 0.018))
		buckets[key] = int(buckets.get(key, 0)) + 1
	for key in buckets.keys():
		if int(buckets[key]) >= 5:
			return true
	return false

func _sample_ball_owner_offset() -> void:
	if sim.ball.owner == null:
		return
	owner_offset_samples += 1
	var d: float = sim.ball.pos.distance_to(sim.ball.owner.pos)
	if d < 0.004 or d > 0.040:
		owner_offset_failures += 1

func _sample_defensive_stagger(team: TeamController) -> void:
	if team.team_phase != "DEFEND":
		return
	var ys: Array[float] = []
	for p in team.players:
		if p.is_defender() and not p.is_goalkeeper():
			ys.append(p.target.y)
	if ys.size() < 3:
		return
	defense_stagger_samples += 1
	var min_y: float = ys[0]
	var max_y: float = ys[0]
	for y in ys:
		min_y = minf(min_y, y)
		max_y = maxf(max_y, y)
	if max_y - min_y < 0.010:
		defense_stagger_failures += 1

func _finish() -> void:
	var failures: Array[String] = []
	var orbit_ratio: float = float(orbit_warning_frames) / maxf(1.0, float(sampled_frames))
	var bead_ratio: float = float(bead_warning_frames) / maxf(1.0, float(sampled_frames))
	var offset_ratio: float = float(owner_offset_failures) / maxf(1.0, float(owner_offset_samples))
	var stagger_ratio: float = float(defense_stagger_failures) / maxf(1.0, float(defense_stagger_samples))
	print("SLOT_POSITIONING_STATS frames=%d sampled=%d orbit=%d duplicate_slots=%d beads=%d max_slot_changes=%d avg_target_change=%.4f owner_offset_fail=%d/%d stagger_fail=%d/%d examples=%s" % [
		frames,
		sampled_frames,
		orbit_warning_frames,
		duplicate_slot_frames,
		bead_warning_frames,
		max_slot_changes,
		max_avg_target_change,
		owner_offset_failures,
		owner_offset_samples,
		defense_stagger_failures,
		defense_stagger_samples,
		str(duplicate_examples)
	])
	if sampled_frames < 500:
		failures.append("Slot positioning did not sample enough match frames.")
	if orbit_ratio > 0.12:
		failures.append("ORBIT_WARNING too frequent: %.3f" % orbit_ratio)
	if duplicate_slot_frames > 0:
		failures.append("Duplicate reserved slots appeared in %d frames." % duplicate_slot_frames)
	if bead_ratio > 0.18:
		failures.append("BEADS_ON_STRING_WARNING too frequent: %.3f" % bead_ratio)
	if offset_ratio > 0.04:
		failures.append("Ball owner offset failed too often: %.3f" % offset_ratio)
	if stagger_ratio > 0.30:
		failures.append("Defensive stagger missing too often: %.3f" % stagger_ratio)
	if max_slot_changes > 420:
		failures.append("ROLE_CHURN_WARNING max slot changes too high: %d" % max_slot_changes)
	if max_avg_target_change > 0.50:
		failures.append("TARGET_JITTER_WARNING average target jump too high: %.3f" % max_avg_target_change)
	if failures.is_empty():
		print("SLOT_POSITIONING_QUALITY_OK")
		quit(0)
	else:
		for failure in failures:
			push_error(failure)
		quit(20)

func _reset_runtime_metrics() -> void:
	for team in [sim.home, sim.away]:
		for p in team.players:
			p.slot_change_count = 0
			p.target_change_count = 0
			p.target_change_distance_sum = 0.0
