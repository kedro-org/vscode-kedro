import subprocess
import sys
import shutil
import glob
from pathlib import Path

def install_dependencies(libsPath):
    try:
        import fastapi
        import orjson
    except ImportError:
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'fastapi>=0.100.0,<0.200.0', 'orjson>=3.9, <4.0', '-t', Path(libsPath), '--no-cache-dir'])

if __name__ == "__main__":
    if len(sys.argv) > 1:
        libsPath = sys.argv[1]
    else:
        libsPath = None
    install_dependencies(libsPath)
