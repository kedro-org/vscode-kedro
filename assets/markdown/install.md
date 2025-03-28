# Set up and install Kedro
*P.S.: Steps 0 and 1 are for users who want to start a new Kedro project—if you already have an existing Kedro project, skip to Step 2: “Select the correct Python interpreter.”*

## 0.1 Create a directory for working with your project and navigate to it

```bash
mkdir your-kedro-project && cd your-kedro-project
```

## 0.2 Create a virtual environment for your Kedro project

Choose a virtual environment tool: `venv`, `conda`, or `uv`. Or use any another environment managers you prefer.

**P.S.:** `venv` is already built-in with Python 3. Install `conda` or `uv` when necessary.

## 0.3 Create a new virtual environment in your-kedro-project directory

Using `venv`

`python -m venv .venv`


Using `conda`

`conda create --name <your-environment-name> python=3.10 -y`

(You can use any Python version ≥ 3.9 and ≤ 3.11 for your project)


Using `uv`

`uv init` (initialize project)

`uv venv`

## 0.4 Activate the virtual environment

Using `venv`

`source .venv/bin/activate` # macOS / Linux
`.\.venv\Scripts\activate`  # Windows

Using `conda`

`conda activate <your-environment-name>`

Using `uv`

`source .venv/bin/activate`

## 0.5 Install Kedro

`pip install kedro` (PyPI)

`conda install -c conda-forge kedro` (conda)

`uv pip install kedro` (uv)