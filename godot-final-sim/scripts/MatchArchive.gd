class_name MatchArchive
extends RefCounted

func to_json(data: Dictionary) -> String:
	return JSON.stringify(data, "\t")

func summary(data: Dictionary) -> String:
	var home_name: String = str(data.get("home_name", "Home"))
	var away_name: String = str(data.get("away_name", "Away"))
	var sh: int = int(data.get("score_home", 0))
	var sa: int = int(data.get("score_away", 0))
	var events: Array = data.get("events", [])
	var shots_home: int = 0
	var shots_away: int = 0
	var danger_home: float = 0.0
	var danger_away: float = 0.0
	for ev in events:
		if typeof(ev) != TYPE_DICTIONARY:
			continue
		var team: int = int(ev.get("team", 0))
		if str(ev.get("action", "")) == "SHOOT":
			if team == 0:
				shots_home += 1
			else:
				shots_away += 1
		if team == 0:
			danger_home += float(ev.get("danger", 0.0))
		else:
			danger_away += float(ev.get("danger", 0.0))
	return "%s %d-%d %s\nEvents: %d\nShots: %d-%d\nDanger: %.1f-%.1f" % [
		home_name, sh, sa, away_name, events.size(), shots_home, shots_away, danger_home, danger_away
	]

func validate(data: Dictionary) -> Array[String]:
	var warnings: Array[String] = []
	var events: Array = data.get("events", [])
	if events.is_empty():
		return ["Archive has no events."]
	var last_home: int = 0
	var last_away: int = 0
	var required: Array[String] = ["id", "minute", "team", "action", "start", "end", "success", "turnover", "score_home", "score_away"]
	for i in range(events.size()):
		var ev = events[i]
		if typeof(ev) != TYPE_DICTIONARY:
			warnings.append("Event %d is not a dictionary." % i)
			continue
		for key in required:
			if not ev.has(key):
				warnings.append("Event %d missing %s." % [i, key])
		var action: String = str(ev.get("action", ""))
		var sh: int = int(ev.get("score_home", last_home))
		var sa: int = int(ev.get("score_away", last_away))
		if sh < last_home or sa < last_away:
			warnings.append("Event %d score regressed." % i)
		if bool(ev.get("goal", false)) and action != "SHOOT":
			warnings.append("Event %d marks goal without shot action." % i)
		if str(ev.get("phase", "")) == "set_piece" and str(ev.get("restart_type", "")) == "":
			warnings.append("Event %d set-piece missing restart_type." % i)
		last_home = sh
		last_away = sa
	if last_home != int(data.get("score_home", last_home)) or last_away != int(data.get("score_away", last_away)):
		warnings.append("Archive final score does not match last event score.")
	return warnings
