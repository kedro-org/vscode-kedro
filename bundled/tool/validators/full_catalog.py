"""Full catalog validation"""
from typing import Dict, List
from lsprotocol.types import Diagnostic, Position
from kedro.io import DataCatalog
from .base import CatalogValidator
from .utils import (
    create_diagnostic,
    has_config_references,
    is_valid_dataset_entry,
    remove_line_numbers
)


class FullCatalogValidator(CatalogValidator):
    """Validates the entire catalog as a whole"""

    def validate(self, catalog_config: Dict, content: str) -> List[Diagnostic]:
        diagnostics = []

        # Create a filtered catalog without factory patterns and interpolation variables
        filtered_catalog = {}
        for dataset_name, dataset_config in catalog_config.items():
            if not is_valid_dataset_entry(dataset_name):
                continue

            # Skip factory patterns with configuration references
            if '{' in dataset_name and has_config_references(dataset_config):
                continue

            filtered_catalog[dataset_name] = dataset_config

        try:
            # Try to validate the filtered catalog
            clean_catalog_config = remove_line_numbers(filtered_catalog)
            DataCatalog.from_config(clean_catalog_config)
        except Exception as exception:
            # If validation fails, add diagnostic at the top of the file
            diagnostic = create_diagnostic(
                range_start=Position(line=0, character=0),
                range_end=Position(line=0, character=0),
                message=f"Catalog validation error: {exception}"
            )
            diagnostics.append(diagnostic)

        return diagnostics
