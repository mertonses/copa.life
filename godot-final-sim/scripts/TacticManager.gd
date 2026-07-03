class_name TacticManager
extends RefCounted

var mentality: String = "balanced"
var width: float = 0.56
var pressing: float = 0.52
var tempo: float = 0.58
var directness: float = 0.48

func configure(style: String) -> void:
	mentality = style
	match style:
		"gegen":
			pressing = 0.78
			tempo = 0.72
			directness = 0.52
			width = 0.58
		"kontra":
			pressing = 0.44
			tempo = 0.62
			directness = 0.76
			width = 0.66
		"otobus":
			pressing = 0.30
			tempo = 0.40
			directness = 0.36
			width = 0.48
		_:
			pressing = 0.52
			tempo = 0.58
			directness = 0.48
			width = 0.56

func attacking_lane(ball_pos: Vector2, rng_value: float) -> String:
	var edge_bias: float = abs(ball_pos.x - 0.5) * 0.8 + width * 0.25
	if rng_value < edge_bias:
		return "left" if ball_pos.x < 0.5 else "right"
	if rng_value < edge_bias + 0.18:
		return "switch"
	return "center"
