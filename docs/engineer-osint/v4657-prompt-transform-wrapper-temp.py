from pathlib import Path

source=Path('docs/engineer-osint/v4657-prompt-transform-temp.py').read_text()
old="if core.count('v3.6') != 3:"
new="if core.count('v3.6') != 2:"
if source.count(old) != 1:
    raise SystemExit(f'expected one CORE count guard, found {source.count(old)}')
source=source.replace(old,new,1)
exec(compile(source,'v4657-prompt-transform-temp.py','exec'),{'__name__':'__main__'})
