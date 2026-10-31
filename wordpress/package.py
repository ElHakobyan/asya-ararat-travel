"""Build installable theme archive; run from any directory."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root = Path(__file__).resolve().parent
with ZipFile(root / 'asya-ararat.zip', 'w', ZIP_DEFLATED) as archive:
    for p in sorted((root / 'asya-ararat').rglob('*')):
        if p.is_file():
            archive.write(p, p.relative_to(root))
print(root / 'asya-ararat.zip')
