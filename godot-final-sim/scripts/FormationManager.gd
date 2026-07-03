class_name FormationManager
extends RefCounted

func roles_for(formation: String) -> Array[String]:
	match formation:
		"4-3-3":
			return ["GK", "LB", "CB", "CB", "RB", "CM", "CM", "AM", "LW", "ST", "RW"]
		"3-5-2":
			return ["GK", "CB", "CB", "CB", "LM", "CM", "DM", "CM", "RM", "ST", "ST"]
		"4-2-3-1":
			return ["GK", "LB", "CB", "CB", "RB", "DM", "DM", "LW", "AM", "RW", "ST"]
		_:
			return ["GK", "LB", "CB", "CB", "RB", "LM", "CM", "CM", "RM", "ST", "ST"]

func positions_for(formation: String, side: int) -> Array[Vector2]:
	var home: bool = side == 0
	var y_goal: float = 0.90 if home else 0.10
	var y_def: float = 0.72 if home else 0.28
	var y_mid: float = 0.54 if home else 0.46
	var y_att: float = 0.34 if home else 0.66
	var raw: Array[Vector2]
	match formation:
		"4-3-3":
			raw = [
				Vector2(0.50, y_goal),
				Vector2(0.18, y_def), Vector2(0.38, y_def), Vector2(0.62, y_def), Vector2(0.82, y_def),
				Vector2(0.30, y_mid), Vector2(0.50, y_mid), Vector2(0.70, y_mid),
				Vector2(0.20, y_att), Vector2(0.50, y_att), Vector2(0.80, y_att)
			]
		"3-5-2":
			raw = [
				Vector2(0.50, y_goal),
				Vector2(0.30, y_def), Vector2(0.50, y_def), Vector2(0.70, y_def),
				Vector2(0.15, y_mid), Vector2(0.35, y_mid), Vector2(0.50, y_mid + (0.06 if home else -0.06)), Vector2(0.65, y_mid), Vector2(0.85, y_mid),
				Vector2(0.42, y_att), Vector2(0.58, y_att)
			]
		"4-2-3-1":
			var y_dm: float = 0.61 if home else 0.39
			var y_am: float = 0.43 if home else 0.57
			raw = [
				Vector2(0.50, y_goal),
				Vector2(0.18, y_def), Vector2(0.38, y_def), Vector2(0.62, y_def), Vector2(0.82, y_def),
				Vector2(0.42, y_dm), Vector2(0.58, y_dm),
				Vector2(0.20, y_am), Vector2(0.50, y_am), Vector2(0.80, y_am),
				Vector2(0.50, y_att)
			]
		_:
			raw = [
				Vector2(0.50, y_goal),
				Vector2(0.18, y_def), Vector2(0.38, y_def), Vector2(0.62, y_def), Vector2(0.82, y_def),
				Vector2(0.18, y_mid), Vector2(0.40, y_mid), Vector2(0.60, y_mid), Vector2(0.82, y_mid),
				Vector2(0.42, y_att), Vector2(0.58, y_att)
			]
	# Away team attacks downward — their "left" is field's right and vice versa.
	# Mirror x so that Away LB faces Home LW, Away RW faces Home LB, etc.
	if not home:
		for i in range(raw.size()):
			raw[i].x = 1.0 - raw[i].x
	return raw
