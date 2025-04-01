## 1.1 Select the correct Python interpreter

#### 1.1.1 Select the interpreter that has Kedro and the necessary project dependencies installed. For more info, refer to: https://code.visualstudio.com/docs/python/environments#_working-with-python-interpreters

#### 1.1.2 After selecting the interpreter, check for the orange warning icon below—if it appears, relaunch the terminal.

![Verify the correct python interpreter](../vsc-orange-icon.gif)

## 1.2 Set up or modify environment correctly

To prevent conflicts between environments and ensure Kedro runs with the correct dependencies. Make sure you're using the correct virtual environment where Kedro is installed, and deactivate any others you don't need.

Deactivate the unnecessary environment and ensure only the one with Kedro installed. E.g.

`(.venv) (base) <your-computer-name> <your-kedro-project> % deactivate`

`(.venv) <your-computer-name> <your-kedro-project> %`