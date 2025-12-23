import subprocess
from pathlib import Path

TARGETS = [
    'frontend/src/utils/paymentMethods.ts',
    'frontend/src/utils/date.ts',
    'frontend/src/components/settings/SmsSettingsPanel.tsx',
]


def fix_iter(text: str) -> str:
    """Reverse repeated cp1256<-utf8 decoding"""
    out = text
    for _ in range(3):
        out = out.encode('cp1256', 'ignore').decode('utf-8', 'ignore')
    return out


def main() -> None:
    for rel in TARGETS:
        result = subprocess.run(['git', 'show', f'HEAD:{rel}'], check=True, capture_output=True)
        original = result.stdout.decode('utf-8')
        fixed = fix_iter(original)
        Path(rel).write_text(fixed, encoding='utf-8')
        print(f'Converted {rel}')


if __name__ == '__main__':
    main()
