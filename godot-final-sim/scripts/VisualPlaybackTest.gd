extends SceneTree

const MAX_FRAMES: int = 1800
const OPEN_PLAY_JUMP_LIMIT: float = 0.090

var sim: Node = null
var frames: int = 0
var last_ball_pos: Vector2 = Vector2.ZERO
var max_step: float = 0.0
var open_play_jumps: int = 0
var sampled_events: Dictionary = {}
var jump_details: Array[String] = []

func _initialize() -> void:
	var packed: PackedScene = load("res://scenes/FinalSim.tscn")
	sim = packed.instantiate()
	root.add_child(sim)
	sim.speed = 6.0
	last_ball_pos = sim.ball.pos

func _process(_delta: float) -> bool:
	frames += 1
	var ball: MatchBall = sim.ball
	var step: float = ball.pos.distance_to(last_ball_pos)
	max_step = maxf(max_step, step)
	if _is_open_play_sample(ball) and step > OPEN_PLAY_JUMP_LIMIT:
		open_play_jumps += 1
		if jump_details.size() < 6:
			jump_details.append("event=%d action=%s state=%s step=%.4f from=%.3f,%.3f to=%.3f,%.3f" % [
				int(sim.event_index),
				str(sim.current_event.get("action", "")),
				str(ball.ball_state),
				step,
				last_ball_pos.x,
				last_ball_pos.y,
				ball.pos.x,
				ball.pos.y
			])
	sampled_events[int(sim.event_index)] = true
	last_ball_pos = ball.pos
	if frames >= MAX_FRAMES:
		_finish()
	return false

func _finish() -> void:
	var actor_detail: String = "-"
	if sim.event_actor != null:
		actor_detail = "actor=%s state=%s dist=%.4f actor_pos=%.3f,%.3f target=%.3f,%.3f ball=%.3f,%.3f owner=%s action=%s" % [
			sim.event_actor.name,
			sim.event_actor.current_state,
			sim.event_actor.pos.distance_to(sim.ball.pos),
			sim.event_actor.pos.x,
			sim.event_actor.pos.y,
			sim.event_actor.target.x,
			sim.event_actor.target.y,
			sim.ball.pos.x,
			sim.ball.pos.y,
			sim.ball.owner.name if sim.ball.owner != null else "-",
			str(sim.current_event.get("action", ""))
		]
	print("VISUAL_PLAYBACK_STATS frames=%d sampled_events=%d max_step=%.4f open_play_jumps=%d state=%s event=%d details=%s %s" % [
		frames,
		sampled_events.size(),
		max_step,
		open_play_jumps,
		str(sim.ball.ball_state),
		int(sim.event_index),
		str(jump_details),
		actor_detail
	])
	if sampled_events.size() < 6:
		push_error("Visual playback did not advance enough events.")
		quit(11)
		return
	if open_play_jumps > 0:
		push_error("Ball jumped during open play %d times." % open_play_jumps)
		quit(12)
		return
	quit(0)

func _is_open_play_sample(ball: MatchBall) -> bool:
	if sim.current_event.is_empty():
		return false
	if ball.ball_state == MatchBall.OUT_OF_PLAY:
		return false
	return str(sim.current_event.get("phase", "")) != "set_piece"
