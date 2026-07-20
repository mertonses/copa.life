"""
Sortitoutsi FM2026 — Spain, Italy, Germany scraper
Cikti: src/data/players_spain.js, players_italy.js, players_germany.js
"""
import sys, re, json, time, math, subprocess, requests
from bs4 import BeautifulSoup

sys.stdout.reconfigure(encoding='utf-8')

COOKIE = "_gid=GA1.2.476415843.1782369664; cf_clearance=sU81OQKAc98oNegcjDipTzLPW7jQFjV_ZnJxchHyyBQ-1782396632-1.2.1.1-SB0Msre._CvofcyOiNRlYtKc9tStITTHkQIV8xhemzUi6P8qs7xDws0z4zwu7y0uqXQ0jkboR3tBIZ51j93vyArb6SXN2KJuU5Muq3kytJvsAU7ua38EXW5C8kt6d3ltA3E8RcLpEla_OEkPKlQV3kOlyUOE_fGOj.wGjUC6wSTP7RgOB6.e1jjWMgrR3fo9QszyxLJUNAJtplKDHisP423kSqIco8vp14WwfSGcapzbvP7GAwMxhFyQ7DzXVZ0EC0QzgiA4igE.0zcy5mcjtDzkETnHFXymQrRbBH1qJrv_TjL9u_SAuwhD1GS4If3g7B8uaapS30toB4LPbBwiJA; XSRF-TOKEN=eyJpdiI6IjQzT2drZHBsM2trQ3MxbHFkVWRYOFE9PSIsInZhbHVlIjoiTGU1WjF4WEtTR1JjRTJyUytWNVRFZndvU1gydjl1V2o2QXFnWG1rbklxaEREaDk2OGszcVFwV2wvNklwTFluYWdkYlU1U1NnN1dyTW9xbW9KbDhhb0gzWlBYekNaYS8za0xzVy9MTTRlbVRjRnZCN2RZaXY1dmEwRXlMbzc3MG8iLCJtYWMiOiJiMGIwZmMyZmJiYzM0MDFmNDQyMjczN2FhNDNiZDRiN2UzY2IyNWM4OTFmMWIwYzZhMWYxNTRlODZmMzY2NmJiIiwidGFnIjoiIn0%3D; sortitoutsi_session=eyJpdiI6IlMvV3l1V3JibnR0b28zMGV2cEQva3c9PSIsInZhbHVlIjoiSEYyeWF6a1ZSdmNtZ3lOZUtoV0VIczltMUNadjlXaHNObVpyZ244N2s1aWEvdjVNeFMwb0RMcVJhZm0wck5id1Bsc0pDaXNRM0k3djRWUDZnaXpVUFpnMUdhQkhPTldlQUtWQUN6WnpPeUk1UGxvaGdVbTQ0UE9JUEhXYUQ3K2ciLCJtYWMiOiJlYzEyZmIyYWUyYzNlMWFmODAxMzE4YjM2Mjk1Y2MxMGVjMjFhYzIwMzE4NzMyMzBmZmUyMTU2Y2Q5NDY4MDBiIiwidGFnIjoiIn0%3D; _ga=GA1.1.1520262600.1782369664; _ga_YZJDQKLX5V=GS2.1.s1782396630$o5$g1$t1782397296$j59$l0$h0"

BASE = "https://sortitoutsi.net"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
    "Cookie": COOKIE,
    "Referer": "https://sortitoutsi.net/",
}

# Ülke konfigürasyonlari
COUNTRIES = {
    "ES": {
        "out": "src/data/players_spain.js",
        "var": "POOL_ES",
        "local_nats": {"spain"},
        "competitions": [
            (67, "spanish-first-division",  "La Liga"),
            (68, "spanish-second-division", "Segunda División"),
        ],
    },
    "IT": {
        "out": "src/data/players_italy.js",
        "var": "POOL_IT",
        "local_nats": {"italy"},
        "competitions": [
            (32, "serie-a",   "Serie A"),
            (33, "serie-b",   "Serie BKT"),
        ],
    },
    "DE": {
        "out": "src/data/players_germany.js",
        "var": "POOL_DE",
        "local_nats": {"germany"},
        "competitions": [
            (22, "bundesliga",   "Bundesliga"),
            (23, "bundesliga-2", "Bundesliga 2"),
        ],
    },
}

def to_role(pos_raw):
    natural = to_natural_position(pos_raw)
    if natural == "GK": return "GK"
    if natural in {"CB","LB","RB"}: return "DEF"
    if natural in {"ST","LW","RW"}: return "FWD"
    return "MID"

def to_natural_position(pos_raw):
    p = re.sub(r"\s+", " ", str(pos_raw).upper()).strip()
    if re.search(r"\b(?:GK|KL)\b", p): return "GK"
    if re.search(r"\b(?:RB|DR|D\s*\(R\)|D/WB\s*\(R\))\b", p): return "RB"
    if re.search(r"\b(?:LB|DL|D\s*\(L\)|D/WB\s*\(L\))\b", p): return "LB"
    if re.search(r"\b(?:CB|DC|SW|D\s*\(C\))\b", p): return "CB"
    if re.search(r"\b(?:DM|DMC)\b", p): return "DM"
    if re.search(r"\b(?:AMR|AM\s*\(R\)|RW)\b", p): return "RW"
    if re.search(r"\b(?:AML|AM\s*\(L\)|LW)\b", p): return "LW"
    if re.search(r"\b(?:AMC|AM\s*\(C\))\b", p): return "AM"
    if re.search(r"\b(?:MC|M\s*\(C\)|CM)\b", p): return "CM"
    if re.search(r"\b(?:MR|M\s*\(R\)|RM)\b", p): return "RM"
    if re.search(r"\b(?:ML|M\s*\(L\)|LM)\b", p): return "LM"
    if re.search(r"\b(?:ST|CF|SS)\b", p): return "ST"
    return "CM"

def first_team_roster(players, limit=36):
    quotas = {"GK": 4, "DEF": 11, "MID": 11, "FWD": 10}
    ranked = sorted(players, key=lambda player: (player[6], player[1], -player[4]), reverse=True)
    selected = []
    for role, quota in quotas.items():
        selected.extend([player for player in ranked if player[2] == role][:quota])
    selected_ids = {id(player) for player in selected}
    for player in ranked:
        if len(selected) >= limit: break
        if id(player) not in selected_ids:
            selected.append(player)
            selected_ids.add(id(player))
    return selected[:limit]

def parse_value(txt):
    txt = txt.strip().replace(",","")
    m = re.sub(r"[^\d\.mk]","", txt.lower())
    if not m: return 0.0
    if m.endswith("m"): return float(m[:-1])
    if m.endswith("k"): return round(float(m[:-1]) / 1000, 3)
    return 0.0

def value_to_ov(val_m):
    if val_m <= 0: return 58
    ov = 55 + 35 * math.log(1 + val_m) / math.log(200)
    return max(55, min(92, round(ov)))

def value_to_price(val_m):
    return max(1, min(60, round(val_m / 2.5)))

def get(url, delay=1.2):
    time.sleep(delay)
    r = requests.get(url, headers=HEADERS, timeout=15)
    r.raise_for_status()
    return BeautifulSoup(r.text, "html.parser")

def parse_team_page(soup, club_name, local_nats):
    players = []
    tables = soup.select("table")
    if not tables: return players
    rows = tables[0].select("tbody tr")
    for row in rows:
        tds = row.select("td")
        if len(tds) < 6: continue
        name_el = tds[1].select_one("a.item-title")
        if not name_el: continue
        name = name_el.get_text(strip=True)
        nat_el = tds[1].select_one("div.small a.item-title")
        nat_raw = nat_el.get_text(strip=True).lower() if nat_el else ""
        is_local = 1 if nat_raw in local_nats else 0
        age     = int(tds[2].get_text(strip=True)) if tds[2].get_text(strip=True).isdigit() else 0
        pos_raw = tds[3].get_text(strip=True)
        val_m   = parse_value(tds[5].get_text(strip=True))
        role    = to_role(pos_raw)
        ov      = value_to_ov(val_m)
        price   = value_to_price(val_m)
        players.append([name, ov, role, club_name, age, is_local, price, to_natural_position(pos_raw)])
    return first_team_roster(players)

def scrape_competition(comp_id, slug, league_name, local_nats):
    print(f"\n  [{league_name}]")
    try:
        soup = get(f"{BASE}/football-manager-2026/competition/{comp_id}/{slug}")
    except Exception as e:
        print(f"  LIG SAYFASI HATASI: {e}")
        return []
    team_links = soup.select("a[href*='/football-manager-2026/team/']")
    seen, all_players = set(), []
    for a in team_links:
        href = a["href"]
        if href in seen: continue
        seen.add(href)
        club = a.get_text(strip=True)
        if not club: continue
        try:
            tsoup = get(BASE + href if href.startswith("/") else href)
            players = parse_team_page(tsoup, club, local_nats)
            all_players.extend(players)
            print(f"    {club}: {len(players)} oyuncu")
        except Exception as e:
            print(f"    {club}: HATA - {e}")
    return all_players

def scrape_country(code, cfg):
    print(f"\n{'='*40}")
    print(f"ULKE: {code}")
    print(f"{'='*40}")
    all_players = []
    for cid, slug, name in cfg["competitions"]:
        all_players.extend(scrape_competition(cid, slug, name, cfg["local_nats"]))
    print(f"\n  Toplam: {len(all_players)} oyuncu")
    js = f"/* FM2026 {code} players */\nvar {cfg['var']}={json.dumps(all_players, ensure_ascii=False)};\n"
    with open(cfg["out"], "w", encoding="utf-8") as f:
        f.write(js)
    print(f"  Kaydedildi: {cfg['out']}")
    return all_players

if __name__ == "__main__":
    for code, cfg in COUNTRIES.items():
        scrape_country(code, cfg)
    subprocess.run(["node", "tools/rebalance-player-pools.mjs", "--write"], check=True)
    print("\n\nTUM ULKELER TAMAMLANDI.")
