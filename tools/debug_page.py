import requests, sys, os
from bs4 import BeautifulSoup

sys.stdout.reconfigure(encoding='utf-8')

COOKIE = "_gid=GA1.2.476415843.1782369664; XSRF-TOKEN=eyJpdiI6IklIU1NKVFI4L2VFb2pOWE1ja2o3RUE9PSIsInZhbHVlIjoic0lnaHpXNlMwT09pQ2R2R1A1ZmoyQmg0VU5iVHdNQjg1dVk4dWNwVXU1aWxhUzVjSEdpREh5ckJ0anRxaWh5eC93MURHVHhmdnZ1M3YyTFhyVEtHK2w4K3FVUk1Kb2Y4VnRSRVUzeHVPVjFDMzgyS3F6TmJTVERpck5sVC93S1UiLCJtYWMiOiJlYjBhMDhlNzdhZWJiNmFhYjllZjIzODk4OGE2YzQ1ZDY1MGY0OGI5MWM2ZjMyNTQ0NDEzN2VjMTQ1ZWYzZWQ1IiwidGFnIjoiIn0%3D; sortitoutsi_session=eyJpdiI6InBhTGVoOElLSlV6SjREOE9DSGFLN1E9PSIsInZhbHVlIjoiMkJNeE5TL3RmV2VJVFV5RGE3MThOamFldlZlakh4RE51WWEzL1NlcXZTWllEOEs4TlVxY0gyMndLRm16Y2lMemFjTUhJM0djRTZ1SkdSMmFPWE1hbit2S01PTFA1ZlpzQjYvcXJNdElHeCtmMTQ4NUJHNlFTNHgxWklJdmwvTnciLCJtYWMiOiJiM2U2MTFhNDU5MTliNzg5MWUwNjA4Zjc2Njk1Y2E5Yzk5MTI4Mzc0ZmQ3MDExZmQ4YTE5ODI4NjIxOTRmYzA0IiwidGFnIjoiIn0%3D; _gat_gtag_UA_1592006_2=1; _ga=GA1.1.1520262600.1782369664; _ga_YZJDQKLX5V=GS2.1.s1782394334$o4$g1$t1782394459$j59$l0$h0; cf_clearance=GvvAtmLFAExmXmvBD8MC.tpQ0kbR8VdnaBPDbSDdsZ0-1782394461-1.2.1.1-zEjvuOAhAK4mLkEauthy3MApkwunBEKRgONsUP8idA7CG2bxyM_O0AB0A2.0nhhXxFKAzizFgObv93gSF24gl7pocnNtgRPThuKKtSXgvb3wyZD2pxcrP5sGW.0x2inspBLSiGF1JIUhRKURH_dyFJuiSJu6P9nlNBnSbpL0CfAOuq5PslKmr220AKLN6IxJJjDYFh6nF8Xrpx3mpPcEl2AVDeObTP.O8EGr5E2fdEg.EHg.kNQL.CVefK5DFZ34F8R5wd9RUb_j__kK9YGJ3jQRBKvISY.hCKS_.79BjXrmmb8XOCEXkH9e1wRHcQL05s_5PmuxxdUIpsVl0DuSVQ"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
    "Cookie": COOKIE,
    "Referer": "https://sortitoutsi.net/",
}

# 1) Lig sayfasindaki takim linklerini goster
print("=== LIG SAYFASI ===")
r = requests.get("https://sortitoutsi.net/football-manager-2026/competition/11/premier-league", headers=HEADERS)
print("Status:", r.status_code)
soup = BeautifulSoup(r.text, "html.parser")
team_links = soup.select("a[href*='/football-manager-2026/team/']")
print(f"Bulunan takim linki: {len(team_links)}")
for a in team_links[:5]:
    print(" ", a["href"], "|", a.get_text(strip=True))

# 2) Bournemouth takim sayfasi
print("\n=== TAKIM SAYFASI (Bournemouth) ===")
r2 = requests.get("https://sortitoutsi.net/football-manager-2026/team/600/afc-bournemouth", headers=HEADERS)
print("Status:", r2.status_code)
soup2 = BeautifulSoup(r2.text, "html.parser")

# Tum tablolari listele
tables = soup2.select("table")
print(f"Tablo sayisi: {len(tables)}")
for i, t in enumerate(tables[:3]):
    headers = [th.get_text(strip=True) for th in t.select("th")]
    print(f"  Tablo {i}: basliklar = {headers}")
    rows = t.select("tbody tr")
    print(f"  Satir sayisi: {len(rows)}")
    if rows:
        first = [td.get_text(strip=True) for td in rows[0].select("td")]
        print(f"  Ilk satir: {first}")

# HTML'i dosyaya yaz (incelemek icin)
with open("tools/debug_team.html", "w", encoding="utf-8") as f:
    f.write(r2.text)
print("\nHTML kaydedildi: tools/debug_team.html")
