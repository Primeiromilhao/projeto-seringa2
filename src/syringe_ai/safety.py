import re

class SafetyPolicy:
    """Boundary layer: the AI can advise, never directly actuate hardware."""
    HARDWARE_ACTION = re.compile(r"\b(actuate|inject|dispense|motor|pump|solenoid|dose)\b", re.I)

    def validate_input(self, text: str) -> tuple[bool, str]:
        if not text or not text.strip():
            return False, "EMPTY_INPUT"
        return True, "PASS"

    def validate_decision(self, decision_kind: str, requires_tool: bool) -> tuple[bool, str]:
        if requires_tool and self.HARDWARE_ACTION.search(decision_kind or ""):
            return False, "DIRECT_HARDWARE_ACTION_BLOCKED"
        return True, "PASS"

    def system_rules(self) -> str:
        return (
            "You are the intelligence layer only. Interpret, reason and recommend. "
            "Never claim to control physical hardware. Never issue direct actuator commands. "
            "If a physical action is relevant, describe it as a recommendation for a later, "
            "independent safety-controlled layer."
        )
