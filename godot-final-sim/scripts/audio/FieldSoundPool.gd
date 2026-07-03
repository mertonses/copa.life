class_name FieldSoundPool
extends Node

const MAX_ACTIVE_BALL_SOUNDS: int = 4
const PASS_SOUND_COOLDOWN: float = 0.12

var players: Array[AudioStreamPlayer2D] = []
var sound_log: Array[Dictionary] = []
var last_pass_time: float = -999.0
var clock: float = 0.0
var enabled: bool = true
var streams_by_key: Dictionary = {}

func setup(pool_size: int = 8) -> void:
	_ensure_bus("Field")
	for i in range(pool_size):
		var player := AudioStreamPlayer2D.new()
		player.name = "FieldSound%02d" % i
		player.bus = "Field"
		player.max_distance = 1800.0
		player.attenuation = 0.22
		player.volume_db = -8.0
		add_child(player)
		players.append(player)

func tick(delta: float) -> void:
	clock += delta

func play_field_event(sound_key: String, world_position: Vector2, priority: int, match_speed: float, volume_db: float = 0.0) -> bool:
	if not enabled:
		return false
	if not _should_play_priority(priority, match_speed):
		return false
	if sound_key in ["short_pass", "ball_control"] and clock - last_pass_time < PASS_SOUND_COOLDOWN:
		return false
	if sound_key in ["short_pass", "hard_pass", "ball_control"]:
		last_pass_time = clock
	if _active_ball_sounds() >= MAX_ACTIVE_BALL_SOUNDS and priority < 85:
		return false
	var player := _acquire_player()
	if player == null:
		return false
	var stream := _stream_for_key(sound_key)
	player.stream = stream
	player.position = world_position
	player.volume_db = volume_db + _priority_gain(priority)
	player.pitch_scale = randf_range(0.96, 1.04)
	sound_log.append({
		"time": clock,
		"key": sound_key,
		"priority": priority,
		"speed": match_speed,
		"position": world_position,
		"has_stream": stream != null
	})
	if player.stream != null:
		player.play()
	return true

func register_streams(mapping: Dictionary) -> void:
	for key in mapping.keys():
		var streams: Array = mapping[key]
		if streams.is_empty():
			continue
		streams_by_key[str(key)] = streams.duplicate()

func asset_stats() -> Dictionary:
	var count: int = 0
	for key in streams_by_key.keys():
		count += streams_by_key[key].size()
	return {
		"keys": streams_by_key.size(),
		"streams": count
	}

func clear_log() -> void:
	sound_log.clear()

func _acquire_player() -> AudioStreamPlayer2D:
	for player in players:
		if not player.playing:
			return player
	return players[0] if not players.is_empty() else null

func _active_ball_sounds() -> int:
	var count: int = 0
	for player in players:
		if player.playing:
			count += 1
	return count

func _should_play_priority(priority: int, match_speed: float) -> bool:
	if match_speed <= 1.1:
		return true
	if match_speed <= 2.1:
		return priority >= 30
	if match_speed <= 4.1:
		return priority >= 60
	if match_speed <= 8.1:
		return priority >= 85
	return priority >= 90

func _stream_for_key(sound_key: String) -> AudioStream:
	if not streams_by_key.has(sound_key):
		return null
	var streams: Array = streams_by_key[sound_key]
	if streams.is_empty():
		return null
	return streams[randi() % streams.size()] as AudioStream

func _priority_gain(priority: int) -> float:
	if priority >= 95:
		return 1.5
	if priority >= 85:
		return 0.8
	if priority >= 60:
		return -1.5
	return -4.0

func _ensure_bus(bus_name: String) -> void:
	if AudioServer.get_bus_index(bus_name) >= 0:
		return
	AudioServer.add_bus(AudioServer.bus_count)
	AudioServer.set_bus_name(AudioServer.bus_count - 1, bus_name)
