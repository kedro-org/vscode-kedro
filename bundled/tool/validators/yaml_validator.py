"""YAML validation"""
from typing import Dict, List
from lsprotocol.types import Diagnostic
from .base import CatalogValidator


class YAMLValidator(CatalogValidator):
    """Validates YAML syntax"""
    
    def validate(self, catalog_config: Dict, content: str) -> List[Diagnostic]:
        # If we got this far, YAML parsing already succeeded
        # This validator exists mainly to complete the validation chain
        # but could be extended for custom YAML validation rules
        return []
