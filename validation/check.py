#!/usr/bin/env python3
"""Mechanical checks for the portable course-authoring work sample.

This checks observable structure and fixed oracles. It does not judge whether
the prose teaches well; REVIEW.md is a separate, required gate.
"""

from __future__ import annotations

import json
import math
import re
import sys
import tempfile
from pathlib import Path


IDS = ["M1", "M2", "M3", "M4", "S1", "S2", "S3", "S4"]
AUDIT = {
    "D1": "supported", "D2": "false", "D3": "false",
    "D4": "supported", "D5": "false", "D6": "false",
    "D7": "false", "D8": "false", "D9": "false",
    "D10": "supported", "D11": "unknown",
}
REVIEW = [
    "math_steps", "math_transfer", "math_visuals", "systems_units",
    "systems_honesty", "systems_mechanism", "systems_visuals",
    "learning_order", "explanation_once", "question_quality",
    "source_trace", "depth_and_clarity",
]
NUMBER_ORACLE = {
    "math": {
        "resonant_t_sin_coefficient": 0.75,
        "nonresonant_cos_t_coefficient": 1.0,
        "nonresonant_cos_2t_coefficient": -1.0,
        "defective_eigenvalue": -2.0,
        "defective_eigenspace_dimension": 1.0,
        "defective_x1_at_1": 4 * math.exp(-2),
        "defective_x2_at_1": math.exp(-2),
        "switched_y_at_2": (1 - math.exp(-2)) / 2,
    },
    "systems": {
        "product_a_reduction_percent": 40.0,
        "product_b_reduction_percent": 83.0,
        "combined_reduction_percent": 58.92,
    },
}
BOOLEAN_ORACLE = {
    "synthetic_replay_verifies_real_claim": False,
    "routing_same_tokens_reduces_token_count": False,
    "cache_key_requires_tenant_scope": True,
    "kv_attention_constant_in_context_length": False,
}
HEADINGS = [
    "Core explanation", "Worked case", "Visual reading",
    "Connections", "Sources and limits",
]


def load_json(path: Path, errors: list[str]):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        errors.append(f"{path.name}: missing or invalid JSON ({exc})")
        return None


def substantial(value, minimum=12):
    return isinstance(value, str) and len(value.strip()) >= minimum


def source_ids(value, errors, where):
    if not isinstance(value, list) or not value or any(v not in IDS for v in value):
        errors.append(f"{where}: source_ids must contain known source IDs")


def check_plan(root: Path, errors: list[str]):
    plan = load_json(root / "plan.json", errors)
    if not isinstance(plan, dict):
        return
    if not substantial(plan.get("title")):
        errors.append("plan.json: course title is missing")
    lessons = plan.get("lessons")
    if not isinstance(lessons, list):
        errors.append("plan.json: lessons must be an array")
        return
    actual = [x.get("id") if isinstance(x, dict) else None for x in lessons]
    if actual != IDS:
        errors.append(f"plan.json: lesson order must be {', '.join(IDS)}")
    required = {"M2": "M1", "M3": "M1", "M4": "M1",
                "S2": "S1", "S3": "S2", "S4": "S3"}
    for i, item in enumerate(lessons):
        if not isinstance(item, dict):
            continue
        lid = item.get("id")
        if lid not in IDS:
            continue
        for field in ("title", "concept"):
            if not substantial(item.get(field), 5):
                errors.append(f"plan.json {lid}: {field} is missing")
        source_ids(item.get("source_ids"), errors, f"plan.json {lid}")
        if isinstance(item.get("source_ids"), list) and lid not in item["source_ids"]:
            errors.append(f"plan.json {lid}: must cite its own source ID")
        prior = item.get("prerequisites")
        later = item.get("later_use")
        if not isinstance(prior, list) or any(
            p not in IDS[:i] or p[0] != lid[0] for p in prior
        ):
            errors.append(f"plan.json {lid}: prerequisites must be earlier in its strand")
        if not isinstance(later, list) or any(
            p not in IDS[i + 1:] or p[0] != lid[0] for p in later
        ):
            errors.append(f"plan.json {lid}: later_use must be later in its strand")
        if lid in required and isinstance(prior, list) and required[lid] not in prior:
            errors.append(f"plan.json {lid}: missing prerequisite {required[lid]}")
        if lid == "S4" and isinstance(prior, list) and "S1" not in prior:
            errors.append("plan.json S4: missing measurement prerequisite S1")


def check_lessons(root: Path, errors: list[str]):
    for lid in IDS:
        path = root / "lessons" / f"{lid}.md"
        try:
            body = path.read_text(encoding="utf-8")
        except (OSError, UnicodeError):
            errors.append(f"lessons/{lid}.md: missing or unreadable")
            continue
        if not re.search(rf"(?m)^# {lid}: .+", body):
            errors.append(f"lessons/{lid}.md: missing '# {lid}: Title'")
        found = re.findall(r"(?m)^## ([^\n]+)$", body)
        if found != HEADINGS:
            errors.append(f"lessons/{lid}.md: second-level headings must be {HEADINGS}")
        prose = re.sub(r"(?m)^#{1,6} .*?$", "", body)
        prose = re.sub(r"```.*?```", "", prose, flags=re.S)
        words = re.findall(r"\b[\w'-]+\b", prose)
        if len(words) < 450:
            errors.append(f"lessons/{lid}.md: {len(words)} prose words; need 450")
        if lid in ("M2", "M3", "S2", "S3") and f"Figure {lid}" not in body:
            errors.append(f"lessons/{lid}.md: must interpret Figure {lid}")
        if lid not in ("M1", "S1"):
            connections = body.split("## Connections", 1)[-1].split("## Sources and limits", 1)[0]
            expected = "M1" if lid[0] == "M" else "S1"
            if expected not in connections:
                errors.append(f"lessons/{lid}.md: Connections must identify {expected}")
        if lid not in body.split("## Sources and limits", 1)[-1]:
            errors.append(f"lessons/{lid}.md: Sources and limits must name {lid}")


def numeric(value, expected, errors, where, tolerance=0.001):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        errors.append(f"{where}: expected a finite number")
    elif abs(value - expected) > tolerance:
        errors.append(f"{where}: {value} differs from independent result {expected:.6g}")


def check_figures(root: Path, errors: list[str]):
    figures = load_json(root / "figures.json", errors)
    if not isinstance(figures, dict):
        return
    for lid, kind in (("M2", "plot"), ("M3", "phase"), ("S2", "flow"), ("S3", "flow")):
        fig = figures.get(lid)
        if not isinstance(fig, dict):
            errors.append(f"figures.json: missing {lid}")
            continue
        if fig.get("kind") != kind:
            errors.append(f"figures.json {lid}: kind must be {kind}")
        for field, length in (("alt", 30), ("inference", 45)):
            if not substantial(fig.get(field), length):
                errors.append(f"figures.json {lid}: {field} needs a specific explanation")
        if lid in ("M2", "M3"):
            for field in ("x_label", "y_label"):
                if not substantial(fig.get(field), 1):
                    errors.append(f"figures.json {lid}: missing {field}")
        if lid == "M2":
            series = fig.get("series")
            chosen = next((s for s in series if isinstance(s, dict) and
                           s.get("name") == "resonant"), None) if isinstance(series, list) else None
            points = chosen.get("points") if chosen else None
            if not isinstance(points, list):
                errors.append("figures.json M2: missing resonant series points")
            else:
                if len(points) < 25 or not any(isinstance(p, list) and len(p) == 2
                                               and isinstance(p[0], (int, float)) and p[0] >= 6
                                               for p in points):
                    errors.append("figures.json M2: need at least 25 points through t>=6")
                for t in (0, 0.5, 1, 1.5):
                    hit = next((p for p in points if isinstance(p, list) and len(p) == 2
                                and isinstance(p[0], (int, float)) and abs(p[0] - t) < 1e-9), None)
                    if hit is None:
                        errors.append(f"figures.json M2: missing point at t={t}")
                previous_t = -math.inf
                for n, point in enumerate(points):
                    if not isinstance(point, list) or len(point) != 2 or isinstance(point[0], bool) or not isinstance(point[0], (int, float)) or not math.isfinite(point[0]) or point[0] < 0 or point[0] <= previous_t:
                        errors.append(f"figures.json M2: point {n + 1} needs an increasing finite time")
                        continue
                    t = point[0]
                    previous_t = t
                    numeric(point[1], 0.75 * t * math.sin(2 * t), errors, f"M2 point {n + 1}", 0.02)
        if lid == "M3":
            points = fig.get("points")
            if not isinstance(points, list):
                errors.append("figures.json M3: missing phase points")
            else:
                if len(points) < 10:
                    errors.append("figures.json M3: need at least 10 trajectory points")
                for t in (0, 0.5, 1, 2):
                    hit = next((p for p in points if isinstance(p, dict) and
                                isinstance(p.get("t"), (int, float)) and
                                abs(p["t"] - t) < 1e-9), None)
                    if hit is None:
                        errors.append(f"figures.json M3: missing point at t={t}")
                previous_t = -math.inf
                for n, point in enumerate(points):
                    t = point.get("t") if isinstance(point, dict) else None
                    if isinstance(t, bool) or not isinstance(t, (int, float)) or not math.isfinite(t) or t < 0 or t <= previous_t:
                        errors.append(f"figures.json M3: point {n + 1} needs an increasing finite time")
                        continue
                    previous_t = t
                    numeric(point.get("x1"), math.exp(-2 * t) * (1 + 3 * t),
                            errors, f"M3 x1 at point {n + 1}", 0.02)
                    numeric(point.get("x2"), math.exp(-2 * t), errors,
                            f"M3 x2 at point {n + 1}", 0.02)
        if lid in ("S2", "S3"):
            nodes, edges = fig.get("nodes"), fig.get("edges")
            if not isinstance(nodes, list) or not isinstance(edges, list):
                errors.append(f"figures.json {lid}: flow needs nodes and edges")
                continue
            ids = {n.get("id") for n in nodes if isinstance(n, dict) and
                   substantial(n.get("id"), 1) and substantial(n.get("label"), 2)}
            required = ({"client", "gateway", "policy", "cache", "router", "provider", "validation", "telemetry"}
                        if lid == "S2" else {"tenant_a", "tenant_b", "key_a", "key_b", "cache"})
            if not required <= ids:
                errors.append(f"figures.json {lid}: missing labeled nodes {sorted(required - ids)}")
            pairs = {(e.get("from"), e.get("to")) for e in edges if isinstance(e, dict)
                     and e.get("from") in ids and e.get("to") in ids and
                     substantial(e.get("label"), 2)}
            required_edges = ({("client", "gateway"), ("gateway", "policy"),
                               ("policy", "cache"), ("cache", "router"),
                               ("cache", "validation"),
                               ("router", "provider"), ("provider", "validation"),
                               ("validation", "telemetry"), ("telemetry", "client")}
                              if lid == "S2" else {("tenant_a", "key_a"),
                                                    ("tenant_b", "key_b"),
                                                    ("key_a", "cache"), ("key_b", "cache")})
            if not required_edges <= pairs:
                errors.append(f"figures.json {lid}: missing explained edges {sorted(required_edges - pairs)}")


def check_items(root: Path, errors: list[str]):
    questions = load_json(root / "questions.json", errors)
    practice = load_json(root / "practice.json", errors)
    if not isinstance(questions, list) or not isinstance(practice, list):
        return
    qids = set()
    for lid in IDS:
        items = [q for q in questions if isinstance(q, dict) and q.get("lesson") == lid]
        minimum = 3 if lid in ("M2", "M3", "S2", "S4") else 2
        if len(items) < minimum:
            errors.append(f"questions.json {lid}: need at least {minimum} questions")
        kinds = [q.get("type") for q in items]
        if len(kinds) != len(set(kinds)):
            errors.append(f"questions.json {lid}: question types repeat")
    for collection, items in (("questions.json", questions), ("practice.json", practice)):
        for n, item in enumerate(items):
            where = f"{collection} item {n + 1}"
            if not isinstance(item, dict) or item.get("lesson") not in IDS:
                errors.append(f"{where}: invalid lesson")
                continue
            if collection == "questions.json":
                if not substantial(item.get("id"), 3) or item["id"] in qids:
                    errors.append(f"{where}: duplicate or missing id")
                else:
                    qids.add(item["id"])
            for field, minimum in (("type", 3), ("concept", 3), ("prompt", 45),
                                   ("answer", 45), ("feedback", 60)):
                if not substantial(item.get(field), minimum):
                    errors.append(f"{where}: {field} needs complete content")
            source_ids(item.get("source_ids"), errors, where)
    for lid in ("M2", "M3", "S2", "S4"):
        if not any(isinstance(v, dict) and v.get("lesson") == lid for v in practice):
            errors.append(f"practice.json {lid}: missing variant")
    for n, item in enumerate(practice):
        if not isinstance(item, dict):
            continue
        if item.get("variant_of") not in qids:
            errors.append(f"practice.json item {n + 1}: variant_of is not a question id")
        if not substantial(item.get("changed_surface"), 25):
            errors.append(f"practice.json item {n + 1}: explain changed surface")


def check_oracles(root: Path, errors: list[str]):
    checks = load_json(root / "checks.json", errors)
    if isinstance(checks, dict):
        for group, fields in NUMBER_ORACLE.items():
            got = checks.get(group, {})
            for key, expected in fields.items():
                numeric(got.get(key) if isinstance(got, dict) else None,
                        expected, errors, f"checks.json {group}.{key}")
        system = checks.get("systems", {})
        for key, expected in BOOLEAN_ORACLE.items():
            if not isinstance(system, dict) or system.get(key) is not expected:
                errors.append(f"checks.json systems.{key}: incorrect boolean")
    audit = load_json(root / "audit.json", errors)
    if isinstance(audit, dict):
        for key, expected in AUDIT.items():
            item = audit.get(key)
            if not isinstance(item, dict) or item.get("label") != expected:
                errors.append(f"audit.json {key}: incorrect or missing label")
            elif not substantial(item.get("reason"), 35):
                errors.append(f"audit.json {key}: reason is too thin")
    path = root / "self_audit.md"
    try:
        body = path.read_text(encoding="utf-8")
    except (OSError, UnicodeError):
        errors.append("self_audit.md: missing or unreadable")
    else:
        if len(re.findall(r"\b[\w'-]+\b", body)) < 180:
            errors.append("self_audit.md: needs concrete checking notes")
        for lid in IDS:
            if not re.search(rf"\b{lid}\b", body):
                errors.append(f"self_audit.md: missing {lid} risk/check")


def check_review(path: Path | None, errors: list[str]):
    if path is None:
        return False
    review = load_json(path, errors)
    if not isinstance(review, dict):
        return True
    for key in REVIEW:
        item = review.get(key)
        if not isinstance(item, dict) or item.get("pass") is not True or not substantial(item.get("evidence"), 25):
            errors.append(f"review.json {key}: not passed with specific evidence")
    return True


def check_submission(root: Path, review_path: Path | None = None):
    errors = []
    check_plan(root, errors)
    check_lessons(root, errors)
    check_figures(root, errors)
    check_items(root, errors)
    check_oracles(root, errors)
    mechanical = list(errors)
    reviewed = check_review(review_path, errors)
    return mechanical, errors, reviewed


def self_test():
    """Exercise both a passing mechanical fixture and a changed-answer failure."""
    with tempfile.TemporaryDirectory() as temp:
        root = Path(temp)
        (root / "lessons").mkdir()
        (root / "plan.json").write_text(json.dumps({
            "title": "A mechanical checker fixture",
            "lessons": [{"id": lid, "title": f"Lesson {lid}", "concept": f"concept-{lid}",
                         "prerequisites": (["M1"] if lid in ("M2", "M3", "M4") else
                                           ["S1", "S2", "S3"][:IDS.index(lid)-4] if lid in ("S2", "S3", "S4") else []),
                         "source_ids": [lid], "later_use": []} for lid in IDS]
        }), encoding="utf-8")
        for lid in IDS:
            body = f"# {lid}: Fixture\n" + "\n".join(
                f"## {heading}\n{lid} Figure {lid} " +
                (("M1 " if lid[0] == "M" else "S1 ") if heading == "Connections" else "") +
                ("teaching " * 100)
                for heading in HEADINGS
            )
            (root / "lessons" / f"{lid}.md").write_text(body, encoding="utf-8")
        figures = {
            "M2": {"kind": "plot", "alt": "A plotted resonant response over time with its increasing envelope",
                   "inference": "The oscillations rise within an envelope that grows with time in the ideal model.",
                   "x_label": "t", "y_label": "x", "series": [{"name": "resonant", "points":
                   [[t, .75*t*math.sin(2*t)] for t in [n / 4 for n in range(25)]]}]},
            "M3": {"kind": "phase", "alt": "A trajectory moves toward the origin and approaches the eigenline",
                   "inference": "The trajectory bends toward the eigenline as both coordinates decay with time.",
                   "x_label": "x1", "y_label": "x2", "points": [
                       {"t": t, "x1": math.exp(-2*t)*(1+3*t), "x2": math.exp(-2*t)}
                       for t in [n / 8 for n in range(17)]],
                   },
        }
        for lid in ("S2", "S3"):
            names = (["client", "gateway", "policy", "cache", "router", "provider", "validation", "telemetry"]
                     if lid == "S2" else ["tenant_a", "tenant_b", "key_a", "key_b", "cache"])
            pairs = ([('client','gateway'),('gateway','policy'),('policy','cache'),
                      ('cache','router'),('cache','validation'),('router','provider'),('provider','validation'),
                      ('validation','telemetry'),('telemetry','client')]
                     if lid == "S2" else [('tenant_a','key_a'),('tenant_b','key_b'),('key_a','cache'),('key_b','cache')])
            figures[lid] = {"kind": "flow", "alt": "The flow shows every decision and trust boundary between the nodes",
                            "inference": "Following the arrows reveals which requests can reach the provider or a scoped cache entry.",
                            "nodes": [{"id": n, "label": n} for n in names],
                            "edges": [{"from": a, "to": b, "label": "request path"} for a,b in pairs]}
        (root / "figures.json").write_text(json.dumps(figures), encoding="utf-8")
        questions = [{"id": f"{lid}-q{i}", "lesson": lid, "type": f"type-{i}",
                      "concept": f"concept-{lid}", "prompt": "A complete self-contained question " * 3,
                      "answer": "A complete answer worked independently " * 3,
                      "feedback": "This wrong step is tempting because it resembles the prior case; check the changed condition. " * 2,
                      "source_ids": [lid]}
                     for lid in IDS for i in range(3)]
        (root / "questions.json").write_text(json.dumps(questions), encoding="utf-8")
        practice = [{**questions[IDS.index(lid)*3], "variant_of": f"{lid}-q0",
                     "changed_surface": "The numbers and setting change while the response skill remains identical."}
                    for lid in ("M2", "M3", "S2", "S4")]
        (root / "practice.json").write_text(json.dumps(practice), encoding="utf-8")
        checks = {group: dict(values) for group, values in NUMBER_ORACLE.items()}
        checks["systems"].update(BOOLEAN_ORACLE)
        (root / "checks.json").write_text(json.dumps(checks), encoding="utf-8")
        (root / "audit.json").write_text(json.dumps({k: {"label": v, "reason":
            "The source packet and a separate calculation establish this classification."} for k,v in AUDIT.items()}), encoding="utf-8")
        (root / "self_audit.md").write_text(" ".join(IDS) + " checked source and calculation " * 50,
                                            encoding="utf-8")
        mechanical, _, _ = check_submission(root)
        assert not mechanical, mechanical
        review = root / "review.json"
        review.write_text(json.dumps({key: {"pass": True,
            "evidence": "Inspected M2 and S4 in the temporary checker fixture."}
            for key in REVIEW}), encoding="utf-8")
        mechanical, all_errors, reviewed = check_submission(root, review)
        assert reviewed and not mechanical and not all_errors, all_errors
        review.write_text(json.dumps({key: {"pass": key != "math_steps",
            "evidence": "Inspected M2 and S4 in the temporary checker fixture."}
            for key in REVIEW}), encoding="utf-8")
        _, all_errors, _ = check_submission(root, review)
        assert any("review.json math_steps" in e for e in all_errors), all_errors
        checks["math"]["resonant_t_sin_coefficient"] = 1.0
        (root / "checks.json").write_text(json.dumps(checks), encoding="utf-8")
        mechanical, _, _ = check_submission(root)
        assert any("resonant_t_sin_coefficient" in e for e in mechanical), mechanical
    print("checker self-test passed")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--self-test":
        self_test()
        raise SystemExit(0)
    args = sys.argv[1:]
    review_path = None
    if "--review" in args:
        n = args.index("--review")
        if n + 1 >= len(args):
            raise SystemExit("--review needs a JSON path")
        review_path = Path(args[n + 1])
        del args[n:n + 2]
    if len(args) > 1:
        raise SystemExit("usage: check.py [submission_dir] [--review review.json]")
    folder = Path(args[0]) if args else Path(__file__).parent / "submission"
    mechanical, errors, reviewed = check_submission(folder, review_path)
    for issue in errors:
        print(f"FAIL: {issue}")
    if mechanical:
        print(f"MECHANICAL FAIL ({len(mechanical)} issues)")
        raise SystemExit(1)
    print("MECHANICAL PASS")
    if not reviewed:
        print("HUMAN REVIEW PENDING: use REVIEW.md and write validation/review.json")
        raise SystemExit(0)
    if errors:
        print("REVIEW FAIL")
        raise SystemExit(1)
    print("PASS SAMPLE")
