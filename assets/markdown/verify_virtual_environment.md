# Set up or modify environment correctly

To prevent conflicts between environments and ensure Kedro runs with the correct dependencies. Make sure you're using the correct virtual environment where Kedro is installed, and deactivate any others you don't need.


E.g. Deactivate the `base` environment and ensure `.venv` is the one with Kedro installed.

`(.venv) (base) <your-computer-name> <your-kedro-project> % conda deactivate`

`(.venv) <your-computer-name> <your-kedro-project> %` 

E.g. Deactivate the `base` environment and ensure `(your-kedro-environment)` is the one with Kedro installed.

`(your-kedro-environment) (base) <your-computer-name> <your-kedro-project> % conda deactivate`

`(your-kedro-environment) <your-computer-name> <your-kedro-project> %`