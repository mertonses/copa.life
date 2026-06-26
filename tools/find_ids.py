"""Nation sayfalarindan competition ID'lerini bul."""
import sys, time, requests
from bs4 import BeautifulSoup
sys.stdout.reconfigure(encoding='utf-8')

COOKIE = "_gid=GA1.2.476415843.1782369664; cf_clearance=sU81OQKAc98oNegcjDipTzLPW7jQFjV_ZnJxchHyyBQ-1782396632-1.2.1.1-SB0Msre._CvofcyOiNRlYtKc9tStITTHkQIV8xhemzUi6P8qs7xDws0z4zwu7y0uqXQ0jkboR3tBIZ51j93vyArb6SXN2KJuU5Muq3kytJvsAU7ua38EXW5C8kt6d3ltA3E8RcLpEla_OEkPKlQV3kOlyUOE_fGOj.wGjUC6wSTP7RgOB6.e1jjWMgrR3fo9QszyxLJUNAJtplKDHisP423kSqIco8vp14WwfSGcapzbvP7GAwMxhFyQ7DzXVZ0EC0QzgiA4igE.0zcy5mcjtDzkETnHFXymQrRbBH1qJrv_TjL9u_SAuwhD1GS4If3g7B8uaapS30toB4LPbBwiJA; XSRF-TOKEN=eyJpdiI6IjQzT2drZHBsM2trQ3MxbHFkVWRYOFE9PSIsInZhbHVlIjoiTGU1WjF4WEtTR1JjRTJyUytWNVRFZndvU1gydjl1V2o2QXFnWG1rbklxaEREaDk2OGszcVFwV2wvNklwTFluYWdkYlU1U1NnN1dyTW9xbW9KbDhhb0gzWlBYekNaYS8za0xzVy9MTTRlbVRjRnZCN2RZaXY1dmEwRXlMbzc3MG8iLCJtYWMiOiJiMGIwZmMyZmJiYzM0MDFmNDQyMjczN2FhNDNiZDRiN2UzY2IyNWM4OTFmMWIwYzZhMWYxNTRlODZmMzY2NmJiIiwidGFnIjoiIn0%3D; sortitoutsi_session=eyJpdiI6IlMvV3l1V3JibnR0b28zMGV2cEQva3c9PSIsInZhbHVlIjoiSEYyeWF6a1ZSdmNtZ3lOZUtoV0VIczltMUNadjlXaHNObVpyZ244N2s1aWEvdjVNeFMwb0RMcVJhZm0wck5id1Bsc0pDaXNRM0k3djRWUDZnaXpVUFpnMUdhQkhPTldlQUtWQUN6WnpPeUk1UGxvaGdVbTQ0UE9JUEhXYUQ3K2ciLCJtYWMiOiJlYzEyZmIyYWUyYzNlMWFmODAxMzE4YjM2Mjk1Y2MxMGVjMjFhYzIwMzE4NzMyMzBmZmUyMTU2Y2Q5NDY4MDBiIiwidGFnIjoiIn0%3D; _ga=GA1.1.1520262600.1782369664; _ga_YZJDQKLX5V=GS2.1.s1782396630$o5$g1$t1782397296$j59$l0$h0"
HEADERS = {"User-Agent":"Mozilla/5.0","Cookie":COOKIE,"Referer":"https://sortitoutsi.net/"}

NATIONS = [
    (776, "italy",   "IT"),
    (796, "spain",   "ES"),
]
# Germany: Bundesliga biliniyor = 22, 2.Bundesliga'yi bul
GERMANY_COMP = 22

def get(url):
    time.sleep(1)
    r = requests.get(url, headers=HEADERS, timeout=15)
    soup = BeautifulSoup(r.text, "html.parser")
    return soup

for nid, slug, code in NATIONS:
    print(f"\n=== {code} (nation/{nid}) ===")
    soup = get(f"https://sortitoutsi.net/football-manager-2026/nation/{nid}/{slug}")
    links = soup.select("a[href*='/football-manager-2026/competition/']")
    seen = set()
    for a in links:
        href = a["href"]
        if href in seen: continue
        seen.add(href)
        print(f"  {a.get_text(strip=True)[:50]:50s}  {href}")

# Germany: 2.Bundesliga'yi bulmak icin 22-30 arasi dene
print("\n=== DE — 2.Bundesliga ID ara (22-35) ===")
for cid in range(23, 36):
    time.sleep(0.8)
    r = requests.get(f"https://sortitoutsi.net/football-manager-2026/competition/{cid}/2-bundesliga", headers=HEADERS, timeout=10)
    soup = BeautifulSoup(r.text, "html.parser")
    teams = soup.select("a[href*='/football-manager-2026/team/']")
    unique = len(set(a["href"] for a in teams))
    if unique >= 10:
        h1 = soup.select_one("h1")
        print(f"  competition/{cid}: {unique} takim | {h1.get_text(strip=True)[:50] if h1 else '?'}")
    else:
        print(f"  competition/{cid}: bos/hatali")
