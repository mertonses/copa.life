class_name VoiceSoundPool
extends Node

const MAX_ACTIVE_VOICES: int = 3
const VOICE_COOLDOWN: float = 0.55

var players: Array[AudioStreamPlayer2D] = []
var voice_log: Array[Dictionary] = []
var last_voice_time: float = -999.0
var clock: float = 0.0
var enabled: bool = true

func setup(pool_size: int = 5) -> void:
	_ensure_bus("Players")
	for i in range(pool_size):
		var player := AudioStreamPlayer2D.new()
		player.name = "VoiceSound%02d" % i
		player.bus = "Players"
		player.max_distance = 1500.0
		player.attenuation = 0.18
		player.volume_db = -13.0
		add_child(player)
		players.append(player)

func tick(delta: float) -> void:
	clock += delta

func play_voice_event(voice_key: String, world_position: Vector2, priority: int, match_speed: float) -> bool:
	if not enabled:
		return false
	if match_speed > 2.1 and priority < 70:
		return false
	if match_speed > 4.1 and priority < 85:
		return false
	if clock - last_voice_time < VOICE_COOLDOWN and priority < 85:
		return false
	if _active_voice_count() >= MAX_ACTIVE_VOICES and priority < 90:
		return false
	var player := _acquire_player()
	if player == null:
		return false
	last_voice_time = clock
	player.position = world_position
	player.pitch_scale = randf_range(0.94, 1.06)
	voice_log.append({
		"time": clock,
		"key": voice_key,
		"priority": priority,
		"speed": match_speed,
		"position": world_position
	})
	if player.stream != null:
		player.play()
	return true

func clear_log() -> void:
	voice_log.clear()

func _acquire_player() -> AudioStreamPlayer2D:
	for player in players:
		if not player.playing:
			return player
	return players[0] if not players.is_empty() else null

func _active_voice_count() -> int:
	var count: int = 0
	for player in players:
		if player.playing:
			count += 1
	return count

func _ensure_bus(bus_name: String) -> void:
	if AudioServer.get_bus_index(bus_name) >= 0:
		return
	AudioServer.add_bus(AudioServer.bus_count)
	AudioServer.set_bus_name(AudioServer.bus_count - 1, bus_name)
