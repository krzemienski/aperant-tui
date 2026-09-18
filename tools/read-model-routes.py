#!/usr/bin/env python3
"""Safe, redacting reader for ~/.omp/agent/models.yml.

Prints ONLY non-secret routing metadata: provider name, baseUrl, api type,
whether an apiKey is present (boolean only, never the value or any prefix),
and the count + ids of configured models.

Dependency-light: uses PyYAML if available, otherwise falls back to a
minimal line-oriented parser tailored to this file's structure. Never
imports, prints, logs, or interpolates the actual apiKey value anywhere.
"""

from __future__ import annotations

import os
import sys

MODELS_PATH = os.path.expanduser("~/.omp/agent/models.yml")


def _redact_load_with_yaml(path: str):
    import yaml  # type: ignore

    with open(path, "r") as f:
        data = yaml.safe_load(f)
    providers = data.get("providers", {}) or {}
    out = []
    for name, cfg in providers.items():
        if not isinstance(cfg, dict):
            continue
        models = cfg.get("models", []) or []
        model_ids = [m.get("id") for m in models if isinstance(m, dict) and m.get("id")]
        out.append(
            {
                "provider": name,
                "baseUrl": cfg.get("baseUrl"),
                "api": cfg.get("api"),
                "hasApiKey": bool(cfg.get("apiKey")),
                "modelCount": len(model_ids),
                "modelIds": model_ids,
            }
        )
    return out


def _fallback_line_parser(path: str):
    """Minimal parser: walks top-level provider blocks under `providers:`.

    Assumes 2-space indent for provider name, 4-space indent for provider
    keys (baseUrl, apiKey, api, models), and 4-space `- id: ...` entries
    under `models:` at deeper indent. Tolerant of the specific structure
    seen in this repo's models.yml; not a general YAML parser.
    """
    out = []
    current = None
    in_models = False

    def flush():
        if current is not None:
            out.append(current)

    with open(path, "r") as f:
        for raw_line in f:
            line = raw_line.rstrip("\n")
            if not line.strip() or line.strip().startswith("#"):
                continue
            # Top-level "providers:" line — ignore
            if line == "providers:":
                continue
            # Provider name: exactly 2 spaces indent, ends with ':'
            if line.startswith("  ") and not line.startswith("    ") and line.strip().endswith(":"):
                flush()
                name = line.strip()[:-1]
                current = {
                    "provider": name,
                    "baseUrl": None,
                    "api": None,
                    "hasApiKey": False,
                    "modelCount": 0,
                    "modelIds": [],
                }
                in_models = False
                continue
            if current is None:
                continue
            stripped = line.strip()
            # 4-space indent keys belonging to the current provider
            if line.startswith("    ") and not line.startswith("      "):
                if stripped.startswith("baseUrl:"):
                    current["baseUrl"] = stripped.split(":", 1)[1].strip()
                    in_models = False
                elif stripped.startswith("apiKey:"):
                    val = stripped.split(":", 1)[1].strip()
                    current["hasApiKey"] = bool(val)
                    in_models = False
                elif stripped.startswith("api:"):
                    current["api"] = stripped.split(":", 1)[1].strip()
                    in_models = False
                elif stripped.startswith("models:"):
                    in_models = True
                else:
                    in_models = False
            # deeper indent: model list entries
            elif in_models and stripped.startswith("- id:"):
                model_id = stripped.split(":", 1)[1].strip()
                current["modelIds"].append(model_id)
                current["modelCount"] += 1
    flush()
    return out


def load_provider_summaries(path: str):
    try:
        return _redact_load_with_yaml(path)
    except ImportError:
        return _fallback_line_parser(path)


def main() -> int:
    if not os.path.exists(MODELS_PATH):
        print(f"models.yml not found at {MODELS_PATH}", file=sys.stderr)
        return 1

    summaries = load_provider_summaries(MODELS_PATH)
    if not summaries:
        print("No providers found.")
        return 0

    for s in summaries:
        print(f"provider: {s['provider']}")
        print(f"  baseUrl: {s['baseUrl']}")
        print(f"  api: {s['api']}")
        print(f"  hasApiKey: {s['hasApiKey']}")
        print(f"  modelCount: {s['modelCount']}")
        print(f"  modelIds: {', '.join(s['modelIds']) if s['modelIds'] else '(none)'}")
        print()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
