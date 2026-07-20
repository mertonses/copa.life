"""
Sortitoutsi FM2026 England scraper
Cikti: src/data/players_england.js  (POOL formatinda)
"""
import sys, re, json, time, math, subprocess, requests
from bs4 import BeautifulSoup

sys.stdout.reconfigure(encoding='utf-8')

COOKIE = "_gid=GA1.2.476415843.1782369664; XSRF-TOKEN=eyJpdiI6IklIU1NKVFI4L2VFb2pOWE1ja2o3RUE9PSIsInZhbHVlIjoic0lnaHpXNlMwT09pQ2R2R1A1ZmoyQmg0VU5iVHdNQjg1dVk4dWNwVXU1aWxhUzVjSEdpREh5ckJ0anRxaWh5eC93MURHVHhmdnZ1M3YyTFhyVEtHK2w4K3FVUk1Kb2Y4VnRSRVUzeHVPVjFDMzgyS3F6TmJTVERpck5sVC93S1UiLCJtYWMiOiJlYjBhMDhlNzdhZWJiNmFhYjllZjIzODk4OGE2YzQ1ZDY1MGY0OGI5MWM2ZjMyNTQ0NDEzN2VjMTQ1ZWYzZWQ1IiwidGFnIjoiIn0%3D; sortitoutsi_session=eyJpdiI6InBhTGVoOElLSlV6SjREOE9DSGFLN1E9PSIsInZhbHVlIjoiMkJNeE5TL3RmV2VJVFV5RGE3MThOamFldlZlakh4RE51WWEzL1NlcXZTWllEOEs4TlVxY0gyMndLRm16Y2lMemFjTUhJM0djRTZ1SkdSMmFPWE1hbit2S01PTFA1ZlpzQjYvcXJNdElHeCtmMTQ4NUJHNlFTNHgxWklJdmwvTnciLCJtYWMiOiJiM2U2MTFhNDU5MTliNzg5MWUwNjA4Zjc2Njk1Y2E5Yzk5MTI4Mzc0ZmQ3MDExZmQ4YTE5ODI4NjIxOTRmYzA0IiwidGFnIjoiIn0%3D; _ga=GA1.1.1520262600.1782369664; cf_clearance=GvvAtmLFAExmXmvBD8MC.tpQ0kbR8VdnaBPDbSDdsZ0-1782394461-1.2.1.1-zEjvuOAhAK4mLkEauthy3MApkwunBEKRgONsUP8idA7CG2bxyM_O0AB0A2.0nhhXxFKAzizFgObv93gSF24gl7pocnNtgRPThuKKtSXgvb3wyZD2pxcrP5sGW.0x2inspBLSiGF1JIUhRKURH_dyFJuiSJu6P9nlNBnSbpL0CfAOuq5PslKmr220AKLN6IxJJjDYFh6nF8Xrpx3mpPcEl2AVDeObTP.O8EGr5E2fdEg.EHg.kNQL.CVefK5DFZ34F8R5wd9RUb_j__kK9YGJ3jQRBKvISY.hCKS_.79BjXrmmb8XOCEXkH9e1wRHcQL05s_5PmuxxdUIpsVl0DuSVQ"

BASE = "https://sortitoutsi.net"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
    "Cookie": COOKIE,
    "Referer": "https://sortitoutsi.net/",
}

COMPETITIONS = [
    (11, "premier-league",       "Premier League"),
    (12, "sky-bet-championship", "Championship"),
]

# Detayli mevki -> GK/DEF/MID/FWD
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

ENGLISH_NATS = {
    "england","wales","scotland","northern ireland","republic of ireland"
}

def parse_value(txt):
    txt = txt.strip().replace(",","")
    m = re.sub(r"[^\d\.mk]","", txt.lower())
    if not m: return 0.0
    if m.endswith("m"): return float(m[:-1])
    if m.endswith("k"): return round(float(m[:-1]) / 1000, 3)
    return 0.0

def value_to_ov(val_m):
    """GBP milyon degerinden yaklasik OV tahmini. 100m->88, 50m->83, 10m->74, 2m->65, 0.3m->58"""
    if val_m <= 0: return 58
    ov = 55 + 35 * math.log(1 + val_m) / math.log(200)
    return max(55, min(92, round(ov)))

def value_to_price(val_m):
    """Oyun ici taslak fiyati (Euro M). Deger/2.5, en az 1, en fazla 60."""
    return max(1, min(60, round(val_m / 2.5)))

def get(url, delay=1.0):
    time.sleep(delay)
    r = requests.get(url, headers=HEADERS, timeout=15)
    r.raise_for_status()
    return BeautifulSoup(r.text, "html.parser")

def parse_team_page(soup, club_name):
    players = []
    tables = soup.select("table")
    if not tables: return players
    # Sadece ilk tablo (ana kadro)
    rows = tables[0].select("tbody tr")
    for row in rows:
        tds = row.select("td")
        if len(tds) < 6: continue

        # Ad
        name_el = tds[1].select_one("a.item-title")
        if not name_el: continue
        name = name_el.get_text(strip=True)

        # Ulke
        nat_el = tds[1].select_one("div.small a.item-title")
        nat_raw = nat_el.get_text(strip=True).lower() if nat_el else ""
        is_local = 1 if nat_raw in ENGLISH_NATS else 0

        # Yas, Mevki, Deger
        age     = int(tds[2].get_text(strip=True)) if tds[2].get_text(strip=True).isdigit() else 0
        pos_raw = tds[3].get_text(strip=True)
        val_m   = parse_value(tds[5].get_text(strip=True))  # Value kolonu

        role  = to_role(pos_raw)
        ov    = value_to_ov(val_m)
        price = value_to_price(val_m)

        # Ham format: rebalancer doğal mevkiyi koruyup potansiyel/lig katmanını ekler.
        players.append([name, ov, role, club_name, age, is_local, price, to_natural_position(pos_raw)])
    return first_team_roster(players)

def scrape_competition(comp_id, slug, league_name):
    print(f"\n[{league_name}]")
    soup = get(f"{BASE}/football-manager-2026/competition/{comp_id}/{slug}")
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
            players = parse_team_page(tsoup, club)
            all_players.extend(players)
            print(f"  {club}: {len(players)} oyuncu")
        except Exception as e:
            print(f"  {club}: HATA - {e}")
    return all_players

def main():
    all_players = []
    for cid, slug, name in COMPETITIONS:
        all_players.extend(scrape_competition(cid, slug, name))

    print(f"\nToplam: {len(all_players)} oyuncu")

    # Ilk 5 ornegi goster
    print("\nOrnek satirlar:")
    for p in all_players[:5]:
        print(" ", p)

    js = "/* FM2026 England – Premier League + Championship players */\n"
    js += "var POOL_EN=" + json.dumps(all_players, ensure_ascii=False) + ";\n"

    out_path = "src/data/players_england.js"
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(js)
    subprocess.run(["node", "tools/rebalance-player-pools.mjs", "--write"], check=True)
    print(f"\nKaydedildi: {out_path}")

if __name__ == "__main__":
    main()
