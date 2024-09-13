from kedro_telemetry.plugin import _check_for_telemetry_consent
from kedro_telemetry.plugin import (
    _get_project_properties,
    _get_or_create_uuid,
)


from common import update_sys_path
from pathlib import Path
import os
import sys
import json

update_sys_path(
    os.fspath(Path(__file__).parent.parent / "libs"),
    os.getenv("LS_IMPORT_STRATEGY", "useBundled"),
)

if __name__ == "__main__":
    from pathlib import Path
    import sys

    if len(sys.argv) > 1:
        project_path = Path(sys.argv[1])
    else:
        project_path = Path.cwd()
    consent = _check_for_telemetry_consent(project_path)

    # Project Metadata

    user_uuid = _get_or_create_uuid()
    properties = _get_project_properties(user_uuid, project_path)
    # Extension will parse this message
    properties["consent"] = consent
    print("telemetry consent: ", end="")
    # It is important to use json.dump, if the message is printed together Python
    # convert it to single quote and the result is no longer valid JSON. The message
    # will be parsed by the extension client.
    result = json.dump(properties, sys.stdout)
