#!/usr/bin/env python3
"""
Build the importable n8n workflow for the PolicyPlan Illustration Companion.

    python3 n8n/companion/build.py                      # -> n8n/companion/policyplan-companion-v1.json (ATLAS placeholders)
    python3 n8n/companion/build.py --atlas-from X.json  # copy the ATLAS nodes from a workflow export

This is a NEW, separate workflow (webhook path policyplan-companion). It never
modifies the PolicyReview, PolicyMatch or Reg 187 letter workflows; the ATLAS
nodes are copied, not shared. The ATLAS prompts and parsers are not stored in
this repo: build with --atlas-from (for example the 187 letter export that
already contains them), or paste them into the placeholders in n8n.

The workflow is built inactive. Activation is a manual step (see the runbook).
"""
import argparse
import json
import pathlib
import uuid

HERE = pathlib.Path(__file__).resolve().parent
SRC = HERE / "src"
PROMPTS = HERE / "prompts"
WORKFLOW_NAME = "PolicyPlan Companion v1"
MODEL = "gpt-6.1-sol"

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
# Copied nodes that can fail; their error output posts status=error to the app.
FAIL_CLOSED = ["Technical Extraction1", "Atlas Parser1", "Light Middleware Atlas Parsed", "Contextual Quotes1", "01 ATLAS-2 Parse + Validate", "Atlas Evidence Envelope"]

POSITIONS = {
    "Companion Intake": [0, 400],
    "Companion Gate": [220, 400],
    "Stage": [440, 400],
    "Sanitized Text1": [680, 160],
    "Technical Extraction1": [920, 300],
    "OpenAI Chat Model1": [860, 500],
    "Calculator46": [1020, 500],
    "Atlas Parser1": [1220, 300],
    "Light Middleware Atlas Parsed": [1440, 300],
    "Contextual Quotes1": [920, -80],
    "OpenAI 4o5": [920, 100],
    "01 ATLAS-2 Parse + Validate": [1440, -80],
    "Merge2": [1660, 120],
    "Atlas Evidence Envelope": [1880, 120],
    "Extract Result": [2100, 120],
    "Companion Analyst": [680, 760],
    "OpenAI Analyst": [680, 960],
    "Companion Writer": [960, 760],
    "OpenAI Writer": [960, 960],
    "Writer Check": [1220, 760],
    "Writer OK?": [1440, 760],
    "Companion Writer Retry": [1660, 900],
    "OpenAI Writer Retry": [1660, 1100],
    "Write Result": [1900, 760],
    "Stage Failed": [2100, 520],
    "Prepare Callback": [2340, 400],
    "Sign Callback": [2560, 400],
    "Post to PolicyPlan": [2780, 400],
}


def nid():
    return str(uuid.uuid4())


def code(path):
    return {"parameters": {"jsCode": (SRC / path).read_text()}, "type": "n8n-nodes-base.code", "typeVersion": 2}


def model(cred):
    m = {
        "parameters": {"model": {"__rl": True, "value": MODEL, "mode": "list", "cachedResultName": MODEL}, "options": {}},
        "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi",
        "typeVersion": 1.3,
    }
    if cred:
        m["credentials"] = cred
    return m


def agent(text, prompt_file, on_error):
    return {
        "parameters": {"promptType": "define", "text": text, "options": {"systemMessage": (PROMPTS / prompt_file).read_text()}},
        "type": "@n8n/n8n-nodes-langchain.agent",
        "typeVersion": 1.6,
        "retryOnFail": True,
        "maxTries": 2,
        "waitBetweenTries": 5000,
        "onError": on_error,
    }


def placeholder(name):
    if name == "Sanitized Text1":
        return {
            "parameters": {"assignments": {"assignments": [{"id": nid(), "name": "sanitizedText", "value": "", "type": "string"}]}, "options": {}},
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
        return model(None) | {"parameters": {"model": {"__rl": True, "value": "gpt-6-sol", "mode": "list", "cachedResultName": "gpt-6-sol"}, "options": {}}}
    if name == "Calculator46":
        return {"parameters": {}, "type": "@n8n/n8n-nodes-langchain.toolCalculator", "typeVersion": 1}
    if name == "Merge2":
        return {"parameters": {}, "type": "n8n-nodes-base.merge", "typeVersion": 3.2}
    return {"parameters": {"jsCode": f"throw new Error('Paste the \"{name}\" code from the PolicyReview workflow.');"}, "type": "n8n-nodes-base.code", "typeVersion": 2}


def build(atlas_from):
    src_nodes = {}
    if atlas_from:
        text = pathlib.Path(atlas_from).read_text()
        export = json.JSONDecoder().raw_decode(text[text.index("{"):])[0]
        src_nodes = {n["name"]: n for n in export["nodes"]}
        missing = [n for n in ATLAS_NODES if n not in src_nodes]
        if missing:
            raise SystemExit(f"export is missing nodes: {missing}")
    cred = (src_nodes.get("OpenAI Chat Model1") or {}).get("credentials")

    nodes = []

    def add(name, node):
        node = {k: v for k, v in node.items() if k not in ("id", "name", "position", "webhookId")}
        node.update({"id": nid(), "name": name, "position": POSITIONS[name]})
        nodes.append(node)
        return node

    intake = add("Companion Intake", {
        "parameters": {"httpMethod": "POST", "path": "policyplan-companion", "authentication": "headerAuth", "responseMode": "onReceived", "options": {}},
        "type": "n8n-nodes-base.webhook",
        "typeVersion": 2,
        "credentials": {"httpHeaderAuth": {"id": "", "name": "PolicyPlan webhook auth"}},
    })
    intake["webhookId"] = nid()
    add("Companion Gate", code("companion-gate.js"))
    add("Stage", {
        "parameters": {
            "conditions": {
                "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict"},
                "conditions": [{"id": nid(), "leftValue": "={{ $json.stage }}", "rightValue": "extract", "operator": {"type": "string", "operation": "equals"}}],
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
            node["parameters"]["assignments"]["assignments"][0]["value"] = "={{ $('Companion Gate').first().json.illustration_text }}"
        if name in FAIL_CLOSED:
            node["onError"] = "continueErrorOutput"
        add(name, node)

    add("Extract Result", code("extract-result.js"))
    add("Companion Analyst", agent("={{ JSON.stringify($('Companion Gate').first().json.analyst_input) }}", "companion_analyst.v1.md", "continueRegularOutput"))
    add("OpenAI Analyst", model(cred))
    add("Companion Writer", agent("={{ JSON.stringify($('Companion Gate').first().json.writer_input) }}", "companion_writer.v1.md", "continueErrorOutput"))
    add("OpenAI Writer", model(cred))
    add("Writer Check", code("writer-check.js"))
    add("Writer OK?", {
        "parameters": {
            "conditions": {
                "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict"},
                "conditions": [{"id": nid(), "leftValue": "={{ $json.valid }}", "rightValue": True, "operator": {"type": "boolean", "operation": "true", "singleValue": True}}],
                "combinator": "and",
            },
            "options": {},
        },
        "type": "n8n-nodes-base.if",
        "typeVersion": 2,
    })
    add("Companion Writer Retry", agent(
        "={{ 'Your previous answer was rejected (' + $json.reason + '). Follow the output rules exactly and return only the JSON object for this input:\\n' + JSON.stringify($('Companion Gate').first().json.writer_input) }}",
        "companion_writer.v1.md",
        "continueErrorOutput",
    ))
    add("OpenAI Writer Retry", model(cred))
    add("Write Result", code("write-result.js"))
    add("Stage Failed", code("stage-failed.js"))
    add("Prepare Callback", code("prepare-callback.js"))
    add("Sign Callback", {
        "parameters": {
            "action": "hmac",
            "type": "SHA256",
            "value": "={{ $json.signing_input }}",
            "dataPropertyName": "signature",
            "secret": "={{ $vars.COMPANION_CALLBACK_SECRET }}",
            "encoding": "hex",
        },
        "type": "n8n-nodes-base.crypto",
        "typeVersion": 1,
    })
    add("Post to PolicyPlan", {
        "parameters": {
            "method": "POST",
            "url": "={{ $json.url }}",
            "sendHeaders": True,
            "headerParameters": {"parameters": [
                {"name": "x-companion-timestamp", "value": "={{ $json.ts }}"},
                {"name": "x-companion-signature", "value": "={{ $json.signature }}"},
            ]},
            "sendBody": True,
            "contentType": "raw",
            "rawContentType": "application/json",
            "body": "={{ $json.raw }}",
            "options": {"timeout": 30000},
        },
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2,
        "retryOnFail": True,
        "maxTries": 3,
        "waitBetweenTries": 3000,
        "onError": "continueRegularOutput",
    })

    def to(*targets):
        return [{"node": t, "type": "main", "index": i} for t, i in targets]

    def ai(kind, target):
        return {kind: [[{"node": target, "type": kind, "index": 0}]]}

    FAILED = ("Stage Failed", 0)
    c = {
        "Companion Intake": {"main": [to(("Companion Gate", 0))]},
        "Companion Gate": {"main": [to(("Stage", 0))]},
        "Stage": {"main": [to(("Sanitized Text1", 0)), to(("Companion Analyst", 0))]},
        # extract
        "Sanitized Text1": {"main": [to(("Technical Extraction1", 0), ("Contextual Quotes1", 0))]},
        "OpenAI Chat Model1": ai("ai_languageModel", "Technical Extraction1"),
        "Calculator46": ai("ai_tool", "Technical Extraction1"),
        "Technical Extraction1": {"main": [to(("Atlas Parser1", 0)), to(FAILED)]},
        "Atlas Parser1": {"main": [to(("Light Middleware Atlas Parsed", 0)), to(FAILED)]},
        "Light Middleware Atlas Parsed": {"main": [to(("Merge2", 1)), to(FAILED)]},
        "OpenAI 4o5": ai("ai_languageModel", "Contextual Quotes1"),
        "Contextual Quotes1": {"main": [to(("01 ATLAS-2 Parse + Validate", 0)), to(FAILED)]},
        "01 ATLAS-2 Parse + Validate": {"main": [to(("Merge2", 0)), to(FAILED)]},
        "Merge2": {"main": [to(("Atlas Evidence Envelope", 0))]},
        "Atlas Evidence Envelope": {"main": [to(("Extract Result", 0)), to(FAILED)]},
        "Extract Result": {"main": [to(("Prepare Callback", 0))]},
        # write
        "OpenAI Analyst": ai("ai_languageModel", "Companion Analyst"),
        "Companion Analyst": {"main": [to(("Companion Writer", 0))]},
        "OpenAI Writer": ai("ai_languageModel", "Companion Writer"),
        "Companion Writer": {"main": [to(("Writer Check", 0)), to(FAILED)]},
        "Writer Check": {"main": [to(("Writer OK?", 0))]},
        "Writer OK?": {"main": [to(("Write Result", 0)), to(("Companion Writer Retry", 0))]},
        "OpenAI Writer Retry": ai("ai_languageModel", "Companion Writer Retry"),
        "Companion Writer Retry": {"main": [to(("Write Result", 0)), to(FAILED)]},
        "Write Result": {"main": [to(("Prepare Callback", 0))]},
        "Stage Failed": {"main": [to(("Prepare Callback", 0))]},
        "Prepare Callback": {"main": [to(("Sign Callback", 0))]},
        "Sign Callback": {"main": [to(("Post to PolicyPlan", 0))]},
    }

    return {
        "name": WORKFLOW_NAME,
        "nodes": nodes,
        "connections": c,
        "active": False,
        "pinData": {},
        "settings": {"executionOrder": "v1", "saveDataErrorExecution": "all", "saveDataSuccessExecution": "none", "saveManualExecutions": True},
        "meta": {"templateCredsSetupCompleted": False},
        "tags": [],
    }


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--atlas-from", help="workflow export (JSON) to copy the ATLAS nodes from")
    ap.add_argument("--out", default=str(HERE / "policyplan-companion-v1.json"))
    a = ap.parse_args()
    wf = build(a.atlas_from)
    pathlib.Path(a.out).write_text(json.dumps(wf, indent=2) + "\n")
    print(f"wrote {a.out} ({len(wf['nodes'])} nodes)")
