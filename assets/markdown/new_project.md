# Create and run a Kedro project

*P.S.: Steps 0 and 1 are for users who want to start a new Kedro project—if you already have an existing Kedro project, skip to Step 2: “Select the correct Python interpreter.”*

## 1.1 Introducing `kedro new`

To create a basic Kedro project with default setup, run this in your desired directory:

```bash
kedro new
```

### 1.1.1 Project tools

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

### 1.1.2 Quickstart example

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

## 1.2 Run the new project

After kedro new, run `cd <project-name>` and install dependencies with:

```bash
pip install -r requirements.txt
```

Now run the project:

```bash
kedro run
```

## 1.3 Visualise a Kedro project

Go to your project folder `cd <project-name>` and run:

```bash
kedro viz run
```

This opens the visualization at at `http://127.0.0.1:4141/` in your browser.