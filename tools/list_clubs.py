import sys, re
sys.stdout.reconfigure(encoding='utf-8')
for f in ['src/data/players_spain.js','src/data/players_italy.js','src/data/players_germany.js']:
    with open(f, encoding='utf-8') as fh:
        content = fh.read()
    clubs = sorted(set(re.findall(r'"(?:GK|DEF|MID|FWD)", "([^"]+)"', content)))
    print(f'\n=== {f} ({len(clubs)} takim) ===')
    for c in clubs:
        print(' ', c)
