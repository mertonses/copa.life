extends SceneTree

const MatchAudioDirectorScript = preload("res://scripts/audio/MatchAudioDirector.gd")

const MAX_FRAMES: int = 1200

var sim: Node = null
var frames: int = 0
var unit_checked: bool = false

func _initialize() -> void:
	var failures: Array[String] = []
	_run_unit_audio_checks(failures)
	if not failures.is_empty():
		_report_failures(failures)
		return
	unit_checked = true
	var packed: PackedScene = load("res://scenes/FinalSim.tscn")
	sim = packed.instantiate()
	root.add_child(sim)
	sim.speed = 6.0

func _process(_delta: float) -> bool:
	if sim == null:
		return false
	frames += 1
	if frames >= MAX_FRAMES:
		_finish_integration()
	return false

func _run_unit_audio_checks(failures: Array[String]) -> void:
	var director: MatchAudioDirector = MatchAudioDirectorScript.new()
	root.add_child(director)
	await process_frame
	for bus_name in ["Crowd", "CrowdBed", "CrowdReactions", "Field", "Ball", "Players", "Whistle", "UI", "Music"]:
		if AudioServer.get_bus_index(bus_name) < 0:
			failures.append("Missing audio bus: %s" % bus_name)
	var asset_stats: Dictionary = director.field_pool.asset_stats()
	if int(asset_stats.get("keys", 0)) < 10:
		failures.append("Too few mapped field audio keys: %s" % str(asset_stats))
	if int(asset_stats.get("streams", 0)) < 30:
		failures.append("Too few mapped field audio streams: %s" % str(asset_stats))
	var shot_event: Dictionary = {
		"action": "SHOOT",
		"team": 0,
		"danger": 0.88,
		"goal": true
	}
	director.update_context(0.30, {
		"ball_pos": Vector2(0.50, 0.18),
		"attacking_team": 0,
		"action": "SHOOT",
		"minute": 83.0,
		"score_close": true,
		"box_occupation": 0.80,
		"speed": 1.0
	})
	director.on_event_prepared(1, shot_event, Vector2(0.50, 0.20), Vector2(0.50, 0.06), null, null, 1.0)
	director.on_action_started(shot_event, Vector2(0.50, 0.20), Vector2(0.50, 0.06), null, null, 1.0)
	director.on_event_finished(shot_event, Vector2(0.50, 0.06), 1.0)
	if director.crowd.crowd_intensity <= 0.15:
		failures.append("Crowd intensity did not rise for dangerous shot.")
	if director.crowd.reaction_log.size() < 2:
		failures.append("Crowd reactions were not logged for shot/goal.")
	if director.field_pool.sound_log.size() < 2:
		failures.append("Field sounds were not logged for shot/goal.")
	var before_fast_short_pass: int = director.field_pool.sound_log.size()
	director.field_pool.play_field_event("short_pass", Vector2(0.5, 0.5), 50, 8.0)
	if director.field_pool.sound_log.size() != before_fast_short_pass:
		failures.append("Low-priority short pass was not filtered at 8x speed.")
	director.queue_free()

func _finish_integration() -> void:
	var failures: Array[String] = []
	if not unit_checked:
		failures.append("Unit audio checks did not run.")
	if sim.audio_director == null:
		failures.append("FinalSim did not create MatchAudioDirector.")
	else:
		var stats: Dictionary = sim.audio_director.audio_stats()
		print("AUDIO_DIRECTOR_STATS %s" % str(stats))
		if int(stats.get("audio_events", 0)) < 8:
			failures.append("Audio director did not receive enough replay events.")
		if int(stats.get("field_events", 0)) < 1:
			failures.append("Field sound pool did not receive any event.")
		if int(stats.get("field_asset_streams", 0)) < 30:
			failures.append("Field audio streams were not loaded in FinalSim: %s" % str(stats))
		var intensity: float = float(stats.get("crowd_intensity", -1.0))
		if intensity < 0.0 or intensity > 1.0:
			failures.append("Crowd intensity is out of range: %.3f" % intensity)
	if failures.is_empty():
		print("AUDIO_DIRECTOR_OK")
		quit(0)
	else:
		_report_failures(failures)

func _report_failures(failures: Array[String]) -> void:
	for failure in failures:
		push_error(failure)
	quit(20)
