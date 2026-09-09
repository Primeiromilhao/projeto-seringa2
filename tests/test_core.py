from syringe_ai.core import AICore
from syringe_ai.models import AIRequest, AIConfig, Message
from syringe_ai.safety import SafetyPolicy

class FakeProvider:
    name = "fake"
    def generate(self, messages, model, temperature, max_tokens):
        assert messages[-1].role == "user"
        return "resposta de teste"

def test_response_and_memory(tmp_path):
    core = AICore(AIConfig(provider="fake"), provider=FakeProvider(), data_dir=tmp_path)
    first = core.respond(AIRequest("Olá", "s1"))
    second = core.respond(AIRequest("Lembre-se do contexto", "s1"))
    assert first.text == "resposta de teste"
    assert second.provider == "fake"
    assert len(core.memory.history("s1")) == 4

def test_empty_input_rejected(tmp_path):
    core = AICore(AIConfig(provider="fake"), provider=FakeProvider(), data_dir=tmp_path)
    try:
        core.respond(AIRequest("   "))
    except ValueError as exc:
        assert str(exc) == "EMPTY_INPUT"
    else:
        raise AssertionError("empty input was accepted")

def test_hardware_boundary():
    policy = SafetyPolicy()
    assert policy.validate_decision("analysis", False) == (True, "PASS")
    assert policy.validate_decision("inject", True) == (False, "DIRECT_HARDWARE_ACTION_BLOCKED")
