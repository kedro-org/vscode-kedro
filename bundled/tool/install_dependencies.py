import subprocess
import sys
import shutil
import glob
from pathlib import Path

def install_dependencies(libsPath):
    # Delete folders that start with "pydantic" which was installed by FASTAPI during the extension build process
    for folder in glob.glob(f"{libsPath}/pydantic*"):
        shutil.rmtree(folder, ignore_errors=True)

    try:
        import pydantic
        import orjson
    except ImportError:
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'pydantic', 'orjson', '-t', Path(libsPath), '--no-cache-dir'])

if __name__ == "__main__":
    if len(sys.argv) > 1:
        libsPath = sys.argv[1]
    else:
        libsPath = None
    install_dependencies(libsPath)
