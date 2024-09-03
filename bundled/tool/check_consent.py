from kedro_telemetry.plugin import _check_for_telemetry_consent
import logging

logger = logging.getLogger(__name__)

if __name__ == "__main__":
    from pathlib import Path
    import sys

    if len(sys.argv) > 1:
        path = Path(sys.argv[1])
    else:
        path = Path.cwd()
    consent = _check_for_telemetry_consent(path)
    logger.debug(f"Consent for telemetry: {consent}")