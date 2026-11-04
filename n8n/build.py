#!/usr/bin/env python3
"""
Build the importable n8n workflow for the PolicyPlan 187 letter.

    python3 n8n/build.py                      # -> n8n/policyplan-187-letter.json (ATLAS placeholders)
    python3 n8n/build.py --atlas-from X.json  # copy ATLAS-1/ATLAS-2 nodes from a PolicyReview export

The ATLAS prompts and parsers are not stored in this repo. Either build with
--atlas-from, or import the placeholder version and paste them in n8n.
"""
import argparse
import json
import pathlib
import uuid

HERE = pathlib.Path(__file__).resolve().parent
SRC = HERE / "src"

# Nodes copied from the PolicyReview workflow, by name. Kept verbatim so the
# ATLAS chain behaves exactly as it does in PolicyReview.
ATLAS_NODES = [
    "Sanitized Text1",
    "Technical Extraction1",
    "OpenAI Chat Model1",
    "Calculator46",
    "Atlas Parser1",
    "Light Middleware Atlas Parsed",
    "Contextual Quotes1",
    "OpenAI 4o5",
    "01 ATLAS-2 Parse + Validate",
    "Merge2",
    "Atlas Evidence Envelope",
]

POSITIONS = {
    "PolicyPlan Intake": [0, 300],
    "Has illustration?": [220, 300],
    "Sanitized Text1": [440, 200],
    "Technical Extraction1": [680, 380],
    "OpenAI Chat Model1": [620, 580],
    "Calculator46": [780, 580],
    "Atlas Parser1": [980, 380],
    "Light Middleware Atlas Parsed": [1200, 380],
    "Contextual Quotes1": [680, 0],
    "OpenAI 4o5": [680, 180],
    "01 ATLAS-2 Parse + Validate": [1200, 0],
    "Merge2": [1420, 200],
    "Atlas Evidence Envelope": [1640, 200],
    "187 Context Prep": [1860, 200],
    "187 Letter Writer": [2080, 200],
    "OpenAI Sol": [2080, 400],
    "187 Letter QA": [2380, 200],
    "No illustration": [440, 520],
    "Post to PolicyPlan": [2620, 300],
}


def nid():
    return str(uuid.uuid4())


def placeholder(name):
    """Minimal stand-ins with the right type, so connections import cleanly."""
    if name == "Sanitized Text1":
        return {
            "parameters": {
                "assignments": {
                    "assignments": [
                        {"id": nid(), "name": "sanitizedText", "value": "={{ $json.body.illustration_text }}", "type": "string"}
                    ]
                },
                "options": {},
            },
            "type": "n8n-nodes-base.set",
            "typeVersion": 3.4,
        }
    if name in ("Technical Extraction1", "Contextual Quotes1"):
        which = "ATLAS-1" if name == "Technical Extraction1" else "ATLAS-2"
        return {
            "parameters": {
                "promptType": "define",
                "text": "={{ $json.sanitizedText }}",
                "options": {"systemMessage": f"PASTE THE {which} SYSTEM PROMPT AND USER MESSAGE FROM THE POLICYREVIEW WORKFLOW ({name})."},
            },
            "type": "@n8n/n8n-nodes-langchain.agent",
            "typeVersion": 1.6,
            "retryOnFail": True,
            "maxTries": 5,
            "waitBetweenTries": 5000,
        }
    if name in ("OpenAI Chat Model1", "OpenAI 4o5"):
        return {
            "parameters": {"model": {"__rl": True, "value": "gpt-6-sol", "mode": "list", "cachedResultName": "gpt-6-sol"}, "options": {}},
            "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi",
            "typeVersion": 1.3,
        }
    if name == "Calculator46":
        return {"parameters": {}, "type": "@n8n/n8n-nodes-langchain.toolCalculator", "typeVersion": 1}
    if name == "Merge2":
        return {"parameters": {}, "type": "n8n-nodes-base.merge", "typeVersion": 3.2}
    return {
        "parameters": {"jsCode": f"throw new Error('Paste the \"{name}\" code from the PolicyReview workflow.');"},
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
    }


def build(atlas_from):
    src_nodes = {}
    if atlas_from:
        text = pathlib.Path(atlas_from).read_text()
        start = text.index("{")
        export = json.JSONDecoder().raw_decode(text[start:])[0]
        src_nodes = {n["name"]: n for n in export["nodes"]}
        missing = [n for n in ATLAS_NODES if n not in src_nodes]
        if missing:
            raise SystemExit(f"export is missing nodes: {missing}")

    nodes = []

    def add(name, node):
        node = {k: v for k, v in node.items() if k not in ("id", "name", "position", "webhookId")}
        node.update({"id": nid(), "name": name, "position": POSITIONS[name]})
        nodes.append(node)
        return node

    add("PolicyPlan Intake", {
        "parameters": {
            "httpMethod": "POST",
            "path": "policyplan-letter",
            "authentication": "headerAuth",
            "responseMode": "onReceived",
            "options": {},
        },
        "type": "n8n-nodes-base.webhook",
        "typeVersion": 2,
        "webhookId": nid(),
        "credentials": {"httpHeaderAuth": {"id": "", "name": "PolicyPlan webhook auth"}},
    })
    nodes[-1]["webhookId"] = nid()

    add("Has illustration?", {
        "parameters": {
            "conditions": {
                "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "loose"},
                "conditions": [{
                    "id": nid(),
                    "leftValue": "={{ $json.body.illustration_text }}",
                    "rightValue": "",
                    "operator": {"type": "string", "operation": "notEmpty", "singleValue": True},
                }],
                "combinator": "and",
            },
            "options": {},
        },
        "type": "n8n-nodes-base.if",
        "typeVersion": 2,
    })

    for name in ATLAS_NODES:
        node = json.loads(json.dumps(src_nodes[name])) if name in src_nodes else placeholder(name)
        if name == "Sanitized Text1":
            # PolicyReview reads body.extractedText; PolicyPlan sends body.illustration_text.
            node["parameters"]["assignments"]["assignments"][0]["value"] = "={{ $json.body.illustration_text }}"
        add(name, node)

    add("187 Context Prep", {
        "parameters": {"jsCode": (SRC / "187-context-prep.js").read_text()},
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
    })
    add("187 Letter Writer", {
        "parameters": {
            "promptType": "define",
            "text": "={{ $json.letterUserMessage }}",
            "options": {"systemMessage": (SRC / "187-letter-writer.system.md").read_text()},
        },
        "type": "@n8n/n8n-nodes-langchain.agent",
        "typeVersion": 1.6,
        "retryOnFail": True,
        "maxTries": 3,
        "waitBetweenTries": 5000,
        "onError": "continueRegularOutput",
    })
    model = {
        "parameters": {
            "model": {"__rl": True, "value": "gpt-6.1-sol", "mode": "list", "cachedResultName": "gpt-6.1-sol"},
            "options": {},
        },
        "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi",
        "typeVersion": 1.3,
    }
    cred = (src_nodes.get("OpenAI Chat Model1") or {}).get("credentials")
    if cred:
        model["credentials"] = cred
    add("OpenAI Sol", model)
    add("187 Letter QA", {
        "parameters": {"jsCode": (SRC / "187-letter-qa.js").read_text()},
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
    })
    add("No illustration", {
        "parameters": {"jsCode": (
            "const b = $('PolicyPlan Intake').first().json.body || {};\n"
            "return [{ json: { callback: { status: 'error', output_id: b.output_id, "
            "workflow_version: 'policyplan-187-letter/1.0.0', error: 'no_illustration' } } }];"
        )},
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
    })
    add("Post to PolicyPlan", {
        "parameters": {
            "method": "POST",
            "url": "={{ $('PolicyPlan Intake').first().json.body.callback_url }}",
            "sendHeaders": True,
            "headerParameters": {"parameters": [
                {"name": "policyplan-callback-auth", "value": "={{ $vars.POLICYPLAN_CALLBACK_SECRET }}"},
                {"name": "Content-Type", "value": "application/json"},
            ]},
            "sendBody": True,
            "specifyBody": "json",
            "jsonBody": "={{ JSON.stringify($json.callback) }}",
            "options": {},
        },
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2,
        "retryOnFail": True,
        "maxTries": 3,
        "waitBetweenTries": 3000,
    })

    def main(*targets):
        return {"main": [[{"node": t, "type": "main", "index": i} for t, i in targets]]}

    connections = {
        "PolicyPlan Intake": main(("Has illustration?", 0)),
        "Has illustration?": {"main": [
            [{"node": "Sanitized Text1", "type": "main", "index": 0}],
            [{"node": "No illustration", "type": "main", "index": 0}],
        ]},
        "Sanitized Text1": main(("Technical Extraction1", 0), ("Contextual Quotes1", 0)),
        "OpenAI Chat Model1": {"ai_languageModel": [[{"node": "Technical Extraction1", "type": "ai_languageModel", "index": 0}]]},
        "Calculator46": {"ai_tool": [[{"node": "Technical Extraction1", "type": "ai_tool", "index": 0}]]},
        "Technical Extraction1": main(("Atlas Parser1", 0)),
        "Atlas Parser1": main(("Light Middleware Atlas Parsed", 0)),
        "Light Middleware Atlas Parsed": main(("Merge2", 1)),
        "OpenAI 4o5": {"ai_languageModel": [[{"node": "Contextual Quotes1", "type": "ai_languageModel", "index": 0}]]},
        "Contextual Quotes1": main(("01 ATLAS-2 Parse + Validate", 0)),
        "01 ATLAS-2 Parse + Validate": main(("Merge2", 0)),
        "Merge2": main(("Atlas Evidence Envelope", 0)),
        "Atlas Evidence Envelope": main(("187 Context Prep", 0)),
        "187 Context Prep": main(("187 Letter Writer", 0)),
        "OpenAI Sol": {"ai_languageModel": [[{"node": "187 Letter Writer", "type": "ai_languageModel", "index": 0}]]},
        "187 Letter Writer": main(("187 Letter QA", 0)),
        "187 Letter QA": main(("Post to PolicyPlan", 0)),
        "No illustration": main(("Post to PolicyPlan", 0)),
    }

    return {
        "name": "PolicyPlan 187 Letter",
        "nodes": nodes,
        "connections": connections,
        "pinData": {},
        "settings": {"executionOrder": "v1"},
        "meta": {"templateCredsSetupCompleted": False},
    }


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--atlas-from", help="PolicyReview workflow export (JSON) to copy ATLAS nodes from")
    ap.add_argument("--out", default=str(HERE / "policyplan-187-letter.json"))
    a = ap.parse_args()
    wf = build(a.atlas_from)
    pathlib.Path(a.out).write_text(json.dumps(wf, indent=2) + "\n")
    print(f"wrote {a.out} ({len(wf['nodes'])} nodes)")
