from typing import Any

from yaml.loader import SafeLoader


class DummyDataCatalog:
    """Only host the config of the DataCatalog but not actually loading the dataset class"""

    def __init__(self, conf_catalog, feed_dict=None):
        self.conf_catalog = conf_catalog
        self._params = feed_dict or {}
        self._datasets = {}
        
        # Add all catalog entries
        for ds_name, ds_config in conf_catalog.items():
            self._datasets[ds_name] = ds_config
            
        # Add all parameters as datasets
        if feed_dict:
            feed_dict_expanded = self._get_feed_dict()
            for key, value in feed_dict_expanded.items():
                self._datasets[key] = value
    
    def list(self):
        """List all dataset names"""
        return list(self._datasets.keys())
    
    def load(self, name):
        """Load a dataset (mainly for parameters)"""
        if name in self._datasets:
            return self._datasets[name]
        raise KeyError(f"Dataset '{name}' not found")
    
    @property
    def params(self):
        return self._params

    def _get_feed_dict(self) -> dict[str, Any]:
        """Get parameters and return the feed dictionary."""
        params = self.params
        feed_dict = {"parameters": params}

        def _add_param_to_feed_dict(param_name: str, param_value: Any) -> None:
            """This recursively adds parameter paths to the `feed_dict`,
            whenever `param_value` is a dictionary itself, so that users can
            specify specific nested parameters in their node inputs.

            Example:

                >>> param_name = "a"
                >>> param_value = {"b": 1}
                >>> _add_param_to_feed_dict(param_name, param_value)
                >>> assert feed_dict["params:a"] == {"b": 1}
                >>> assert feed_dict["params:a.b"] == 1
            """
            key = f"params:{param_name}"
            feed_dict[key] = param_value
            if isinstance(param_value, dict):
                for key, val in param_value.items():
                    _add_param_to_feed_dict(f"{param_name}.{key}", val)

        for param_name, param_value in params.items():
            _add_param_to_feed_dict(param_name, param_value)

        return feed_dict


class SafeLineLoader(SafeLoader):  # pylint: disable=too-many-ancestors
    """A YAML loader that annotates loaded nodes with line number."""

    def construct_mapping(self, node, deep=False):
        mapping = super().construct_mapping(node, deep=deep)
        mapping["__line__"] = node.start_mark.line
        return mapping
