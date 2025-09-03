"""Factory pattern validation"""
import json
import re
from typing import Dict, List
from lsprotocol.types import Diagnostic, DiagnosticSeverity, Position
from .base import CatalogValidator
from .utils import (
    find_line_number_and_character,
    create_diagnostic,
    has_config_references,
    is_valid_dataset_entry
)


class FactoryPatternValidator(CatalogValidator):
    """Validates factory patterns in dataset names"""
    
    def validate(self, catalog_config: Dict, content: str) -> List[Diagnostic]:
        diagnostics = []
        factory_pattern_regex = re.compile(r'{([^{}]+)}')
        
        for dataset_name, dataset_config in catalog_config.items():
            if not is_valid_dataset_entry(dataset_name):
                continue

            if '{' not in dataset_name:
                continue  # Not a factory pattern

            # Skip factory patterns with configuration references
            if has_config_references(dataset_config):
                continue
                
            # Extract variables from dataset name
            name_variables = set(factory_pattern_regex.findall(dataset_name))
            
            # Find all variables in the configuration
            config_variables = set()
            dataset_str = json.dumps(dataset_config)
            for match in factory_pattern_regex.finditer(dataset_str):
                config_variables.add(match.group(1))
            
            # Check for variables in config that aren't in the name
            extra_vars = config_variables - name_variables
            if extra_vars:
                line_info = find_line_number_and_character(content, dataset_name)
                if line_info:
                    line_number, start_char = line_info
                    diagnostic = create_diagnostic(
                        range_start=Position(line=line_number, character=start_char),
                        range_end=Position(line=line_number, character=start_char + len(dataset_name)),
                        message=f"Keys used in the configuration [{', '.join(extra_vars)}] should be present in the dataset factory pattern name",
                        severity=DiagnosticSeverity.Warning
                    )
                    diagnostics.append(diagnostic)
                    
        return diagnostics
