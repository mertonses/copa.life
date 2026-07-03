class_name MatchEngine
extends RefCounted

var _state: int = 1

func simulate(input: Dictionary) -> Dictionary:
	_seed(input.get("seed", "2026"))
	var home_name: String = str(input.get("home_name", "copa.life XI"))
	var away_name: String = str(input.get("away_name", "Final Rakibi"))
	var home_power: float = float(input.get("home_power", 84))
	var away_power: float = float(input.get("away_power", 82))
	var card_bonus: float = _card_bonus(input.get("cards", []))
	var style: String = str(input.get("style", "balanced"))
	var style_tilt: float = _style_tilt(style)

	var score: Dictionary = {"home": 0, "away": 0}
	var stats: Dictionary = {
		"home_shots": 0, "away_shots": 0,
		"home_saves": 0, "away_saves": 0,
		"home_danger": 0, "away_danger": 0,
		"home_corners": 0, "away_corners": 0
	}
	var events: Array[Dictionary] = []
	var momentum: float = 50.0 + clampf((home_power - away_power) * 0.35, -10.0, 10.0)
	var clock: float = _next_gap(_phase(0.0)) * 0.5
	var full_time: float = 90.0 + floorf(_randf() * 4.0) + 2.0
	var limit: float = full_time
	var extra_time: bool = false
	var half_done: bool = false
	var et_half_done: bool = false

	while clock < 125.0:
		if clock >= limit and not extra_time:
			if score["home"] == score["away"]:
				extra_time = true
				limit = full_time + 30.0
				events.append(_event(clock, "et_start", "", momentum, score, "Extra time begins", Vector2(0.5, 0.5), []))
				clock += 1.0
				continue
			break

		if extra_time and clock >= full_time + 30.0:
			if score["home"] == score["away"]:
				var pen: Dictionary = _penalties(home_power + card_bonus, away_power)
				if pen["home_won"]:
					score["home"] += 1
				else:
					score["away"] += 1
				events.append(_event(clock, "penalty", pen["side"], momentum, score, pen["label"], Vector2(0.5, 0.5), []))
			break

		if not half_done and clock >= 45.0:
			half_done = true
			events.append(_event(45.0, "half", "", momentum, score, "Half time", Vector2(0.5, 0.5), []))

		if extra_time and not et_half_done and clock >= full_time + 15.0:
			et_half_done = true
			events.append(_event(full_time + 15.0, "half", "", momentum, score, "Extra-time break", Vector2(0.5, 0.5), []))

		var ph: Dictionary = _phase(clock)
		var side: String = _choose_side(momentum, home_power + style_tilt, away_power)
		var zone: String = _zone(side, momentum)
		var is_home: bool = side == "home"
		var attack: float = (home_power + card_bonus + style_tilt) if is_home else away_power
		var defense: float = away_power if is_home else (home_power + card_bonus)
		var danger_gain: int = int(roundf(8.0 + _randf() * 12.0 + maxf(0.0, attack - defense) * 0.18))

		if is_home:
			stats.home_danger += danger_gain
		else:
			stats.away_danger += danger_gain

		var pos: Vector2 = _event_position(side, zone)
		var label: String = ""
		var type: String = "chance"
		var delta_mom: float = 0.0

		if _randf() < 0.18:
			type = "corner"
			label = ("%s wins a corner" % home_name) if is_home else ("%s wins a corner" % away_name)
			if is_home:
				stats.home_corners += 1
			else:
				stats.away_corners += 1
			delta_mom = 2.5 if is_home else -2.5
		else:
			if is_home:
				stats.home_shots += 1
			else:
				stats.away_shots += 1

			var goal: bool = _resolve_shot(zone, attack, defense, score, side, ph)
			if goal:
				type = "goal"
				if is_home:
					score["home"] += 1
				else:
					score["away"] += 1
				label = ("GOAL! %s" % home_name) if is_home else ("GOAL! %s" % away_name)
				delta_mom = 10.0 if is_home else -10.0
			else:
				var saved: bool = _randf() < 0.55
				type = "save" if saved else "miss"
				if saved:
					if is_home:
						stats.away_saves += 1
					else:
						stats.home_saves += 1
				label = _miss_label(type, side, home_name, away_name)
				delta_mom = 3.0 if is_home else -3.0

		momentum = clampf(momentum + delta_mom + (50.0 - momentum) * 0.08, 0.0, 100.0)
		events.append(_event(clock, type, side, momentum, score, label, pos, _event_path(side, type, zone, pos)))
		clock += _next_gap(_phase(clock))

	var winner: String = "draw"
	if score["home"] > score["away"]:
		winner = "home"
	elif score["away"] > score["home"]:
		winner = "away"

	return {
		"home_name": home_name,
		"away_name": away_name,
		"home_power": home_power,
		"away_power": away_power,
		"score": score,
		"winner": winner,
		"stats": stats,
		"events": events
	}

func _seed(seed_value) -> void:
	var text: String = str(seed_value)
	var h: int = 2166136261
	for i in range(text.length()):
		h = int((h ^ text.unicode_at(i)) * 16777619) & 0x7fffffff
	_state = maxi(1, h)

func _randf() -> float:
	_state = int((_state ^ (_state << 13)) & 0x7fffffff)
	_state = int((_state ^ (_state >> 17)) & 0x7fffffff)
	_state = int((_state ^ (_state << 5)) & 0x7fffffff)
	return float(_state & 0x7fffffff) / float(0x7fffffff)

func _phase(clock: float) -> Dictionary:
	if clock < 20.0:
		return {"id": "early", "score_rate": 0.72, "event_rate": 0.75}
	if clock < 65.0:
		return {"id": "mid", "score_rate": 1.0, "event_rate": 1.0}
	if clock < 90.0:
		return {"id": "late", "score_rate": 1.22, "event_rate": 1.28}
	return {"id": "et", "score_rate": 0.85, "event_rate": 0.82}

func _next_gap(phase: Dictionary) -> float:
	var r: float = maxf(0.001, _randf())
	return -log(1.0 - r) * 4.2 / float(phase["event_rate"])

func _choose_side(momentum: float, home_power: float, away_power: float) -> String:
	var power_tilt: float = clampf((home_power - away_power) / 90.0, -0.12, 0.12)
	var p_home: float = clampf(0.32 + momentum * 0.0036 + power_tilt, 0.28, 0.72)
	return "home" if _randf() < p_home else "away"

func _zone(side: String, momentum: float) -> String:
	var pressure: float = momentum if side == "home" else 100.0 - momentum
	var r: float = _randf()
	if r < 0.18 + pressure * 0.001:
		return "close"
	if r < 0.68:
		return "box"
	return "long"

func _resolve_shot(zone: String, attack: float, defense: float, score: Dictionary, side: String, phase: Dictionary) -> bool:
	var base: float = float({"close": 0.34, "box": 0.18, "long": 0.065}.get(zone, 0.08))
	var pow_factor: float = tanh((attack - defense) / 30.0) * 0.17
	var trailing: float = 0.0
	if side == "home" and score["home"] < score["away"]:
		trailing = 0.045
	if side == "away" and score["away"] < score["home"]:
		trailing = 0.045
	var prob: float = clampf((base + pow_factor + trailing) * float(phase["score_rate"]), 0.035, 0.52)
	return _randf() < prob

func _event_position(side: String, zone: String) -> Vector2:
	var x: float = 0.24 + _randf() * 0.52
	var y: float = 0.0
	if side == "home":
		y = {"close": 0.18, "box": 0.28, "long": 0.42}.get(zone, 0.35) + _randf() * 0.08
	else:
		y = {"close": 0.82, "box": 0.70, "long": 0.56}.get(zone, 0.65) - _randf() * 0.08
	return Vector2(x, y)

func _event(clock: float, type: String, side: String, momentum: float, score: Dictionary, label: String, pos: Vector2, path: Array) -> Dictionary:
	return {
		"minute": int(floorf(clock)),
		"type": type,
		"side": side,
		"momentum": momentum,
		"home_goals": score["home"],
		"away_goals": score["away"],
		"label": label,
		"pos": {"x": pos.x, "y": pos.y},
		"path": path
	}

func _event_path(side: String, type: String, zone: String, target: Vector2) -> Array:
	if side == "":
		return [_pt(0.5, 0.5)]

	var home: bool = side == "home"
	var start_y: float = 0.78 if home else 0.22
	var mid_y: float = 0.58 if home else 0.42
	var third_y: float = 0.40 if home else 0.60
	if zone == "long":
		mid_y = 0.52 if home else 0.48
		third_y = 0.45 if home else 0.55
	elif zone == "close":
		third_y = 0.30 if home else 0.70

	var lane: float = clampf(target.x + (_randf() - 0.5) * 0.18, 0.18, 0.82)
	var start_x: float = clampf(0.50 + (_randf() - 0.5) * 0.28, 0.18, 0.82)
	var support_x: float = clampf((start_x + lane) * 0.5 + (_randf() - 0.5) * 0.16, 0.14, 0.86)
	var cut_x: float = clampf(target.x + (_randf() - 0.5) * 0.10, 0.12, 0.88)

	var path: Array = [
		_pt(start_x, start_y),
		_pt(support_x, mid_y),
		_pt(lane, third_y),
		_pt(cut_x, (third_y + target.y) * 0.5),
		_pt(target.x, target.y)
	]

	if type == "corner":
		path = [
			_pt(0.06 if target.x < 0.5 else 0.94, 0.10 if home else 0.90),
			_pt(0.28 if target.x < 0.5 else 0.72, 0.22 if home else 0.78),
			_pt(target.x, target.y)
		]
	elif type == "goal":
		var goal_y: float = 0.05 if home else 0.95
		path.append(_pt(0.5, goal_y))

	return path

func _pt(x: float, y: float) -> Dictionary:
	return {"x": clampf(x, 0.03, 0.97), "y": clampf(y, 0.04, 0.96)}

func _penalties(home_power: float, away_power: float) -> Dictionary:
	var p_home: float = clampf(0.74 + (home_power - away_power) / 220.0, 0.42, 0.92)
	var p_away: float = clampf(0.74 + (away_power - home_power) / 220.0, 0.42, 0.92)
	var home_goals: int = 0
	var away_goals: int = 0
	for i in range(5):
		if _randf() < p_home:
			home_goals += 1
		if _randf() < p_away:
			away_goals += 1
	while home_goals == away_goals:
		var h: bool = _randf() < p_home
		var a: bool = _randf() < p_away
		if h:
			home_goals += 1
		if a:
			away_goals += 1
	var won: bool = home_goals > away_goals
	return {
		"home_won": won,
		"side": "home" if won else "away",
		"label": "Penalty shootout: %d-%d" % [home_goals, away_goals]
	}

func _card_bonus(cards) -> float:
	var bonus: float = 0.0
	for c in cards:
		match str(c):
			"taraftar":
				bonus += 1.4
			"kontra":
				bonus += 1.1
			"buyuk_mac":
				bonus += 1.6
			"ch_final":
				bonus += 2.0
			_:
				bonus += 0.25
	return bonus

func _style_tilt(style: String) -> float:
	match style:
		"gegen":
			return 1.4
		"kontra":
			return 0.8
		"otobus":
			return -0.2
		_:
			return 0.0

func _miss_label(type: String, side: String, home_name: String, away_name: String) -> String:
	var team: String = home_name if side == "home" else away_name
	if type == "save":
		return "%s tests the keeper" % team
	return "%s goes close" % team
