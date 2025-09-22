"""Base validator class"""
from typing import Dict, List
from lsprotocol.types import Diagnostic


class CatalogValidator:
    """Base class for catalog validators"""
    
    def validate(self, catalog_config: Dict, content: str) -> List[Diagnostic]:
        """
        Validate catalog and return diagnostics
        
        Args:
            catalog_config: Parsed catalog configuration
            content: Original text content for line number mapping
            
        Returns:
            List of Diagnostic objects
        """
        raise NotImplementedError("Validators must implement this method")
