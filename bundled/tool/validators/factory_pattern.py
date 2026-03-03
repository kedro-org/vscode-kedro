"""Factory pattern validation"""
import json
import re
from typing import Dict, List, Set
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
        factory_pattern_regex = re.compile(r'\{([^{}]+)\}')
        
        for dataset_name, dataset_config in catalog_config.items():
            if not is_valid_dataset_entry(dataset_name):
                continue

            # Check for any brackets
            has_opening = '{' in dataset_name
            has_closing = '}' in dataset_name
            
            # Detect malformed patterns
            if has_opening != has_closing:
                line_info = find_line_number_and_character(content, dataset_name)
                if line_info:
                    line_number, start_char = line_info
                    
                    # Check if config has factory-pattern-only fields
                    factory_only_fields = {'layer', 'tags'}  # Add other factory-only fields
                    config_fields = set(dataset_config.keys()) if isinstance(dataset_config, dict) else set()
                    invalid_fields = config_fields.intersection(factory_only_fields)
                    
                    if invalid_fields:
                        message = (f"Malformed factory pattern: mismatched brackets. "
                                 f"Fields {list(invalid_fields)} are only valid for factory patterns.")
                    else:
                        message = "Malformed factory pattern: mismatched brackets {}"
                    
                    diagnostic = create_diagnostic(
                        range_start=Position(line=line_number, character=start_char),
                        range_end=Position(line=line_number, character=start_char + len(dataset_name)),
                        message=message,
                        severity=DiagnosticSeverity.Error
                    )
                    diagnostics.append(diagnostic)
                continue

            # Check for unpaired brackets anywhere in the pattern
            open_count = dataset_name.count('{')
            close_count = dataset_name.count('}')
            if open_count != close_count:
                line_info = find_line_number_and_character(content, dataset_name)
                if line_info:
                    line_number, start_char = line_info
                    diagnostic = create_diagnostic(
                        range_start=Position(line=line_number, character=start_char),
                        range_end=Position(line=line_number, character=start_char + len(dataset_name)),
                        message=f"Unbalanced brackets in factory pattern: {open_count} '{{' but {close_count} '}}'",
                        severity=DiagnosticSeverity.Error
                    )
                    diagnostics.append(diagnostic)
                continue

            if not has_opening:
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
                        message=f"Keys used in the configuration [{', '.join(sorted(extra_vars))}] should be present in the dataset factory pattern name",
                        severity=DiagnosticSeverity.Warning
                    )
                    diagnostics.append(diagnostic)
                    
        return diagnostics
