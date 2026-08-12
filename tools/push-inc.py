#!/usr/bin/env python3
"""Incremental push to GitHub via git-data API: only changed blobs, hierarchical trees.
Usage: GH_PAT=… GH_REPO=owner/repo python3 tools/push-inc.py <tree> <message>"""
import json, os, subprocess, sys, base64
from concurrent.futures import ThreadPoolExecutor
import urllib.request

PAT = os.environ["GH_PAT"]
REPO = os.environ.get("GH_REPO", "krzemienski/aperant-tui")
BRANCH = os.environ.get("GH_BRANCH", "main")
ROOT = sys.argv[1]
MSG = sys.argv[2]
API = "https://api.github.com"

def gh(method, path, body=None):
    req = urllib.request.Request(API + path, method=method)
    req.add_header("Authorization", "token " + PAT)
    req.add_header("Accept", "application/vnd.github+json")
    data = json.dumps(body).encode() if body is not None else None
    with urllib.request.urlopen(req, data) as r:
        return json.load(r)

def git(*args):
    return subprocess.run(["git", "-C", ROOT, *args], capture_output=True, text=True, check=True).stdout.strip()

if not os.path.isdir(os.path.join(ROOT, ".git")):
    subprocess.run(["git", "init", "-b", BRANCH, ROOT], capture_output=True)
    subprocess.run(["git", "-C", ROOT, "config", "user.email", "agent@aperant.local"], capture_output=True)
    subprocess.run(["git", "-C", ROOT, "config", "user.name", "aperant-agent"], capture_output=True)

subprocess.run(["git", "-C", ROOT, "add", "-A"], capture_output=True)
tree_sha = git("write-tree")

head = gh("GET", f"/repos/{REPO}/git/ref/heads/{BRANCH}")
head_sha = head["object"]["sha"]
remote_tree = gh("GET", f"/repos/{REPO}/git/trees/{head_sha}?recursive=1")
remote_blobs = {t["path"]: t["sha"] for t in remote_tree["tree"] if t["type"] == "blob"}

local_list = git("ls-tree", "-r", tree_sha).splitlines()
local_blobs = {}
for line in local_list:
    meta, p = line.split("\t", 1)
    local_blobs[p] = meta.split()[2]

to_upload = [p for p, sha in local_blobs.items() if remote_blobs.get(p) != sha]
print(f"changed blobs: {len(to_upload)}")
if not to_upload:
    print("nothing to push"); sys.exit(0)

def upload(p):
    content = open(os.path.join(ROOT, p), "rb").read()
    b = gh("POST", f"/repos/{REPO}/git/blobs", {"content": base64.b64encode(content).decode(), "encoding": "base64"})
    return p, b["sha"]

new_shas = {}
with ThreadPoolExecutor(12) as ex:
    for p, sha in ex.map(upload, to_upload):
        new_shas[p] = sha

def build_remote_tree(local_sha, base_path=""):
    items = []
    for line in git("ls-tree", local_sha).splitlines():
        meta, name = line.split("\t", 1)
        mode, typ, sha = meta.split()
        rel = f"{base_path}{name}"
        if typ == "blob":
            items.append({"path": name, "mode": mode, "type": "blob", "sha": new_shas.get(rel, sha)})
        elif typ == "tree":
            sub = build_remote_tree(sha, rel + "/")
            items.append({"path": name, "mode": mode, "type": "tree", "sha": sub})
    t = gh("POST", f"/repos/{REPO}/git/trees", {"tree": items})
    return t["sha"]

new_tree = build_remote_tree(tree_sha)
commit = gh("POST", f"/repos/{REPO}/git/commits", {"message": MSG, "tree": new_tree, "parents": [head_sha]})
gh("PATCH", f"/repos/{REPO}/git/refs/heads/{BRANCH}", {"sha": commit["sha"]})
print("pushed:", commit["sha"])
