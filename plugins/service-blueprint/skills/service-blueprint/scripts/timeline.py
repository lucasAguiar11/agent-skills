#!/usr/bin/env python3
"""Sequential service timeline -> self-contained SVG (+ optional PNG).

Usage: python3 timeline.py spec.json out.svg [--png]
Spec format: "Formato da spec" in ../SKILL.md and ../examples/example.json. Prints WARN lines (text overflow) to stderr.
"""
import json, os, shutil, subprocess, sys
from xml.sax.saxutils import escape as E

STYLE = dict(bg="#fbfaf7", ink="#1a1a1a", body="#3d3d3d", muted="#6b665e", bottom="#f4f2ed",
             font="'Helvetica Neue', Helvetica, Arial, sans-serif", mono="'SF Mono', Menlo, Consolas, monospace")
NOTES = {"block": {"label": "BLOCKS", "color": "#b91c1c"},
         "confirm": {"label": "CONFIRM", "color": "#955a06"},
         "contingency": {"label": "CONTINGENCY", "color": "#6d28d9"}}
LABELS = dict(date="DATE", attention="ATTENTION", optional="optional or conditional",
              internal="coloured italic", internal_desc="internal action of that actor",
              sender="arrow colour = sender")
WAIT = "#955a06"


def tw(s, size, mono=False):
    """Approximate rendered width; uppercase-heavy strings are wider."""
    if not s:
        return 0
    if mono:
        return len(s) * size * 0.6
    up = sum(c.isupper() for c in s) / len(s)
    return len(s) * size * (0.55 + 0.2 * up)


def wrap(txt, size, width):
    lines, cur = [], ""
    for wd in txt.split():
        if cur and tw(cur + " " + wd, size) > width:
            lines.append(cur)
            cur = wd
        else:
            cur = (cur + " " + wd).strip()
    return lines + [cur]


def build(spec):
    st = {**STYLE, **spec.get("style", {})}
    lab = {**LABELS, **spec.get("labels", {})}
    notes = {k: {**NOTES.get(k, {}), **v} for k, v in {**NOTES, **spec.get("note_types", {})}.items()}
    tags = spec.get("tags", {})
    W = spec.get("width", 1600)
    actors = spec["actors"]
    rows = spec["rows"]
    warn = []
    AC = {a["id"]: a["color"] for a in actors}
    left, right = 330, W - 370
    n = len(actors)
    X = {a["id"]: (left + i * (right - left) / (n - 1)) if n > 1 else (left + right) / 2 for i, a in enumerate(actors)}
    NOTE_X = W - 260
    NOTE_W = 205
    ids = {r["id"]: i for i, r in enumerate(rows) if "id" in r}

    def occupied(r):
        """Horizontal extent used by a row's arrow/label/sub, to keep balloons clear of it."""
        if "from" in r:
            x1, x2 = X[r["from"]], X[r["to"]]
            mid = (x1 + x2) / 2
            w = tw(r["label"], 12.5) + (tw(r["tag"], 10.5) + 18 if r.get("tag") else 0)
            sw = tw(r.get("code", ""), 11, mono=True) + tw(r.get("sub", ""), 11) + 10
            half = max(w, sw) / 2
            return min(x1, x2, mid - half) - 8, max(x1, x2, mid + half) + 8
        x = X[r["at"]]
        w = max(tw(r["label"], 12.5) + (tw(r["tag"], 10.5) + 18 if r.get("tag") else 0), tw(r.get("sub", ""), 11)) + 28
        return x - w / 2, x + w / 2

    AREA_L, AREA_R = 190, NOTE_X - 24

    def balloon_geom(r):
        """(x, width, lines, side) of the explanatory balloon beside a row, placed in the widest free gap."""
        b = r["balloon"] if isinstance(r["balloon"], dict) else {"text": r["balloon"]}
        lo, hi = occupied(r)
        gaps = {"left": lo - AREA_L, "right": AREA_R - hi}
        side = b.get("side") or max(gaps, key=gaps.get)
        bw = max(170, min(310, gaps[side] - 30))
        if gaps[side] - 30 < 170:
            warn.append(f'balloon squeezed (no room beside the row): "{r["label"]}"')
        lines = wrap(b["text"], 11.5, bw - 22)
        bw = min(bw, max(tw(ln, 11.5) for ln in lines) * 0.88 + 26)  # tw overestimates mixed-case text
        bx = hi + 22 if side == "right" else lo - 22 - bw
        return bx, bw, lines, side, b.get("kind", "info")

    # layout: y per row; tall notes and balloons push the next rows down
    y, pos, note_bottom, balloons = 176, [], 0, {}
    for i, r in enumerate(rows):
        if "phase" in r:
            y += 22; pos.append(y); y += 30; continue
        arrow = "from" in r
        has_sub = bool(r.get("sub") or r.get("code"))
        yy = y + (24 if arrow else 22)
        adv = (54 if has_sub else 42) if arrow else (50 if r.get("sub") else 40)
        if r.get("balloon"):
            g = balloon_geom(r)
            bh = 14 + 15 * len(g[2])
            balloons[i] = (*g, bh)
            pre = max(0, bh / 2 - (yy - y) + 6)
            yy += pre
            adv = max(adv + pre, yy - y + bh / 2 + 10)
        if r.get("note"):
            L = len(wrap(r["note"]["text"], 12, NOTE_W))
            top = yy - 9 - 8 * (L - 1) - 12
            if top < note_bottom + 10:
                d = note_bottom + 10 - top
                yy += d; y += d
            note_bottom = yy - 9 - 8 * (L - 1) + 15 * L
            adv = max(adv, 15 * L + 22)
        pos.append(yy)
        y += adv
    END = y + 6

    bottom = spec.get("bottom")
    BOT = END + 40
    n_items = max(len(bottom.get("left", {}).get("items", [])), len(bottom.get("right", {}).get("items", []))) if bottom else 0
    LEG = BOT + 44 + 26 * n_items + 20 if bottom else END + 10

    # glossary: grid of term + wrapped definition, between the bottom band and the legend
    glo = spec.get("glossary")
    glo_rows = []
    GLO_TOP = LEG
    if glo:
        cols = glo.get("columns", 3)
        gcw = (W - 96 - (cols - 1) * 40) / cols
        items = [(it["term"], wrap(it["text"], 12, gcw)) for it in glo["items"]]
        for k in range(0, len(items), cols):
            row = items[k:k + cols]
            glo_rows.append((row, 20 + 15 * max(len(ls) for _, ls in row) + 14))
        LEG = GLO_TOP + 50 + sum(h for _, h in glo_rows)
    # legend items (kind, payload, width), wrapped into rows so long legends don't overflow
    leg = [("tag", (nm, tg), tw(nm, 10.5) + 18 + tw(tg.get("desc", ""), 12) + 36) for nm, tg in tags.items()]
    if len({b[4] for b in balloons.values()}) > 1:  # only when both balloon kinds appear
        for kind, label in (("info", lab.get("balloon_info", "explanation")), ("confirm", lab.get("balloon_confirm", "why confirm"))):
            leg.append(("balloon", (kind, label), 32 + tw(label, 12) + 30))
    leg.append(("optional", lab["optional"], 44 + tw(lab["optional"], 12) + 36))
    if lab["internal"]:  # diagrams without internal actions set it to ""
        leg.append(("internal", (lab["internal"], lab["internal_desc"]), tw(lab["internal"], 12) + 8 + tw(lab["internal_desc"], 12) + 36))
    leg.append(("text", lab["sender"], tw(lab["sender"], 12)))
    leg_pos, lx, row = [], 48, 0
    for _k, _p, w in leg:
        if lx + w > W - 48 and lx > 48:
            lx, row = 48, row + 1
        leg_pos.append((lx, row))
        lx += w
    leg_rows = row + 1
    H = int(LEG + 70 + 24 * (leg_rows - 1) + 0.999)  # integer: Chrome rejects a fractional --window-size

    o = []
    a = o.append

    def t(x, y, s, size=12, fill=None, w=400, anchor="start", mono=False, extra=""):
        fam = f' font-family="{st["mono"]}"' if mono else ""
        a(f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size}" fill="{fill or st["ink"]}" font-weight="{w}" '
          f'text-anchor="{anchor}"{fam} {extra}>{E(s)}</text>')

    a(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" '
      f'font-family="{st["font"]}" role="img" aria-labelledby="tt td">')
    a(f'<title id="tt">{E(spec["title"])}</title><desc id="td">{E(spec.get("subtitle", ""))}</desc>')
    mk = "".join(f'<marker id="m{k}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" '
                 f'orient="auto-start-reverse"><path d="M0,1.5 L9,5 L0,8.5" fill="none" stroke="{c}" stroke-width="1.8"/></marker>'
                 for k, c in AC.items())
    a(f'<defs>{mk}</defs><rect width="{W}" height="{H}" fill="{st["bg"]}"/>')

    # phase bands
    band = {}
    ph = [i for i, r in enumerate(rows) if "phase" in r]
    for k, i in enumerate(ph):
        nxt = ph[k + 1] if k + 1 < len(ph) else len(rows)
        y0 = pos[i] - 20
        y1 = pos[nxt] - 20 if nxt < len(rows) else END
        tint = rows[i].get("tint", st["bg"])
        a(f'<rect x="0" y="{y0}" width="{W}" height="{y1 - y0}" fill="{tint}"/>')
        for j in range(i, nxt):
            band[j] = tint

    t(48, 60, spec["title"], 30, w=700)
    if spec.get("subtitle"):
        t(48, 88, spec["subtitle"], 14, st["muted"])
        if tw(spec["subtitle"], 14) > W - 96:
            warn.append("subtitle wider than the page")
    for ac in actors:
        x = X[ac["id"]]
        t(x, 132, ac["name"], 16, ac["color"], 700, "middle")
        t(x, 150, ac.get("role", ""), 11.5, st["muted"], 400, "middle")
        a(f'<line x1="{x:.1f}" y1="166" x2="{x:.1f}" y2="{END}" stroke="{ac["color"]}" stroke-opacity="0.28" stroke-width="1.5"/>')
    t(48, 132, lab["date"], 10.5, st["muted"], 700, extra='letter-spacing="1.4"')
    t(NOTE_X, 132, lab["attention"], 10.5, st["muted"], 700, extra='letter-spacing="1.4"')
    a(f'<line x1="0" y1="164" x2="{W}" y2="164" stroke="{st["ink"]}" stroke-width="1"/>')

    # duration spans
    for sp in spec.get("spans", []):
        x = X[sp["actor"]]
        i0, i1 = ids[sp["from"]], ids[sp["to"]]
        if sp.get("kind", "held") == "held":
            y0 = pos[i0] + (20 if "from" not in rows[i0] else 6)
            y1 = pos[i1] - 14
            c = AC[sp["actor"]]
            a(f'<line x1="{x:.1f}" y1="{y0}" x2="{x:.1f}" y2="{y1}" stroke="{c}" stroke-width="5"/>')
            lx, rot = (x - 12, -90) if sp.get("side") == "left" else (x + 15, 90)
            a(f'<text transform="translate({lx:.1f},{(y0 + y1) / 2}) rotate({rot})" font-size="11" fill="{c}" font-weight="700" text-anchor="middle">{E(sp.get("label", ""))}</text>')
        else:
            y0, y1 = pos[i0], pos[i1] - 12
            a(f'<line x1="{x:.1f}" y1="{y0}" x2="{x:.1f}" y2="{y1}" stroke="{WAIT}" stroke-width="2.2" stroke-dasharray="1 5" stroke-linecap="round"/>')
            a(f'<text transform="translate({x - 12:.1f},{(y0 + y1) / 2}) rotate(-90)" font-size="11" fill="{WAIT}" font-weight="700" text-anchor="middle">{E(sp.get("label", ""))}</text>')

    for i, r in enumerate(rows):
        yy = pos[i]
        bg = band.get(i, st["bg"])
        if "phase" in r:
            c = r.get("color", st["ink"])
            a(f'<rect x="48" y="{yy - 7}" width="8" height="8" fill="{c}"/>')
            hw = tw(r["phase"].upper(), 11) + len(r["phase"]) * 1.6 + 8  # letter-spacing widens it
            a(f'<rect x="60" y="{yy - 10}" width="{hw:.1f}" height="16" fill="{bg}"/>')
            t(64, yy + 2, r["phase"].upper(), 11, c, 700, extra='letter-spacing="1.6"')
            continue
        if r.get("date"):
            t(48, yy + 4, r["date"], 13, w=600)
        if "from" not in r:
            who = r["at"]
            x = X[who]
            tagw = tw(r["tag"], 10.5) + 10 if r.get("tag") else 0
            line_w = tw(r["label"], 12.5) + (tagw + 8 if tagw else 0)
            bw = max(line_w, tw(r.get("sub", ""), 11)) + 28
            h = 38 if r.get("sub") else 24
            a(f'<rect x="{x - bw / 2:.1f}" y="{yy - 13}" width="{bw:.1f}" height="{h}" fill="{bg}"/>')
            lx = x - line_w / 2
            if tagw:
                tg = tags[r["tag"]]
                a(f'<rect x="{lx:.1f}" y="{yy - 8}" width="{tagw:.1f}" height="16" fill="{tg["tint"]}"/>')
                t(lx + tagw / 2, yy + 4, r["tag"], 10.5, tg["color"], 800, "middle", extra='letter-spacing="0.8"')
                lx += tagw + 8
            t(lx, yy + 4, r["label"], 12.5, AC[who], 600, extra='font-style="italic"')
            if x - bw / 2 < 230:
                warn.append(f'internal action reaches the date column: "{r["label"]}"')
            if r.get("sub"):
                t(x, yy + 19, r["sub"], 11, st["muted"], 400, "middle")
            if x + bw / 2 > NOTE_X - 10:
                warn.append(f'internal action reaches the notes column: "{r["label"]}"')
        else:
            src, dst = r["from"], r["to"]
            c = AC[src]
            x1, x2 = X[src], X[dst]
            d = 1 if x2 > x1 else -1
            span = abs(x2 - x1)
            dash = ' stroke-dasharray="5 4"' if r.get("dashed") else ""
            a(f'<line x1="{x1:.1f}" y1="{yy}" x2="{x2 - d * 3:.1f}" y2="{yy}" stroke="{c}" stroke-width="1.6"{dash} marker-end="url(#m{src})"/>')
            a(f'<circle cx="{x1:.1f}" cy="{yy}" r="3.2" fill="{c}"/>')
            mid = (x1 + x2) / 2
            full = tw(r["label"], 12.5)
            if r.get("tag"):
                tg = tags[r["tag"]]
                tagw = tw(r["tag"], 10.5) + 10
                full += tagw + 8
                lx = mid - full / 2
                a(f'<rect x="{lx:.1f}" y="{yy - 22}" width="{tagw:.1f}" height="16" fill="{tg["tint"]}"/>')
                t(lx + tagw / 2, yy - 10, r["tag"], 10.5, tg["color"], 800, "middle", extra='letter-spacing="0.8"')
                t(lx + tagw + 8, yy - 9, r["label"], 12.5, w=600)
            else:
                t(mid, yy - 9, r["label"], 12.5, w=600, anchor="middle")
            if full > span - 12:
                warn.append(f'arrow label wider than the arrow: "{r["label"]}"')
            code, sub = r.get("code", ""), r.get("sub", "")
            if code or sub:
                gap = 5 if code and sub else 0
                sep = " · " if code and sub else ""
                cw = tw(code, 11, mono=True)
                sw = tw(sep + sub, 11)
                sx = mid - (cw + gap + sw) / 2
                if code:
                    t(sx, yy + 18, code, 11, c, 600, mono=True)
                t(sx + cw + gap, yy + 18, sep + sub, 11, st["muted"])
                if cw + gap + sw > span + 40:
                    warn.append(f'detail line much wider than the arrow: "{code}{sep}{sub}"')
        nt = r.get("note")
        if nt:
            kind = notes[nt["type"]]
            lines = wrap(nt["text"], 12, NOTE_W)
            top = yy - 9 - 8 * (len(lines) - 1)
            a(f'<circle cx="{NOTE_X + 4}" cy="{top - 3.5}" r="4" fill="{kind["color"]}"/>')
            t(NOTE_X + 14, top, kind["label"].upper(), 10, kind["color"], 700, extra='letter-spacing="1.2"')
            for j, ln in enumerate(lines):
                t(NOTE_X + 14, top + 15 + j * 15, ln, 12, st["body"])

    # explanatory balloons: flat light fill, hairline, small pointer toward the row
    bstyles = {"info": (st.get("balloon_fill", "#fffdf5"), st.get("balloon_line", "#e3d9bf")),
               "confirm": (st.get("confirm_fill", "#fff1e2"), st.get("confirm_line", "#e9a466"))}
    for i, (bx, bw, lines, side, kind, bh) in balloons.items():
        bfill, bline = bstyles.get(kind, bstyles["info"])
        yy = pos[i]
        top = yy - bh / 2
        tip = bx - 9 if side == "right" else bx + bw + 9
        base = bx if side == "right" else bx + bw
        a(f'<rect x="{bx:.1f}" y="{top:.1f}" width="{bw:.1f}" height="{bh:.1f}" rx="6" fill="{bfill}" stroke="{bline}"/>')
        a(f'<path d="M{base:.1f},{yy - 6:.1f} L{tip:.1f},{yy:.1f} L{base:.1f},{yy + 6:.1f}" fill="{bfill}" stroke="{bline}"/>')
        a(f'<line x1="{base:.1f}" y1="{yy - 5:.1f}" x2="{base:.1f}" y2="{yy + 5:.1f}" stroke="{bfill}" stroke-width="2"/>')
        for j, ln in enumerate(lines):
            t(bx + 11, top + 19 + j * 15, ln, 11.5, st["body"])

    a(f'<line x1="0" y1="{END}" x2="{W}" y2="{END}" stroke="{st["ink"]}" stroke-width="1"/>')
    if bottom:
        a(f'<rect x="0" y="{END}" width="{W}" height="{LEG - END}" fill="{st["bottom"]}"/>')
        c1, c2 = 48, W // 2 + 40
        colw = W // 2 - 90
        for x, side in ((c1, bottom.get("left")), (c2, bottom.get("right"))):
            if not side:
                continue
            col = side.get("color", st["ink"])
            a(f'<rect x="{x}" y="{BOT - 7}" width="8" height="8" fill="{col}"/>')
            t(x + 16, BOT + 2, side["title"].upper(), 11, col, 700, extra='letter-spacing="1.6"')
            kw = side.get("key_width", 96 if side is bottom.get("left") else 86)
            for j, it in enumerate(side["items"]):
                yy = BOT + 36 + j * 26
                hot = it.get("hot")
                key_col = it.get("color", st["ink"])
                if side is bottom.get("left"):
                    t(x, yy, it["key"], 12.5, key_col, 700)
                else:
                    t(x, yy, it["key"].upper(), 10, key_col, 700, extra='letter-spacing="1.2"')
                fill = NOTES["block"]["color"] if hot else st["body"]
                t(x + kw, yy, it["text"], 12.5, fill, 700 if hot else 400)
                used = kw + tw(it["text"], 12.5)
                if hot and it.get("hint"):
                    t(x + used + 14, yy, it["hint"], 11.5, fill, 600)
                    used += 14 + tw(it["hint"], 11.5)
                if used > colw + 30:
                    warn.append(f'bottom item too long: "{it["text"]}"')
    if glo:
        a(f'<rect x="0" y="{GLO_TOP}" width="{W}" height="{LEG - GLO_TOP}" fill="{st["bg"]}"/>')
        a(f'<line x1="0" y1="{GLO_TOP}" x2="{W}" y2="{GLO_TOP}" stroke="{st["ink"]}" stroke-width="1"/>')
        gc = glo.get("color", st["ink"])
        a(f'<rect x="48" y="{GLO_TOP + 25}" width="8" height="8" fill="{gc}"/>')
        t(64, GLO_TOP + 34, glo.get("title", "Glossary").upper(), 11, gc, 700, extra='letter-spacing="1.6"')
        gy = GLO_TOP + 50
        for row, rh in glo_rows:
            for k, (term, lines) in enumerate(row):
                gx = 48 + k * (gcw + 40)
                t(gx, gy + 14, term, 12.5, st["ink"], 700)
                for j, ln in enumerate(lines):
                    t(gx, gy + 30 + j * 15, ln, 12, st["body"])
            gy += rh
    if bottom or glo:
        a(f'<line x1="0" y1="{LEG}" x2="{W}" y2="{LEG}" stroke="{st["ink"]}" stroke-width="1"/>')

    ly0 = LEG + 30
    for (lx, row), (kind, p, _w) in zip(leg_pos, leg):
        ly = ly0 + row * 24
        if kind == "tag":
            name, tg = p
            w = tw(name, 10.5) + 10
            a(f'<rect x="{lx}" y="{ly - 12}" width="{w:.1f}" height="16" fill="{tg["tint"]}"/>')
            t(lx + w / 2, ly, name, 10.5, tg["color"], 800, "middle")
            t(lx + w + 8, ly, tg.get("desc", ""), 12, st["body"])
        elif kind == "balloon":
            f_, l_ = bstyles[p[0]]
            a(f'<rect x="{lx}" y="{ly - 12}" width="24" height="16" rx="4" fill="{f_}" stroke="{l_}"/>')
            t(lx + 32, ly, p[1], 12, st["body"])
        elif kind == "optional":
            a(f'<line x1="{lx}" y1="{ly - 4}" x2="{lx + 34}" y2="{ly - 4}" stroke="{st["ink"]}" stroke-width="1.4" stroke-dasharray="5 4"/>')
            t(lx + 44, ly, p, 12, st["body"])
        elif kind == "internal":
            t(lx, ly, p[0], 12, actors[min(1, n - 1)]["color"], 600, extra='font-style="italic"')
            t(lx + tw(p[0], 12) + 8, ly, p[1], 12, st["body"])
        else:
            t(lx, ly, p, 12, st["body"])
    ly = ly0 + (leg_rows - 1) * 24
    if spec.get("footer"):
        t(48, ly + 24, spec["footer"], 11, st["muted"])
    a("</svg>")
    return "\n".join(o), W, H, warn


def png(svg_path, W, H):
    out = os.path.splitext(svg_path)[0] + ".png"
    absin, absout = os.path.abspath(svg_path), os.path.abspath(out)
    chrome = next((p for p in ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
                               shutil.which("google-chrome") or "", shutil.which("chromium") or "",
                               shutil.which("chromium-browser") or ""] if p and os.path.exists(p)), None)
    if chrome:
        subprocess.run([chrome, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=2",
                        f"--window-size={W},{H}", f"--screenshot={absout}", f"file://{absin}"],
                       check=True, stderr=subprocess.DEVNULL)
    elif shutil.which("rsvg-convert"):
        subprocess.run(["rsvg-convert", "-z", "2", "-o", absout, absin], check=True)
    else:
        sys.exit("no PNG converter found (Chrome/Chromium or rsvg-convert)")
    return out


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    spec = json.load(open(sys.argv[1], encoding="utf-8"))
    svg, W, H, warnings = build(spec)
    open(sys.argv[2], "w", encoding="utf-8").write(svg)
    print(f"{sys.argv[2]}  {W}x{H}")
    for w in warnings:
        print("WARN", w, file=sys.stderr)
    if "--png" in sys.argv:
        print(png(sys.argv[2], W, H))
