from kedro.io.data_catalog import DataCatalog
from typing import Any, Dict, Optional, Sequence


class DummyDataCatalog(DataCatalog):
    """Only host the config of the DataCatalog but not actually loading the dataset class"""

    def __init__(self, conf_catalog, feed_dict):
        datasets = {}
        self.conf_catalog = conf_catalog
        self._params = feed_dict

        for ds_name, ds_config in conf_catalog.items():
            datasets[ds_name] = ds_config

        super().__init__(datasets=datasets)

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
