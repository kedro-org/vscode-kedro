# Set up and run Kedro
*P.S.: If you’re starting a new Kedro project, follow Steps 0. If you already have an existing Kedro project, you can skip to Step 1: “Select the correct Python interpreter.”*

## 0.1 Create a directory for working with your project and navigate to it

```bash
mkdir your-kedro-project && cd your-kedro-project
```

## 0.2 Create a virtual environment for your Kedro project

Choose a virtual environment tool: `venv`, `conda`, or `uv`. Or use any another environment managers you prefer.

**P.S.:** `venv` is already built-in with Python 3. Install `conda` or `uv` when necessary.

Refer to https://code.visualstudio.com/docs/python/environments

## 0.3 Install Kedro

`pip install kedro` (PyPI)

`conda install -c conda-forge kedro` (conda)

`uv pip install kedro` (uv)

## 0.4 Create and run Kedro project

To create a basic Kedro project with default setup, run this in your desired directory:
```bash
kedro new --name=spaceflights --example=y
```

To run your Kedro project:
```bash
kedro run
```

For more info, refer to our documentation: https://docs.kedro.org/en/stable/get_started/new_project.html