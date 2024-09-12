import sys

def check_kedro_viz():
    """
    Check if kedro-viz is installed and has the correct version in the environment.

    Args:
        extension_root_dir (str): The root directory of the extension.
    Raises:
        ImportError: If the required dependencies are not found.
    """
    try:
        import kedro_viz
        from packaging.version import parse

        kedro_viz_version = parse(kedro_viz.__version__)
        if kedro_viz_version < parse("10.0.0"):
            raise ImportError("Missing dependencies: kedro_viz version must be >= 10.0.0")        

    except ImportError as e:
        print("Missing dependencies: ", e)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        extension_root_dir = sys.argv[1]
    else:
        extension_root_dir = None
    check_kedro_viz()
