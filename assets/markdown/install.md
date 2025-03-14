# Set up Kedro

## Create a virtual environment for your Kedro project

### How to create a new virtual environment using `venv`

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

To exit the environment:

```bash
deactivate
```


### How to create a new virtual environment using `conda`

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

On Windows:

```bash
python --version
```

To exit `kedro-environment`:

```bash
conda deactivate
```
### Optional: Integrate Kedro in VS Code with the official extension
Working in an IDE can be a great productivity boost.

For VS Code Users: Checkout [Set up Visual Studio Code](../development/set_up_vscode.md) and [Kedro VS Code Extension](../development/set_up_vscode.md#kedro-vs-code-extension)
For PyCharm Users: Checkout [Set up PyCharm](../development/set_up_pycharm.md)

## How to install Kedro using `pip`

To install Kedro from the Python Package Index (PyPI):

```bash
pip install kedro
```

You can also install Kedro using `conda install -c conda-forge kedro`.

## How to verify your Kedro installation

To check that Kedro is installed:

```bash
kedro info
```

You should see an ASCII art graphic and the Kedro version number. For example:

![](../meta/images/kedro_graphic.png)
