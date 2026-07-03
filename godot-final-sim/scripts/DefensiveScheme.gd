class_name DefensiveScheme
extends RefCounted

const MID_BLOCK: String = "MID_BLOCK"
const HIGH_PRESS: String = "HIGH_PRESS"
const LOW_BLOCK: String = "LOW_BLOCK"
const BALL_SIDE_PRESS: String = "BALL_SIDE_PRESS"
const COMPACT_DEFENSE: String = "COMPACT_DEFENSE"
const BOX_DEFENSE: String = "BOX_DEFENSE"
const RECOVERY_RUN: String = "RECOVERY_RUN"
const COUNTER_PRESS: String = "COUNTER_PRESS"
const SET_PIECE_DEFENSE: String = "SET_PIECE_DEFENSE"

static func is_valid(scheme: String) -> bool:
	return scheme in [
		MID_BLOCK,
		HIGH_PRESS,
		LOW_BLOCK,
		BALL_SIDE_PRESS,
		COMPACT_DEFENSE,
		BOX_DEFENSE,
		RECOVERY_RUN,
		COUNTER_PRESS,
		SET_PIECE_DEFENSE
	]
