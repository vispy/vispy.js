# vispy.js

This is a light JavaScript version of Vispy. This is used by the python
library to create a jupyter notebook and jupyter lab extension. This allows
the python code to communicate with the client's browser to display WebGL
visuals. This is accomplished by sending GLIR (Graphics Language Intermediate
Representation) over a web socket to the client. See the
[vispy python library](https://github.com/vispy/vispy)
for more information.

This repository also includes javascript files for not only GLIR parsing and
handling, but a standalone javascript implementation of the vispy "gloo"
interface for a high-level object oriented OpenGL workflow.

Right now this javascript library is considered experimental and the
limitations of it should be considered before using it in an operational
setting. Due to the design of this library and the need for passing GLIR
commands, some operations can be slow and cause a backlog of commands to
occur. An example of such an operation would be using a timer to immediately
trigger animation-like redraws of a canvas with no delay in between frames.

This repositories structure follows that of the ipywidgets project set up in
[this cookiecutter](https://github.com/jupyter-widgets/widget-cookiecutter)
project. See those templates for more information about their purpose.
This library is kept in its
[own repository](https://github.com/vispy/vispy.js), but is also available
in the [vispy python library's repository](https://github.com/vispy/vispy)
as a git submodule.

## Installation

This library currently only serves as a jupyter extension/widget and should
be installed by following the instructions of the vispy python library.
See the
[installation instructions](https://vispy.readthedocs.io/en/latest/installation.html#jupyter-extension)
for more details.

In the future, this library may include additional entry points to act as a
standalone javascript library, but support for this has not been implemented
at this time.
