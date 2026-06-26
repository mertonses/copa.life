import sys, re
sys.stdout.reconfigure(encoding='utf-8')
with open('src/data/players_england.js', encoding='utf-8') as f:
    content = f.read()
clubs = sorted(set(re.findall(r'"(?:GK|DEF|MID|FWD)", "([^"]+)"', content)))
for c in clubs:
    print(c)
