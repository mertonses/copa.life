"""Competition ID taramasi — 1..120 arasi, 15+ takim olanlari listele."""
import sys, time, requests
from bs4 import BeautifulSoup
sys.stdout.reconfigure(encoding='utf-8')

COOKIE = "_gid=GA1.2.476415843.1782369664; cf_clearance=sU81OQKAc98oNegcjDipTzLPW7jQFjV_ZnJxchHyyBQ-1782396632-1.2.1.1-SB0Msre._CvofcyOiNRlYtKc9tStITTHkQIV8xhemzUi6P8qs7xDws0z4zwu7y0uqXQ0jkboR3tBIZ51j93vyArb6SXN2KJuU5Muq3kytJvsAU7ua38EXW5C8kt6d3ltA3E8RcLpEla_OEkPKlQV3kOlyUOE_fGOj.wGjUC6wSTP7RgOB6.e1jjWMgrR3fo9QszyxLJUNAJtplKDHisP423kSqIco8vp14WwfSGcapzbvP7GAwMxhFyQ7DzXVZ0EC0QzgiA4igE.0zcy5mcjtDzkETnHFXymQrRbBH1qJrv_TjL9u_SAuwhD1GS4If3g7B8uaapS30toB4LPbBwiJA; XSRF-TOKEN=eyJpdiI6IjQzT2drZHBsM2trQ3MxbHFkVWRYOFE9PSIsInZhbHVlIjoiTGU1WjF4WEtTR1JjRTJyUytWNVRFZndvU1gydjl1V2o2QXFnWG1rbklxaEREaDk2OGszcVFwV2wvNklwTFluYWdkYlU1U1NnN1dyTW9xbW9KbDhhb0gzWlBYekNaYS8za0xzVy9MTTRlbVRjRnZCN2RZaXY1dmEwRXlMbzc3MG8iLCJtYWMiOiJiMGIwZmMyZmJiYzM0MDFmNDQyMjczN2FhNDNiZDRiN2UzY2IyNWM4OTFmMWIwYzZhMWYxNTRlODZmMzY2NmJiIiwidGFnIjoiIn0%3D; sortitoutsi_session=eyJpdiI6IlMvV3l1V3JibnR0b28zMGV2cEQva3c9PSIsInZhbHVlIjoiSEYyeWF6a1ZSdmNtZ3lOZUtoV0VIczltMUNadjlXaHNObVpyZ244N2s1aWEvdjVNeFMwb0RMcVJhZm0wck5id1Bsc0pDaXNRM0k3djRWUDZnaXpVUFpnMUdhQkhPTldlQUtWQUN6WnpPeUk1UGxvaGdVbTQ0UE9JUEhXYUQ3K2ciLCJtYWMiOiJlYzEyZmIyYWUyYzNlMWFmODAxMzE4YjM2Mjk1Y2MxMGVjMjFhYzIwMzE4NzMyMzBmZmUyMTU2Y2Q5NDY4MDBiIiwidGFnIjoiIn0%3D; _ga=GA1.1.1520262600.1782369664; _ga_YZJDQKLX5V=GS2.1.s1782396630$o5$g1$t1782397296$j59$l0$h0"
HEADERS = {"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64)","Cookie":COOKIE,"Referer":"https://sortitoutsi.net/"}

START, END = 1, 120

for cid in range(START, END+1):
    time.sleep(0.5)
    url = f"https://sortitoutsi.net/football-manager-2026/competition/{cid}/x"
    try:
        r = requests.get(url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(r.text, "html.parser")
        teams = set(a["href"] for a in soup.select("a[href*='/football-manager-2026/team/']"))
        if len(teams) >= 15:
            h1 = soup.select_one("h1")
            title = h1.get_text(strip=True) if h1 else soup.title.get_text(strip=True) if soup.title else "?"
            print(f"[{cid:3d}] {len(teams):2d} takim | {title[:80]}")
    except Exception as e:
        print(f"[{cid:3d}] HATA: {e}")
