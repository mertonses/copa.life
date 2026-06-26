"""Competition ID'lerini test et."""
import sys, time, requests
from bs4 import BeautifulSoup
sys.stdout.reconfigure(encoding='utf-8')

COOKIE = "_gid=GA1.2.476415843.1782369664; cf_clearance=sU81OQKAc98oNegcjDipTzLPW7jQFjV_ZnJxchHyyBQ-1782396632-1.2.1.1-SB0Msre._CvofcyOiNRlYtKc9tStITTHkQIV8xhemzUi6P8qs7xDws0z4zwu7y0uqXQ0jkboR3tBIZ51j93vyArb6SXN2KJuU5Muq3kytJvsAU7ua38EXW5C8kt6d3ltA3E8RcLpEla_OEkPKlQV3kOlyUOE_fGOj.wGjUC6wSTP7RgOB6.e1jjWMgrR3fo9QszyxLJUNAJtplKDHisP423kSqIco8vp14WwfSGcapzbvP7GAwMxhFyQ7DzXVZ0EC0QzgiA4igE.0zcy5mcjtDzkETnHFXymQrRbBH1qJrv_TjL9u_SAuwhD1GS4If3g7B8uaapS30toB4LPbBwiJA; XSRF-TOKEN=eyJpdiI6IjQzT2drZHBsM2trQ3MxbHFkVWRYOFE9PSIsInZhbHVlIjoiTGU1WjF4WEtTR1JjRTJyUytWNVRFZndvU1gydjl1V2o2QXFnWG1rbklxaEREaDk2OGszcVFwV2wvNklwTFluYWdkYlU1U1NnN1dyTW9xbW9KbDhhb0gzWlBYekNaYS8za0xzVy9MTTRlbVRjRnZCN2RZaXY1dmEwRXlMbzc3MG8iLCJtYWMiOiJiMGIwZmMyZmJiYzM0MDFmNDQyMjczN2FhNDNiZDRiN2UzY2IyNWM4OTFmMWIwYzZhMWYxNTRlODZmMzY2NmJiIiwidGFnIjoiIn0%3D; sortitoutsi_session=eyJpdiI6IlMvV3l1V3JibnR0b28zMGV2cEQva3c9PSIsInZhbHVlIjoiSEYyeWF6a1ZSdmNtZ3lOZUtoV0VIczltMUNadjlXaHNObVpyZ244N2s1aWEvdjVNeFMwb0RMcVJhZm0wck5id1Bsc0pDaXNRM0k3djRWUDZnaXpVUFpnMUdhQkhPTldlQUtWQUN6WnpPeUk1UGxvaGdVbTQ0UE9JUEhXYUQ3K2ciLCJtYWMiOiJlYzEyZmIyYWUyYzNlMWFmODAxMzE4YjM2Mjk1Y2MxMGVjMjFhYzIwMzE4NzMyMzBmZmUyMTU2Y2Q5NDY4MDBiIiwidGFnIjoiIn0%3D; _ga=GA1.1.1520262600.1782369664; _ga_YZJDQKLX5V=GS2.1.s1782396630$o5$g1$t1782397296$j59$l0$h0"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
    "Cookie": COOKIE,
    "Referer": "https://sortitoutsi.net/",
}

TESTS = [
    (6,  "laliga",           "La Liga (ES)"),
    (7,  "laliga2",          "Segunda (ES)"),
    (9,  "serie-a",          "Serie A (IT)"),
    (10, "serie-b",          "Serie B (IT)"),
    (2,  "bundesliga",       "Bundesliga (DE)"),
    (3,  "2-bundesliga",     "2. Bundesliga (DE)"),
]

for cid, slug, label in TESTS:
    time.sleep(1)
    url = f"https://sortitoutsi.net/football-manager-2026/competition/{cid}/{slug}"
    r = requests.get(url, headers=HEADERS, timeout=15)
    soup = BeautifulSoup(r.text, "html.parser")
    teams = soup.select("a[href*='/football-manager-2026/team/']")
    unique = len(set(a["href"] for a in teams))
    title = soup.select_one("h1") or soup.select_one("title")
    title_txt = title.get_text(strip=True)[:60] if title else "?"
    status = "OK" if unique >= 10 else "HATALI/BOŞ"
    print(f"[{status}] {label}: {unique} takim | {title_txt}")
