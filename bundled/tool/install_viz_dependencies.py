import subprocess
import sys
from pathlib import Path

def install_dependencies(extension_root_dir):
    """
    Install Kedro-Viz required for the Kedro extension.

    Args:
        extension_root_dir (str): The root directory of the extension.
    Raises:
        ImportError: If the required dependencies are not found.
    """
    requirements_path = Path(extension_root_dir) / "kedro-viz-requirements.txt"

    try:
        subprocess.check_call(
            [
                sys.executable,
                "-m",
                "pip",
                "install",
                "-r",
                Path(requirements_path),
                "--no-cache-dir",
            ]
        )
    except subprocess.CalledProcessError as e:
        print(f"Failed to install Kedro-Viz: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        extension_root_dir = sys.argv[1]
    else:
        extension_root_dir = None
    install_dependencies(extension_root_dir)
