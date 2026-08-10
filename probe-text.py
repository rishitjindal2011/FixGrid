import re, sys, html
h = open(sys.argv[1], encoding='utf8').read()
h = re.sub(r'<script.*?</script>', '', h, flags=re.S)
h = re.sub(r'<style.*?</style>', '', h, flags=re.S)
t = html.unescape(re.sub(r'<[^>]+>', '\n', h))
lines = [l.strip() for l in t.split('\n') if l.strip()]
print('\n'.join(lines)[:int(sys.argv[2]) if len(sys.argv) > 2 else 2600])
