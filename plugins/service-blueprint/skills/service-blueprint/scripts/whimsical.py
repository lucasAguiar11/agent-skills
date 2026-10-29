#!/usr/bin/env python3
"""Convert an SVG made by timeline.py into Whimsical board operations.

Usage: python3 whimsical.py diagram.svg ops.json [--scale 1.2] [--x 0] [--y 0]

Writes {"batches": [[op, ...], ...]}; send each batch, in order, as the
`operations` of the whimsical-remote `edit` tool on an empty area of a board.
Order matters: Whimsical has no send-to-back, the object created last is on top,
so background, bands and lifelines go first and everything else after.
"""
import collections
import json
import re
import sys
import xml.etree.ElementTree as ET

NS = "{http://www.w3.org/2000/svg}"
BATCH = 250  # edit accepts up to 500 ops per call; 250 keeps replies small


def num(e, k, d=0.0):
    v = e.get(k)
    return float(v) if v not in (None, "") else d


def blend(c, a, bg):
    c1 = [int(c[i:i + 2], 16) for i in (1, 3, 5)]
    c2 = [int(bg[i:i + 2], 16) for i in (1, 3, 5)]
    return "#" + "".join(f"{round(x * a + y * (1 - a)):02x}" for x, y in zip(c1, c2))


def convert(svg_path, scale=1.2, ox=0.0, oy=0.0):
    root = ET.parse(svg_path).getroot()
    W = float(root.get("viewBox").split()[2])
    X = lambda v: round(ox + v * scale, 1)
    Y = lambda v: round(oy + v * scale, 1)

    def fsz(px):  # Whimsical's smallest size (xs ≈ 13 px) is why scale defaults to 1.2
        px *= scale
        for lim, k in ((13, "xs"), (15.5, "s"), (18, "m"), (22, "l0"), (28, "l1"), (40, "l2")):
            if px <= lim:
                return k
        return "l3"

    def tw(t, size, mono=False):
        return len(t) * size * (0.66 if mono else 0.6)

    children = [e for e in root if e.tag[len(NS):] not in ("title", "desc", "defs")]
    texts = [e for e in children if e.tag == NS + "text"]

    def tinfo(e):
        tr = e.get("transform")
        if tr:
            m = re.match(r"translate\(([\d.]+),([\d.]+)\)\s*rotate\((-?[\d.]+)\)", tr)
            x, y, rot = float(m[1]), float(m[2]), float(m[3])
        else:
            x, y, rot = num(e, "x"), num(e, "y"), 0.0
        return dict(x=x, y=y, rot=rot, size=num(e, "font-size", 12), fill=e.get("fill", "#1a1a1a"),
                    w=int(e.get("font-weight", "400")), it=e.get("font-style") == "italic",
                    anchor=e.get("text-anchor", "start"), mono="monospace" in (e.get("font-family") or ""),
                    s=e.text or "", ls=num(e, "letter-spacing"))

    def md(ti):
        t = ti["s"]
        if re.match(r"^(#|[-+*] |\d+\. |>)", t):  # would be parsed as markdown list/heading
            t = "\u200b" + t
        if ti["w"] >= 600:
            t = f"**{t}**"
        if ti["it"]:
            t = f"*{t}*"
        return t

    def joined(group):
        ti = dict(group[0])
        ti["s"] = " ".join(d["s"] for d in group)
        return md(ti)

    def paragraphs(tis):
        out, cur, prev = [], [], None
        for ti in tis:
            if prev and (ti["y"] - prev["y"] > prev["size"] * 1.75 or ti["size"] != prev["size"] or ti["w"] != prev["w"]):
                out.append(cur)
                cur = []
            cur.append(ti)
            prev = ti
        return out + [cur] if cur else out

    # Texts inside balloons and action boxes become the shape's own text; tag highlights
    # (16 px high) stay separate, because a shape with text is at least 40 px high.
    boxes = [e for e in children if e.tag == NS + "rect" and e.get("x") is not None
             and num(e, "width") < W and round(num(e, "height")) != 16]
    box_texts = collections.defaultdict(list)
    absorbed = set()
    for t in texts:
        ti = tinfo(t)
        if ti["rot"]:
            continue
        for b in boxes:
            bx, by, bw, bh = num(b, "x"), num(b, "y"), num(b, "width"), num(b, "height")
            if bx - 1 <= ti["x"] <= bx + bw + 1 and by - 1 <= ti["y"] - ti["size"] * 0.3 <= by + bh + 1:
                box_texts[b].append(ti)
                absorbed.add(t)
                break

    # Consecutive wrapped lines of the same free text become one text object.
    free = [t for t in texts if t not in absorbed]
    groups, i = {}, 0
    while i < len(free):
        a = tinfo(free[i])
        grp, j = [a], i + 1
        while j < len(free) and not a["rot"]:
            b = tinfo(free[j])
            same = all(b[k] == a[k] for k in ("x", "anchor", "size", "fill", "w"))
            if not b["rot"] and same and 0 < b["y"] - grp[-1]["y"] <= a["size"] * 1.75:
                grp.append(b)
                j += 1
            else:
                break
        groups[free[i]] = grp
        i = j

    def rect(x, y, w, h, color, **kw):
        o = {"op": "add", "type": "shape", "shape_type": "rect", "x": round(x, 1), "y": round(y, 1),
             "width": round(w, 1), "height": round(h, 1)}
        if color and color.startswith("#"):
            o["color"] = color
        o.update(kw)
        return o

    bg = next(e for e in children if e.tag == NS + "rect" and e.get("x") is None)
    bg_fill = bg.get("fill")
    bands = [e for e in children if e.tag == NS + "rect" and e.get("x") == "0" and num(e, "width") == W]
    band_ys = [(num(e, "y"), num(e, "y") + num(e, "height")) for e in bands]

    def is_seam(e):  # 10 px line that hides the balloon border under its pointer
        return num(e, "stroke-width", 1) == 2 and abs(num(e, "y2") - num(e, "y1")) == 10

    def is_arrow(e):
        return bool(e.get("marker-end")) or e.get("stroke-dasharray") == "5 4"

    vlines = [e for e in children if e.tag == NS + "line" and num(e, "x1") == num(e, "x2")
              and not is_arrow(e) and not is_seam(e)]

    def line_color(e):
        col = e.get("stroke")
        if e.get("stroke-opacity"):
            col = blend(col, float(e.get("stroke-opacity")), bg_fill)
        if e.get("stroke-dasharray") == "1 5":  # dotted "wait" span: no dotted shapes, so lighten it
            col = blend(col, 0.55, bg_fill)
        return col

    first = [rect(X(0), Y(0), W * scale, num(bg, "height") * scale, bg_fill)]
    first += [rect(X(0), Y(num(e, "y")), W * scale, num(e, "height") * scale, e.get("fill")) for e in bands]
    # Lifelines and spans: one piece per band, created after the bands so they show on top of them,
    # and before balloons/texts so those cover them like in the SVG.
    for e in vlines:
        x1 = num(e, "x1")
        y1, y2 = sorted((num(e, "y1"), num(e, "y2")))
        th = max(num(e, "stroke-width", 1) * scale, 1.5)
        cuts = sorted({y1, y2} | {b for a, c in band_ys for b in (a, c) if y1 < b < y2})
        for a, b in zip(cuts, cuts[1:]):
            first.append(rect(X(x1) - th / 2, Y(a), th, (b - a) * scale, line_color(e)))

    rest, n = [], 0
    right = X(W) - 8
    for e in children:
        if e is bg or e in bands or e in vlines:
            continue
        tag = e.tag[len(NS):]
        if tag == "rect":
            o = rect(X(num(e, "x")), Y(num(e, "y")), num(e, "width") * scale, num(e, "height") * scale, e.get("fill"))
            # Balloons keep only their SVG fill: with deco "outline" Whimsical derives a muddy fill
            # from the border colour, and one shape takes one colour.
            tis = sorted(box_texts.get(e, []), key=lambda d: d["y"])
            if tis:
                o["text"] = "\n".join(joined(p) for p in paragraphs(tis))
                o["font_size"] = fsz(collections.Counter(d["size"] for d in tis).most_common(1)[0][0])
                o["text_align"] = "center" if tis[0]["anchor"] == "middle" else "left"
            rest.append(o)
        elif tag == "line":
            if is_seam(e):
                continue
            x1, y1, x2, y2 = (num(e, k) for k in ("x1", "y1", "x2", "y2"))
            col = e.get("stroke")
            if is_arrow(e):
                # Connectors need two objects: invisible-ish 2 px anchors at both ends.
                a, b = f"a{n}", f"b{n}"
                n += 1
                for tid, xx, yy in ((a, x1, y1), (b, x2, y2)):
                    rest.append(rect(X(xx) - 1, Y(yy) - 1, 2, 2, col, temp_id=tid))
                c = {"op": "add", "type": "conn", "from_id": a, "to_id": b, "connector_type": "straight", "color": col}
                if e.get("marker-end"):
                    c["to_endpoint"] = "arrow"
                if e.get("stroke-dasharray"):
                    c["deco"] = "dashes"
                rest.append(c)
            else:
                th = max(num(e, "stroke-width", 1) * scale, 1.5)
                if y1 == y2:
                    rest.append(rect(X(min(x1, x2)), Y(y1) - th / 2, abs(x2 - x1) * scale, th, col))
                else:
                    rest.append(rect(X(x1) - th / 2, Y(min(y1, y2)), th, abs(y2 - y1) * scale, col))
        elif tag == "circle":
            cx, cy, r = num(e, "cx"), num(e, "cy"), num(e, "r")
            o = rect(X(cx - r), Y(cy - r), 2 * r * scale, 2 * r * scale, e.get("fill"))
            o["shape_type"] = "ellipse"
            rest.append(o)
        elif tag == "text" and e in groups:
            g = groups[e]
            a = g[0]
            w = max(tw(d["s"], d["size"], d["mono"]) + len(d["s"]) * d["ls"] for d in g) * scale + 16
            if a["rot"]:  # Whimsical can't rotate text: lay it horizontally beside the span
                x0 = X(a["x"]) - w if a["rot"] < 0 else X(a["x"])
            else:
                x0 = X(a["x"]) - {"middle": w / 2, "end": w}.get(a["anchor"], 0)
            w = min(w, right - x0)  # past the background edge it falls outside the background group
            rest.append({"op": "add", "type": "text", "text": joined(g) if len(g) > 1 else md(a),
                         "x": round(x0, 1), "y": Y(a["y"] - a["size"] * 1.05), "width": round(w, 1),
                         "font_size": fsz(a["size"]), "color": a["fill"],
                         "text_align": {"middle": "center", "end": "right"}.get(a["anchor"], "left")})

    batches, cur = [], []
    for o in first + rest:
        cur.append(o)
        if len(cur) >= BATCH and "temp_id" not in o:  # never split anchors from their connector
            batches.append(cur)
            cur = []
    if cur:
        batches.append(cur)
    return batches


def main(argv):
    if len(argv) < 3:
        sys.exit(__doc__)
    opts = {"--scale": 1.2, "--x": 0.0, "--y": 0.0}
    for k in opts:
        if k in argv:
            opts[k] = float(argv[argv.index(k) + 1])
    batches = convert(argv[1], opts["--scale"], opts["--x"], opts["--y"])
    with open(argv[2], "w", encoding="utf-8") as f:
        json.dump({"batches": batches}, f, ensure_ascii=False)
    kinds = collections.Counter(o["type"] for b in batches for o in b)
    print(f"{argv[2]}: {len(batches)} batches, {sum(kinds.values())} ops {dict(kinds)}")


if __name__ == "__main__":
    main(sys.argv)
