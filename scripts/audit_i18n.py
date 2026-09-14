"""QA audit: verify every i18n key referenced in source exists in both locales."""
import json, re, os, io

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'frontend')
SRC = os.path.join(ROOT, 'src')

def load(path):
    with io.open(path, encoding='utf-8') as f:
        return json.load(f)

en = load(os.path.join(ROOT, 'src/i18n/locales/en/translation.json'))
hi = load(os.path.join(ROOT, 'src/i18n/locales/hi/translation.json'))

def flat(d, prefix=''):
    keys = set()
    for k, v in d.items():
        full = f'{prefix}{k}'
        if isinstance(v, dict):
            keys |= flat(v, full + '.')
        else:
            keys.add(full)
    return keys

en_keys, hi_keys = flat(en), flat(hi)

used = set()
patterns = [
    re.compile(r"""(?<![.\w])t\(\s*['"`]([a-zA-Z0-9_.\-]+)['"`]"""),
]
for dirpath, _, files in os.walk(SRC):
    for name in files:
        if name.endswith(('.ts', '.tsx')):
            with io.open(os.path.join(dirpath, name), encoding='utf-8') as f:
                text = f.read()
            for pat in patterns:
                used |= set(pat.findall(text))

missing = []
for key in sorted(used):
    if '{{' in key or '$' in key:
        continue  # dynamic keys built with interpolation, e.g. t(`category.${c}`)
    if key not in en_keys:
        missing.append(('EN', key))
    if key not in hi_keys:
        missing.append(('HI', key))

print('Used keys:', len(used))
if missing:
    for loc, key in missing:
        print(f'MISSING {loc}: {key}')
else:
    print('All referenced keys present in EN and HI.')

# Reverse check: keys defined but never used (informational)
unused = sorted(en_keys - used)
dynamic_prefixes = ('category.', 'status.', 'noticeCategory.')
truly_unused = [k for k in unused if not any(k.startswith(p) for p in dynamic_prefixes)]
print('Defined-but-unused (informational):', truly_unused)
