class_name MatchAudioDirector
extends Node

const AudioAssetLibraryScript = preload("res://scripts/audio/AudioAssetLibrary.gd")

var crowd: CrowdDirector = CrowdDirector.new()
var field_pool: FieldSoundPool = FieldSoundPool.new()
var voice_pool: VoiceSoundPool = VoiceSoundPool.new()
var audio_log: Array[Dictionary] = []
var enabled: bool = true
var last_event_index: int = -1
var match_speed: float = 1.0
var field_asset_stats: Dictionary = {}
var setup_complete: bool = false
var asset_load_attempted: bool = false

func _ready() -> void:
	ensure_setup()

func ensure_setup() -> void:
	if setup_complete:
		return
	setup_complete = true
	_setup_audio_buses()
	crowd.name = "CrowdDirector"
	field_pool.name = "FieldSoundPool"
	voice_pool.name = "VoiceSoundPool"
	if crowd.get_parent() == null:
		add_child(crowd)
	if field_pool.get_parent() == null:
		add_child(field_pool)
	if voice_pool.get_parent() == null:
		add_child(voice_pool)
	crowd.setup()
	field_pool.setup()
	voice_pool.setup()
	_load_default_audio_assets()

func reset() -> void:
	ensure_setup()
	audio_log.clear()
	crowd.clear_log()
	field_pool.clear_log()
	voice_pool.clear_log()
	last_event_index = -1

func update_context(delta: float, context: Dictionary) -> void:
	ensure_setup()
	_ensure_default_audio_assets()
	match_speed = float(context.get("speed", 1.0))
	crowd.update_crowd(delta, context)
	field_pool.tick(delta)
	voice_pool.tick(delta)

func on_event_prepared(event_index: int, ev: Dictionary, start_pos: Vector2, end_pos: Vector2, actor: PlayerAgent, receiver: PlayerAgent, speed_value: float) -> void:
	ensure_setup()
	_ensure_default_audio_assets()
	if not enabled:
		return
	last_event_index = event_index
	match_speed = speed_value
	var action: String = str(ev.get("action", ""))
	var team_id: int = int(ev.get("team", 0))
	var danger: float = float(ev.get("danger", 0.0))
	_log("EVENT_PREPARED", action, 20, start_pos)
	if action == "SHOOT":
		crowd.trigger_anticipation(maxf(danger, 0.72), team_id)
		voice_pool.play_voice_event("shot_call", start_pos, 75, match_speed)
	elif action in ["CROSS", "THROUGH_BALL", "CUTBACK"]:
		crowd.trigger_anticipation(maxf(danger, 0.48), team_id)
	elif action in ["KICK_OFF", "FREE_KICK_SHORT"]:
		field_pool.play_field_event("whistle", start_pos, 100, match_speed)
	elif action in ["CORNER", "THROW_IN"]:
		field_pool.play_field_event("restart_setup", start_pos, 55, match_speed)

func on_action_started(ev: Dictionary, start_pos: Vector2, target_pos: Vector2, actor: PlayerAgent, receiver: PlayerAgent, speed_value: float) -> void:
	ensure_setup()
	_ensure_default_audio_assets()
	if not enabled:
		return
	match_speed = speed_value
	var action: String = str(ev.get("action", ""))
	var key: String = _field_key_for_action(action)
	var priority: int = _priority_for_action(action)
	if key != "":
		field_pool.play_field_event(key, start_pos, priority, match_speed, _volume_for_action(action))
		_log("FIELD_SOUND", key, priority, start_pos)
	if action in ["LONG_PASS", "THROUGH_BALL", "CROSS", "KEEPER_LONG"]:
		voice_pool.play_voice_event("go_call", start_pos, 45, match_speed)

func on_event_finished(ev: Dictionary, ball_pos: Vector2, speed_value: float) -> void:
	ensure_setup()
	_ensure_default_audio_assets()
	if not enabled:
		return
	match_speed = speed_value
	var action: String = str(ev.get("action", ""))
	var team_id: int = int(ev.get("team", 0))
	var danger: float = float(ev.get("danger", 0.0))
	if bool(ev.get("goal", false)):
		field_pool.play_field_event("net_hit", ball_pos, 100, match_speed, 1.5)
		crowd.trigger_goal(team_id)
		_log("REACTION", "goal", 100, ball_pos)
	elif action == "SHOOT":
		var restart_type: String = str(ev.get("restart_type", "OPEN_PLAY"))
		if restart_type == "CORNER":
			crowd.trigger_save(maxf(danger, 0.55), team_id)
			field_pool.play_field_event("keeper_save", ball_pos, 90, match_speed)
			_log("REACTION", "save", 90, ball_pos)
		else:
			crowd.trigger_miss(maxf(danger, 0.45), team_id)
			_log("REACTION", "miss", 85, ball_pos)
	elif bool(ev.get("turnover", false)):
		var loss_reason: String = str(ev.get("loss_reason", "TURNOVER"))
		if loss_reason in ["TACKLED", "INTERCEPTED_PASS", "BAD_TOUCH"]:
			field_pool.play_field_event("tackle_or_intercept", ball_pos, 70, match_speed)
			_log("FIELD_SOUND", loss_reason.to_lower(), 70, ball_pos)

func audio_stats() -> Dictionary:
	ensure_setup()
	_ensure_default_audio_assets()
	return {
		"crowd_layer": crowd.current_layer,
		"crowd_intensity": crowd.crowd_intensity,
		"audio_events": audio_log.size(),
		"field_events": field_pool.sound_log.size(),
		"voice_events": voice_pool.voice_log.size(),
		"crowd_reactions": crowd.reaction_log.size(),
		"field_asset_keys": int(field_asset_stats.get("keys", 0)),
		"field_asset_streams": int(field_asset_stats.get("streams", 0))
	}

func _load_default_audio_assets() -> void:
	asset_load_attempted = true
	field_pool.register_streams(AudioAssetLibraryScript.default_field_streams())
	field_asset_stats = field_pool.asset_stats()
	_log("ASSETS", "field_streams:%d" % int(field_asset_stats.get("streams", 0)), 0, Vector2.ZERO)

func _ensure_default_audio_assets() -> void:
	field_asset_stats = field_pool.asset_stats()
	if int(field_asset_stats.get("streams", 0)) > 0:
		return
	if asset_load_attempted:
		return
	_load_default_audio_assets()

func _field_key_for_action(action: String) -> String:
	match action:
		"SHORT_PASS", "SIDEWAYS_PASS", "BACK_PASS", "SAFE_RECYCLE", "PRESSURED_BACK_PASS", "ONE_TWO", "WALL_PASS":
			return "short_pass"
		"PASS_TO_WING", "VERTICAL_PASS":
			return "hard_pass"
		"LONG_PASS", "THROUGH_BALL", "SWITCH_PLAY", "GOAL_KICK_LONG", "KEEPER_LONG":
			return "long_ball"
		"CROSS", "CORNER":
			return "cross"
		"SHOOT":
			return "shot"
		"DRIBBLE":
			return "ball_control"
		"GOAL_KICK_SHORT", "KEEPER_BUILD_UP":
			return "keeper_short_pass"
		"THROW_IN":
			return "throw_in"
	return ""

func _priority_for_action(action: String) -> int:
	match action:
		"SHOOT":
			return 90
		"CROSS", "CORNER", "LONG_PASS", "THROUGH_BALL", "GOAL_KICK_LONG", "KEEPER_LONG":
			return 70
		"PASS_TO_WING", "VERTICAL_PASS", "SWITCH_PLAY":
			return 62
		"SHORT_PASS", "SIDEWAYS_PASS", "ONE_TWO", "WALL_PASS", "DRIBBLE", "GOAL_KICK_SHORT", "KEEPER_BUILD_UP":
			return 50
	return 40

func _volume_for_action(action: String) -> float:
	match action:
		"SHOOT":
			return 1.0
		"CROSS", "LONG_PASS", "THROUGH_BALL":
			return -1.0
		"SHORT_PASS", "SIDEWAYS_PASS", "ONE_TWO":
			return -5.5
	return -3.0

func _log(kind: String, key: String, priority: int, position: Vector2) -> void:
	audio_log.append({
		"kind": kind,
		"key": key,
		"priority": priority,
		"position": position,
		"speed": match_speed
	})

func _setup_audio_buses() -> void:
	for bus_name in ["Crowd", "CrowdBed", "CrowdReactions", "Field", "Ball", "Players", "Whistle", "UI", "Music"]:
		_ensure_bus(bus_name)

func _ensure_bus(bus_name: String) -> void:
	if AudioServer.get_bus_index(bus_name) >= 0:
		return
	AudioServer.add_bus(AudioServer.bus_count)
	AudioServer.set_bus_name(AudioServer.bus_count - 1, bus_name)
