class_name AudioAssetLibrary
extends RefCounted

const BASE := "res://assets/audio/source_packs/"
const IMPACT := BASE + "kenney_impact-sounds/Audio/"
const INTERFACE := BASE + "kenney_interface-sounds/Audio/"
const UI := BASE + "kenney_ui-audio/Audio/"

static func default_field_streams() -> Dictionary:
	var mapping := {
		"short_pass": [
			IMPACT + "impactSoft_medium_000.ogg",
			IMPACT + "impactSoft_medium_001.ogg",
			IMPACT + "impactSoft_medium_002.ogg",
			IMPACT + "impactGeneric_light_000.ogg",
			IMPACT + "impactGeneric_light_001.ogg",
		],
		"hard_pass": [
			IMPACT + "impactSoft_heavy_000.ogg",
			IMPACT + "impactSoft_heavy_001.ogg",
			IMPACT + "impactPunch_medium_000.ogg",
			IMPACT + "impactPunch_medium_001.ogg",
		],
		"long_ball": [
			IMPACT + "impactPunch_heavy_000.ogg",
			IMPACT + "impactPunch_heavy_001.ogg",
			IMPACT + "impactSoft_heavy_002.ogg",
			IMPACT + "impactWood_medium_000.ogg",
		],
		"cross": [
			IMPACT + "impactPunch_medium_002.ogg",
			IMPACT + "impactPunch_medium_003.ogg",
			IMPACT + "impactSoft_heavy_003.ogg",
			IMPACT + "impactWood_medium_001.ogg",
		],
		"shot": [
			IMPACT + "impactPunch_heavy_002.ogg",
			IMPACT + "impactPunch_heavy_003.ogg",
			IMPACT + "impactWood_heavy_000.ogg",
			IMPACT + "impactWood_heavy_001.ogg",
		],
		"ball_control": [
			IMPACT + "impactGeneric_light_002.ogg",
			IMPACT + "impactGeneric_light_003.ogg",
			IMPACT + "impactSoft_medium_003.ogg",
			IMPACT + "footstep_grass_000.ogg",
			IMPACT + "footstep_grass_001.ogg",
		],
		"keeper_short_pass": [
			IMPACT + "impactSoft_medium_004.ogg",
			IMPACT + "impactGeneric_light_004.ogg",
			IMPACT + "impactSoft_heavy_004.ogg",
		],
		"keeper_save": [
			IMPACT + "impactSoft_heavy_000.ogg",
			IMPACT + "impactSoft_heavy_001.ogg",
			IMPACT + "impactPunch_medium_004.ogg",
			IMPACT + "impactTin_medium_000.ogg",
		],
		"tackle_or_intercept": [
			IMPACT + "impactSoft_heavy_002.ogg",
			IMPACT + "impactPunch_medium_000.ogg",
			IMPACT + "impactTin_medium_001.ogg",
			IMPACT + "impactGeneric_light_000.ogg",
		],
		"net_hit": [
			IMPACT + "impactSoft_medium_000.ogg",
			IMPACT + "impactSoft_medium_001.ogg",
			IMPACT + "impactTin_medium_002.ogg",
			INTERFACE + "confirmation_001.ogg",
		],
		"throw_in": [
			IMPACT + "impactGeneric_light_001.ogg",
			IMPACT + "impactSoft_medium_002.ogg",
			IMPACT + "impactWood_light_000.ogg",
		],
		"whistle": [
			INTERFACE + "confirmation_002.ogg",
			INTERFACE + "tick_001.ogg",
			UI + "switch23.ogg",
		],
		"restart_setup": [
			INTERFACE + "select_001.ogg",
			INTERFACE + "select_002.ogg",
			INTERFACE + "tick_002.ogg",
		],
	}
	return _load_mapping(mapping)

static func default_ui_streams() -> Dictionary:
	var mapping := {
		"select": [
			INTERFACE + "select_003.ogg",
			INTERFACE + "select_004.ogg",
			UI + "click1.ogg",
		],
		"confirm": [
			INTERFACE + "confirmation_003.ogg",
			INTERFACE + "confirmation_004.ogg",
		],
		"back": [
			INTERFACE + "back_001.ogg",
			INTERFACE + "back_002.ogg",
		],
	}
	return _load_mapping(mapping)

static func _load_mapping(path_mapping: Dictionary) -> Dictionary:
	var loaded := {}
	for key in path_mapping.keys():
		var streams: Array[AudioStream] = []
		for path in path_mapping[key]:
			var stream := _load_stream(str(path))
			if stream != null:
				streams.append(stream)
		if not streams.is_empty():
			loaded[str(key)] = streams
	return loaded

static func _load_stream(path: String) -> AudioStream:
	if not ResourceLoader.exists(path):
		return null
	var resource := ResourceLoader.load(path)
	if resource is AudioStream:
		return resource as AudioStream
	return null
