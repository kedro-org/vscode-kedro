# Set up and install Kedro

**Note:** This step is for users who have not already installed Kedro.

## You can Create a virtual environment for your Kedro project using `venv`, `conda` or `uv`

### 1. How to create a new virtual environment using `venv`

The recommended approach. If you use Python 3, you should already have the `venv` module installed with the standard library. Create a directory for working with your project and navigate to it. For example:

```bash
mkdir your-kedro-project && cd your-kedro-project
```

Next, create a new virtual environment in this directory with `venv`:

```bash
python -m venv .venv
```

Activate this virtual environment:

```bash
source .venv/bin/activate # macOS / Linux
.\.venv\Scripts\activate  # Windows
```


### 2. How to create a new virtual environment using `conda`

[Another popular option is to use Conda](https://docs.conda.io/projects/conda/en/latest/user-guide/install/). After you install it, execute this from your terminal:

```bash
conda create --name kedro-environment python=3.10 -y
```

The example below uses Python 3.10, and creates a virtual environment called `kedro-environment`. You can opt for a different version of Python (any version >= 3.9 and <3.12) for your project, and you can name it anything you choose.

The `conda` virtual environment is not dependent on your current working directory and can be activated from any directory:

```bash
conda activate kedro-environment
```

To confirm that a valid version of Python is installed in your virtual environment, type the following in your terminal (macOS and Linux):

```bash
python3 --version
```

### 3. How to create a new virtual environment using `uv`

[Another popular option is to use uv](https://pypi.org/project/uv/). After you install it, execute this from your terminal:

Create a directory for working with your project and navigate to it. For example:

```bash
mkdir your-kedro-project && cd your-kedro-project
```

Initialize the project with uv:

```bash
uv init
```

Create a virtual environment:

```bash
uv venv
```

Activate the virtual environment:

```bash
source .venv/bin/activate
```

## How to install Kedro using `pip`

To install Kedro from the Python Package Index (PyPI):

```bash
pip install kedro
```