import argparse
from .core import AICore
from .models import AIConfig, AIRequest

def main() -> None:
    parser = argparse.ArgumentParser(description="Syringe AI Core")
    parser.add_argument("prompt", nargs="?", help="single prompt")
    parser.add_argument("--session", default="default")
    args = parser.parse_args()
    core = AICore(AIConfig())
    if args.prompt:
        print(core.respond(AIRequest(args.prompt, args.session)).text)
        return
    print("Syringe AI Core ready. Type 'exit' to stop.")
    while True:
        try:
            text = input("> ").strip()
        except (EOFError, KeyboardInterrupt):
            break
        if text.lower() in {"exit", "quit"}:
            break
        if text:
            print(core.respond(AIRequest(text, args.session)).text)
