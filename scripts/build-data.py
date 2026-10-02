#!/usr/bin/env python3
"""Génère data/rl-data.js à partir du jeu de données rocketleagueapi/items.

Usage : python3 scripts/build-data.py [dossier_parsed]
Par défaut lit vendor/rocketleagueapi-items/ (copie de src/parsed du dépôt
https://github.com/rocketleagueapi/items, licence LGPL-3.0).
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "vendor", "rocketleagueapi-items")
OUT = os.path.join(ROOT, "data", "rl-data.js")


def load(name):
    with open(os.path.join(SRC, name + ".json"), encoding="utf-8") as f:
        return json.load(f)


products = load("products")
slots = load("slots")
qualities = load("qualities")
paints = load("paints")
certs = load("certs")
specials = load("specials")
titles = load("titles")

# Emplacements sans intérêt pour un inventaire (titre générique, crédits).
SKIP_SLOTS = {"Player Title", "Currency"}

items = []
for pid, p in products.items():
    slot = slots.get(str(p["slot"]), "None")
    if slot in SKIP_SLOTS or not p["name"].strip():
        continue
    if slot == "None":
        slot = "Other"
    items.append([
        int(pid),
        p["name"],
        slot,
        qualities.get(str(p["quality"]), "Common"),
        1 if p["paintable"] else 0,
        p["special"] or 0,
        1 if p["tradable"] else 0,
        1 if p["blueprint"] else 0,
    ])
items.sort(key=lambda i: (i[1].lower(), i[0]))

RANKS = {
    "Bronze": "Bronze", "Silver": "Silver", "Gold": "Gold", "Platinum": "Platinum",
    "Diamond": "Diamond", "Champion": "Champion", "GrandChampion": "Grand Champion",
    "Legend": "Supersonic Legend",
}

title_list = []
for tid, t in titles.items():
    name = re.sub(r"\{(\w+)\}", lambda m: RANKS.get(m.group(1), m.group(1)), t["name"]).strip()
    if not name or name == "None":
        continue
    title_list.append([tid, name, t["color"].upper()])

data = {
    "source": "rocketleagueapi/items (LGPL-3.0)",
    "items": items,
    "titles": title_list,
    "paints": [paints[k] for k in sorted(paints, key=int)],
    "certs": [certs[k] for k in sorted(certs, key=int)],
    "specials": {k: v for k, v in specials.items()},
}

with open(OUT, "w", encoding="utf-8") as f:
    f.write("// Fichier généré par scripts/build-data.py — ne pas modifier à la main.\n")
    f.write("window.RL_DATA = ")
    json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    f.write(";\n")

print(f"{len(items)} items, {len(title_list)} titres -> {os.path.relpath(OUT, ROOT)}")
