#!/usr/bin/env python3
"""
placeholder_gen.py - CLI placeholder asset generator via ComfyUI API.

============================================================================
AGENT INSTRUCTIONS (read this if you are an AI agent):
- GOAL: generate a game placeholder sprite image from a text prompt.
- PREREQ: ComfyUI must be running (default http://127.0.0.1:8188).
  If connection fails, tell the user: "Start ComfyUI with: python main.py --listen 127.0.0.1 --port 8188".
- BASIC USE (external workflow 64x64_sprite_generator.json, no --workflow flag needed):
    python placeholder_gen.py --prompt "a red cat" --out ./cat.png
- SIZE: default 64px. For tiny 32px sprites:
    python placeholder_gen.py --prompt "a red cat" --out ./cat32.png --size 32
  (--size sets node 83 PrimitiveInt "RESOLUTION HERE"; latent/crop/output
    derive from it via node 85 (a*8), so 32, 64 and 128 are supported.
    128 needs ~1024px latent/diffusion + more VRAM/time.)
- BIG SPRITE (pot etc): python placeholder_gen.py --prompt "a cauldron" --out ./pot.png --size 128
- The script auto-injects --prompt into node 75 (PrimitiveString "PROMPT/SUBJECT HERE")
  and preserves the suffix in node 74 (", pixel art, flat color background, sprite...").
- It randomizes KSampler seed (node 3) every run unless --seed is given.
- Negative prompt is fixed inside the workflow (node 10). Override with --negative "…".
- OUTPUT: script prints "Queued: <id>" then "Saved -> <path>". The image at --out is the result.
  Read that file to verify.
- CUSTOM WORKFLOW: python placeholder_gen.py --workflow other_api.json --prompt "…" --out ./x.png
  (custom file must be ComfyUI "Save (API Format)" JSON, NOT regular Save JSON.)
- REMOTE SERVER: add --server http://<ip>:8188
- OVERRIDES: --set "83.inputs.value=32" --set "3.inputs.steps=16" (repeatable, NODE.inputs.KEY=VALUE)
  Tip: prefer --size 32 over --set for resolution; use --set for anything else.
- EXIT CODES: 0 = saved, nonzero + stderr message = failed (ComfyUI down, missing model, timeout).
============================================================================

Setup in ComfyUI (humans):
  1. Build workflow in ComfyUI UI.
  2. Gear icon -> enable Dev mode Options -> Save (API Format) -> 64x64_sprite_generator.json
  3. Run ComfyUI, then use this script. Workflow is loaded from the
     external JSON file (default: 64x64_sprite_generator.json next to this script).

How it works: POST /prompt -> poll GET /history/{prompt_id} -> GET /view image -> save.
Requires: ComfyUI + models listed in 64x64_sprite_generator.json (ckpt, LoRA, RMBG-2.0).
Workflow nodes that matter: 75 prompt -> 74 style suffix -> 7 positive | 10 negative;
83 RESOLUTION (32|64) -> 85 (x8 latent px) -> 8 latent, 69 crop, 34 output resize;
3 KSampler -> 5 decode -> 51 RMBG -> ... -> 34 -> 80 SaveImage.
Stdlib only, no pip install needed.
"""
import argparse, json, sys, time, uuid, random
import urllib.request, urllib.parse, os

# External workflow file (ComfyUI "Save (API Format)" JSON, NOT regular Save JSON).
# Default: 64x64_sprite_generator.json sitting next to this script.
DEFAULT_WORKFLOW = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                "64x64_sprite_generator.json")

def parse_set(s):
    try:
        left, value = s.split("=", 1)
        node_id, rest = left.split(".", 1)
        _, key = rest.split(".", 1)
        try:
            value = json.loads(value)
        except Exception:
            pass
        return node_id, key, value
    except ValueError:
        raise argparse.ArgumentTypeError(f"--set must look like NODE.inputs.KEY=VALUE, got: {s}")

def api_post(server, path, payload):
    req = urllib.request.Request(f"{server}{path}",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as r:
        return json.load(r)

def api_get(server, path):
    with urllib.request.urlopen(f"{server}{path}") as r:
        return r.read()

def inject_prompt_smart(wf, prompt, negative):
    """Smart prompt injection: prefer PrimitiveString feeding StringConcatenate
    feeding CLIPTextEncode (nodes 75->74->7 here), so the style suffix survives."""
    # 1. Find StringConcatenate nodes whose output goes into a CLIPTextEncode
    encoded_from = set()
    for nid, n in wf.items():
        if n.get("class_type") == "CLIPTextEncode":
            t = n["inputs"].get("text")
            if isinstance(t, list):
                encoded_from.add(str(t[0]))
    for nid, n in wf.items():
        if n.get("class_type") == "StringConcatenate" and nid in encoded_from:
            sa = n["inputs"].get("string_a")
            if isinstance(sa, list) and str(sa[0]) in wf and \
               wf[str(sa[0])].get("class_type") == "PrimitiveString":
                wf[str(sa[0])]["inputs"]["value"] = prompt
                return f"PrimitiveString {sa[0]} (via StringConcatenate {nid})"
    # 2. Fallback: direct PrimitiveString titled PROMPT, else first CLIPTextEncode
    for nid, n in wf.items():
        if n.get("class_type") == "PrimitiveString" and \
           "PROMPT" in str(n.get("_meta", {}).get("title", "")).upper():
            n["inputs"]["value"] = prompt
            return f"PrimitiveString {nid}"
    for nid, n in wf.items():
        if n.get("class_type") == "CLIPTextEncode":
            n["inputs"]["text"] = prompt
            first = nid
            break
    else:
        return "no text node found"
    # negative -> second encoder if prompt only given
    if negative:
        encs = [i for i, n in wf.items() if n.get("class_type") == "CLIPTextEncode" and i != first]
        if encs:
            wf[encs[0]]["inputs"]["text"] = negative
    return f"CLIPTextEncode {first} (direct)"

def main():
    ap = argparse.ArgumentParser(description="Generate placeholder sprites via ComfyUI")
    ap.add_argument("--prompt", required=True, help="Subject, e.g. 'a red cat'. Style suffix is appended automatically.")
    ap.add_argument("--negative", default=None, help="Override negative prompt (default: workflow's node 10)")
    ap.add_argument("--workflow", default=DEFAULT_WORKFLOW, help="Path to workflow API-format JSON (default: 64x64_sprite_generator.json next to this script)")
    ap.add_argument("--out", default="out.png", help="Output image path")
    ap.add_argument("--server", default="http://127.0.0.1:8188", help="ComfyUI address")
    ap.add_argument("--size", type=int, choices=[32, 64, 128], default=64, help="Sprite resolution in px (sets node 83 RESOLUTION HERE; default: 64, 128 for big sprites like the pot)")
    ap.add_argument("--seed", type=int, default=None, help="Fixed seed (default: random each run)")
    ap.add_argument("--set", action="append", default=[], type=parse_set, help="Override: NODE.inputs.KEY=VALUE (repeatable)")
    ap.add_argument("--timeout", type=int, default=300)
    args = ap.parse_args()

    if not args.workflow or not os.path.exists(args.workflow):
        sys.exit(f"Workflow file not found: {args.workflow}\nExport it from ComfyUI (Dev mode -> Save API Format) as 64x64_sprite_generator.json")
    with open(args.workflow) as f:
        wf = json.load(f)

    where = inject_prompt_smart(wf, args.prompt, args.negative)
    print(f"Prompt -> {where}", flush=True)

    # Resolution: node 83 PrimitiveInt "RESOLUTION HERE" (32|64|128).
    # Node 85 derives latent/crop/output px (a*8), so this one value drives all sizes.
    # 128 -> 1024px diffusion: slower + more VRAM. If OOM, lower steps via --set "3.inputs.steps=12".
    if "83" in wf and wf["83"].get("class_type") == "PrimitiveInt":
        wf["83"]["inputs"]["value"] = args.size
        print(f"Size -> {args.size}x{args.size} (node 83)", flush=True)

    # Seed handling: node 3 KSampler
    samplers = [nid for nid, n in wf.items() if n.get("class_type") == "KSampler"]
    for nid in samplers:
        wf[nid]["inputs"]["seed"] = args.seed if args.seed is not None else random.randint(0, 2**31 - 1)

    for node_id, key, value in args.set:
        if node_id not in wf:
            sys.exit(f"Node {node_id} not in workflow. Available: {sorted(wf.keys())}")
        wf[node_id]["inputs"][key] = value

    client_id = str(uuid.uuid4())
    try:
        res = api_post(args.server, "/prompt", {"prompt": wf, "client_id": client_id})
    except OSError as e:
        sys.exit(f"Cannot reach ComfyUI at {args.server}: {e}\nStart it with: python main.py --listen 127.0.0.1 --port 8188")
    prompt_id = res["prompt_id"]
    print(f"Queued: {prompt_id}", flush=True)

    start = time.time()
    while time.time() - start < args.timeout:
        time.sleep(1.5)
        raw = api_get(args.server, f"/history/{prompt_id}")
        hist = json.loads(raw)
        if prompt_id in hist and hist[prompt_id].get("status", {}).get("completed"):
            outputs = hist[prompt_id]["outputs"]
            for node_id, out in outputs.items():
                if "images" in out:
                    img = out["images"][0]
                    q = urllib.parse.urlencode(
                        {"filename": img["filename"], "subfolder": img["subfolder"], "type": img["type"]})
                    data = api_get(args.server, f"/view?{q}")
                    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
                    with open(args.out, "wb") as f:
                        f.write(data)
                    print(f"Saved -> {args.out} (node {node_id}, {img['filename']})")
                    return
            sys.exit("Completed but no images found in outputs.")
    sys.exit("Timed out waiting for ComfyUI.")

if __name__ == "__main__":
    main()
