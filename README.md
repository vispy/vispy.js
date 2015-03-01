vispy.js
========

This is a light JavaScript version of Vispy. It only features core functionality required for our Python to JavaScript conversion machinery:

* GLIR interpreter in JavaScript/WebGL
* JavaScript implementation of vispy.gloo (emitting GLIR commands)

We'll also rely on our [pythonjs](https://github.com/vispy/pythonjs) and [numpy.js](https://github.com/vispy/numpy.js) libraries to convert NumPy-aware Python functions to JavaScript automatically.

For now, this toolchain will only support visualizations implemented directly on top of gloo (therefore no scene graph). Supporting the scene graph will come much later.

## Installation
Install dependencies with npm:

    npm install

Run gulp to build the Javascript bundle:

    ./node_modules/.bin/gulp


## Develop mode
Run gulp to autorebuild when a file change:

    ./node_modules/.bin/gulp dev
