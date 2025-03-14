# Create a new Kedro project

## Introducing `kedro new`

To create a basic Kedro project containing the default code needed to set up your own nodes and pipelines, navigate to your preferred directory and type:

```bash
kedro new
```

### Project tools

Next, the CLI asks which tools you'd like to include in the project:

```text
Tools
1) Lint: Basic linting with ruff
2) Test: Basic testing with pytest
3) Log: Additional, environment-specific logging options
4) Docs: A Sphinx documentation setup
5) Data Folder: A folder structure for data management
6) PySpark: Configuration for working with PySpark
7) Kedro-Viz: Kedro's native visualisation tool

Which tools would you like to include in your project? [1-7/1,3/all/none]:
 (none):
```

### Quickstart example

To create a spaceflights project called `spaceflights` with Kedro Viz features and example code:

```text
kedro new ⮐
spaceflights ⮐
7 ⮐
yes ⮐
```

You can also enter this in a single line as follows:

```bash
kedro new --name=spaceflights --tools=viz --example=y
```

## Run the new project

Whichever options you selected for tools and example code, once `kedro new` has completed, the next step is to navigate to the project folder (`cd <project-name>`) and install dependencies with `pip` as follows:

```bash
pip install -r requirements.txt
```

Now run the project:

```bash
kedro run
```

```{warning}
`kedro run` requires at least one pipeline with nodes. Please define a pipeline before running this command and ensure it is registred in `pipeline_registry.py`.
```

## Visualise a Kedro project

This section swiftly introduces project visualisation using Kedro-Viz. See the {doc}`Kedro-Viz documentation<kedro-viz:kedro-viz_visualisation>` for more detail.

The Kedro-Viz package needs to be installed into your virtual environment separately as it is not part of the standard Kedro installation:

```bash
pip install kedro-viz
```

To start Kedro-Viz, navigate to the project folder (`cd <project-name>`) and enter the following in your terminal:

```bash
kedro viz run
```

This command automatically opens a browser tab to serve the visualisation at `http://127.0.0.1:4141/`.