import subprocess
import sys
from pathlib import Path

def install_dependencies(extension_root_dir):
    """
    Install dependencies required for the Kedro extension.

    Args:
        extension_root_dir (str): The root directory of the extension.
    Raises:
        ImportError: If the required dependencies are not found.
    """
    ...
    libs_path = Path(extension_root_dir) / "bundled" / "libs"
    requirements_path = Path(extension_root_dir) / "kedro-viz-requirements.txt"

    try:
        import fastapi
        import orjson
    except ImportError:
        subprocess.check_call(
            [
                sys.executable,
                "-m",
                "pip",
                "install",
                "-r",
                Path(requirements_path),
                "-t",
                Path(libs_path),
                "--no-cache-dir",
            ]
        )


if __name__ == "__main__":
    if len(sys.argv) > 1:
        extension_root_dir = sys.argv[1]
    else:
        extension_root_dir = None
    install_dependencies(extension_root_dir)
