"""Dataset configuration validation"""
from typing import Dict, List
from lsprotocol.types import Diagnostic, Position
from kedro.io import DataCatalog
from .base import CatalogValidator
from .utils import (
    find_line_number_and_character,
    create_diagnostic,
    has_config_references,
    is_valid_dataset_entry,
    remove_line_numbers
)


class DatasetConfigValidator(CatalogValidator):
    """Validates individual datasets can be created"""

    def validate(self, catalog_config: Dict, content: str) -> List[Diagnostic]:
        diagnostics = []

        for dataset_name, dataset_config in catalog_config.items():
            if not is_valid_dataset_entry(dataset_name):
                continue

            # Skip factory patterns with configuration references
            if '{' in dataset_name and has_config_references(dataset_config):
                continue

            clean_dataset_config = remove_line_numbers(dataset_config)

            try:
                # Create a DataCatalog with this single dataset
                catalog = DataCatalog.from_config({dataset_name: clean_dataset_config})
                
                # Access the dataset through the public API to force validation
                # This works in both pre-1.0 and 1.0+
                _ = catalog[dataset_name]
                
            except Exception as exception:
                # Find the dataset's line number in the file
                line_info = find_line_number_and_character(content, dataset_name)
                if line_info:
                    line_number, start_char = line_info
                    diagnostic = create_diagnostic(
                        range_start=Position(line=line_number, character=start_char),
                        range_end=Position(line=line_number, character=start_char + len(dataset_name)),
                        message=f"{exception}"
                    )
                    diagnostics.append(diagnostic)

        return diagnostics
