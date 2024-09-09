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
        import pydantic
        import orjson
        from packaging.version import parse

        fastapi_version = parse(fastapi.__version__)
        if fastapi_version < parse("0.100.0") or fastapi_version >= parse("0.200.0"):
            raise ImportError("fastapi version must be >=0.100.0 and <0.200.0")
        

        pydantic_version = parse(pydantic.__version__)
        if pydantic_version < parse("2.0.0"):
            raise ImportError("Pydantic version must be >= 2.0.0")      

        orjson_version = parse(orjson.__version__)
        if orjson_version < parse("3.9") or orjson_version >= parse("4.0"):
            raise ImportError("orjson version must be >= 3.9 and < 4.0")    
             
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
