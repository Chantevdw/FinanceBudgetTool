# Mechanisms

A catalogue of what Monument Valley does, and what Stillwater has so far.
Items marked **verify** are from memory and need checking against the game.

Status in Stillwater: **yes** (built), **partial** (built differently), **no** (not built).

## Structure and movement

| Mechanism | What it does | What the player sees | Stillwater |
| --- | --- | --- | --- |
| Rotating section | A part of the structure turns a quarter about a pivot. Ida can't stand on the part as it turns. | A knob or handle on the structure | yes (knob sections) |
| Movable bridge | A bridge turns between horizontal and vertical, opening or closing a path. | A plank that can be turned | yes (bridges, tap to turn) |
| Ladder | Connects two levels that differ in height. | Rails and rungs on a wall | yes (ladder edges) |
| Stairs | Walkable slope between levels. | Stepped edges | no |
| Sliding or rising platform | A block moves up, down, or sideways and carries Ida or opens a path. | A block that moves on a track | no (verify) |

## Doors and transport

| Mechanism | What it does | What the player sees | Stillwater |
| --- | --- | --- | --- |
| Mystery door | Walking into one brings Ida out of its paired door somewhere else on the level. | A door on each end, usually matched | yes (paired doors) |

## Triggers

| Mechanism | What it does | What the player sees | Stillwater |
| --- | --- | --- | --- |
| Button | Pressing it changes something: a section turns, a bridge moves, a path opens. | A raised or inset button | no |
| Pressure plate | Standing on it changes something, and leaving it may change it back. | A flat plate on the floor | no |
| Totem | A companion figure that can be placed or moved to trigger or support something. | A figure that Ida can move (verify the exact rules) | no (verify) |

## Enemies and hazards

| Mechanism | What it does | What the player sees | Stillwater |
| --- | --- | --- | --- |
| Crows | Patrol and block Ida's path. Some chapters require waiting or routing around them. | Crows walking along a route (verify) | no (verify) |

## Optical illusions

These are the core of the game. Each one depends on the fixed camera: from the default view, things look connected or aligned when they aren't.

| Mechanism | What it does | What the player sees | Stillwater |
| --- | --- | --- | --- |
| Aligned path | Stones that are separated in space line up on screen from one angle, so the path reads as connected. Turning a section changes the alignment. | Two stones that visually join | partial (knob turns create alignment, but nothing relies on an illusion yet) |
| Forced perspective | Parts at different depths look adjacent, so a route reads as continuous. | A bridge or ledge that seems to join two far stones | no |
| Impossible stairs | A staircase reads as one continuous route while it changes level in a way that isn't physically possible. | A stairway that looks connected from the default view | no |
| Concealed path | A route is hidden from the default view and revealed by turning a section. | A dead end that opens after a turn | partial (knob reveals routes) |

## Design rules that Stillwater follows

- The camera never moves. Only parts of the structure turn.
- Every route must be visible from the start. Tall stones may not hide a walkable stone behind them (checked by `test-levels.js`).
- Each level uses one main mechanism and, where it helps, one secondary mechanism.
- Every control is visible on screen before the player needs it.
