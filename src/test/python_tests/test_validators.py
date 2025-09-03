import sys
from pathlib import Path
import pytest

# Add bundled/tool to path to import validators
bundled_path = Path(__file__).parent.parent.parent.parent / "bundled" / "tool"
sys.path.insert(0, str(bundled_path))

from validators.utils import (
    find_line_number_and_character,
    has_config_references,
    is_valid_dataset_entry,
    remove_line_numbers,
    create_diagnostic,
)
from validators.factory_pattern import FactoryPatternValidator
from validators.dataset_config import DatasetConfigValidator
from validators.yaml_validator import YAMLValidator
from validators.full_catalog import FullCatalogValidator
from lsprotocol.types import DiagnosticSeverity, Position


class TestUtilsFunctions:
    """Test utility functions used by validators"""
    
    def test_find_line_number_and_character_dataset_name(self):
        yaml_content = """companies:
  type: pandas.CSVDataset
  filepath: data.csv"""
        
        result = find_line_number_and_character(yaml_content, "companies")
        assert result == (0, 0)
    
    def test_find_line_number_and_character_field(self):
        yaml_content = """companies:
  type: pandas.CSVDataset
  filepath: data.csv"""
        
        result = find_line_number_and_character(yaml_content, "companies", "type")
        assert result == (1, 2)  # Line 1, indented 2 spaces
    
    def test_find_line_number_and_character_not_found(self):
        yaml_content = """companies:
  type: pandas.CSVDataset"""
        
        result = find_line_number_and_character(yaml_content, "missing")
        assert result is None
    
    def test_find_line_number_and_character_field_not_found(self):
        yaml_content = """companies:
  type: pandas.CSVDataset"""
        
        result = find_line_number_and_character(yaml_content, "companies", "missing_field")
        assert result is None
    
    def test_has_config_references_omegaconf(self):
        # Test OmegaConf interpolation detection
        assert has_config_references({"filepath": "${globals:path}/data.csv"}) is True
    
    def test_has_config_references_nested(self):
        assert has_config_references({"load_args": {"columns": "${oc.env:COLUMNS}"}}) is True
    
    def test_has_config_references_no_interpolation(self):
        assert has_config_references({"filepath": "data/{var}/file.csv"}) is False
    
    def test_has_config_references_non_dict(self):
        assert has_config_references("not a dict") is False
    
    def test_is_valid_dataset_entry_valid(self):
        assert is_valid_dataset_entry("my_dataset") is True
    
    def test_is_valid_dataset_entry_private(self):
        assert is_valid_dataset_entry("_private_dataset") is False
    
    def test_is_valid_dataset_entry_non_string(self):
        assert is_valid_dataset_entry(123) is False
        assert is_valid_dataset_entry(None) is False
    
    def test_remove_line_numbers(self):
        config = {
            "type": "pandas.CSVDataset",
            "__line__": 5,
            "load_args": {
                "sep": ",",
                "__line__": 7
            }
        }
        cleaned = remove_line_numbers(config)
        assert "__line__" not in cleaned
        assert "__line__" not in cleaned["load_args"]
        assert cleaned["type"] == "pandas.CSVDataset"
        assert cleaned["load_args"]["sep"] == ","
    
    def test_remove_line_numbers_with_list(self):
        config = {
            "items": [
                {"name": "item1", "__line__": 1},
                {"name": "item2", "__line__": 2}
            ],
            "__line__": 0
        }
        cleaned = remove_line_numbers(config)
        assert "__line__" not in cleaned
        assert all("__line__" not in item for item in cleaned["items"])
    
    def test_create_diagnostic(self):
        diagnostic = create_diagnostic(
            range_start=Position(line=5, character=10),
            range_end=Position(line=5, character=20),
            message="Test error message"
        )
        assert diagnostic.message == "Test error message"
        assert diagnostic.severity == DiagnosticSeverity.Error
        assert diagnostic.source == "Kedro LSP"
        assert diagnostic.range.start.line == 5
        assert diagnostic.range.start.character == 10


class TestFactoryPatternValidator:
    """Test factory pattern validation"""
    
    def setup_method(self):
        self.validator = FactoryPatternValidator()
    
    def test_valid_factory_pattern(self):
        catalog = {
            "{layer}.{name}": {
                "type": "pandas.CSVDataset",
                "filepath": "data/{layer}/{name}.csv",
                "__line__": 1
            }
        }
        content = '"{layer}.{name}":\n  type: pandas.CSVDataset\n  filepath: data/{layer}/{name}.csv'
        
        diagnostics = self.validator.validate(catalog, content)
        assert len(diagnostics) == 0
    
    def test_non_factory_pattern(self):
        catalog = {
            "regular_dataset": {
                "type": "pandas.CSVDataset",
                "filepath": "data.csv",
                "__line__": 1
            }
        }
        content = 'regular_dataset:\n  type: pandas.CSVDataset'
        
        diagnostics = self.validator.validate(catalog, content)
        assert len(diagnostics) == 0
    
    def test_skips_omegaconf_interpolation(self):
        """Test that OmegaConf interpolations are not treated as factory pattern variables"""
        catalog = {
            "{layer}.{name}": {
                "type": "pandas.CSVDataset",
                "filepath": "data/{layer}/{name}.csv",
                "load_args": {"columns": "${globals:columns}"},
                "__line__": 1
            }
        }
        content = '"{layer}.{name}":\n  type: pandas.CSVDataset'
        
        diagnostics = self.validator.validate(catalog, content)
        assert len(diagnostics) == 0  # Should not warn about {globals:columns}


class TestDatasetConfigValidator:
    """Test dataset configuration validation"""
    
    def setup_method(self):
        self.validator = DatasetConfigValidator()
    
    @pytest.mark.skipif(
        not Path(bundled_path / "kedro").exists(),
        reason="Requires Kedro to be installed"
    )
    def test_invalid_dataset_type(self):
        """Test detection of invalid dataset types"""
        catalog = {
            "bad_dataset": {
                "type": "pandas.InvalidDataset",  # This doesn't exist
                "filepath": "data.csv",
                "__line__": 1
            }
        }
        content = 'bad_dataset:\n  type: pandas.InvalidDataset\n  filepath: data.csv'
        
        diagnostics = self.validator.validate(catalog, content)
        assert len(diagnostics) == 1
        assert "bad_dataset" in diagnostics[0].message or "InvalidDataset" in diagnostics[0].message
    
    def test_skips_factory_with_config_references(self):
        catalog = {
            "{name}": {
                "type": "pandas.CSVDataset",
                "filepath": "${globals:path}/{name}.csv"
            }
        }
        content = ""
        
        diagnostics = self.validator.validate(catalog, content)
        assert len(diagnostics) == 0


class TestYAMLValidator:
    """Test YAML validation"""
    
    def setup_method(self):
        self.validator = YAMLValidator()
    
    def test_valid_yaml(self):
        # YAMLValidator is currently a placeholder
        catalog = {"dataset": {"type": "pandas.CSVDataset"}}
        content = "dataset:\n  type: pandas.CSVDataset"
        
        diagnostics = self.validator.validate(catalog, content)
        assert len(diagnostics) == 0


class TestFullCatalogValidator:
    """Test full catalog validation"""
    
    def setup_method(self):
        self.validator = FullCatalogValidator()
    
    @pytest.mark.skipif(
        not Path(bundled_path / "kedro").exists(),
        reason="Requires Kedro to be installed"
    )
    def test_catalog_with_invalid_factory_pattern(self):
        catalog = {
            "{layer}": {
                "type": "pandas.CSVDataset",
                "filepath": "data/{layer}/{extra}.csv"
            }
        }
        content = ""
        
        diagnostics = self.validator.validate(catalog, content)
        # This should produce an error about the mismatched factory pattern
        assert len(diagnostics) > 0
