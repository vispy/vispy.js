/* WebGL utility functions */
function viewport(c) {
    c.gl.viewport(0, 0, c.width(), c.height());
}

function clear(c, color) {
    c.gl.clearColor(color[0], color[1], color[2], color[3]);
    c.gl.clear(c.gl.COLOR_BUFFER_BIT);
}

function compile_shader(c, type, source) {
    //source = "precision mediump float;\n" + source;
    source = source.replace(/\\n/g, "\n")

    var shader = c.gl.createShader(c.gl[type]);

    c.gl.shaderSource(shader, source);
    c.gl.compileShader(shader);

    if (!c.gl.getShaderParameter(shader, c.gl.COMPILE_STATUS))
    {
        console.error(c.gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}

function attach_shaders(c, program, vertex, fragment) {
    c.gl.attachShader(program, vertex);
    c.gl.attachShader(program, fragment);
    c.gl.linkProgram(program);

    if (!c.gl.getProgramParameter(program, c.gl.LINK_STATUS))
    {
        console.warn("Could not initialise shaders on program '{0}'.".format(program));
    }
}

function create_attribute(c, program, name) {
    var attribute_handle = c.gl.getAttribLocation(program, name);
    return attribute_handle;
}

function activate_attribute(c, attribute_handle, vbo_id, type, stride, offset) {
    // attribute_handle: attribute handle
    // vbo_id
    // type: float, vec3, etc.
    // stride: 0 by default
    // offset: 0 by default
    var _attribute_info = get_attribute_info(type);
    var attribute_type = _attribute_info[0];  // FLOAT, INT or BOOL
    var ndim = _attribute_info[1]; // 1, 2, 3 or 4

    _vbo_info = c._ns[vbo_id];
    var vbo_handle = _vbo_info.handle;

    c.gl.enableVertexAttribArray(attribute_handle);
    c.gl.bindBuffer(c.gl.ARRAY_BUFFER, vbo_handle);
    c.gl.vertexAttribPointer(attribute_handle, ndim,
                             c.gl[attribute_type],
                             false, stride, offset);
}

function deactivate_attribute(c, attribute_handle) {
    // c.gl.bindBuffer(c.gl.GL_ARRAY_BUFFER, 0);
    c.gl.disableVertexAttribArray(attribute_handle);
}

function activate_texture(c, texture_handle, sampler_handle, texture_index) {
    c.gl.activeTexture(c.gl.TEXTURE0 + texture_index);
    c.gl.bindTexture(c.gl.TEXTURE_2D, texture_handle);
    // c.gl.uniform1i(sampler_handle, 0);
}

function set_texture_data(c, object_handle, gl_type, format, width, height, array) {
    c.gl.bindTexture(gl_type, object_handle);
    c.gl.texImage2D(gl_type, 0, format, width, height, 0,
                    format, c.gl.UNSIGNED_BYTE, array);
}

function set_buffer_data(c, object_handle, gl_type, offset, array, reuse) {
    // Bind the buffer before setting the data.
    c.gl.bindBuffer(gl_type, object_handle);

    // Upload the data.
    if (!reuse) {
        // The existing buffer was empty: we create it.
        c.gl.bufferData(gl_type, array, c.gl.STATIC_DRAW);
    }
    else {
        // We reuse the existing buffer.
        c.gl.bufferSubData(gl_type, offset, array);
    }
}

function set_uniform(c, uniform_handle, uniform_function, value) {
    // Get a TypedArray.
    array = to_array_buffer(value);

    if (uniform_function.indexOf('Matrix') > 0) {
        // Matrix uniforms.
        c.gl[uniform_function](uniform_handle, false, array);
    }
    else {
        // Scalar uniforms.
        c.gl[uniform_function](uniform_handle, array);
    }
}

var _attribute_type_map = {
    'float': ['FLOAT', 1],
    'vec2': ['FLOAT', 2],
    'vec3': ['FLOAT', 3],
    'vec4': ['FLOAT', 4],

    'int': ['INT', 1],
    'ivec2': ['INT', 2],
    'ivec3': ['INT', 3],
    'ivec4': ['INT', 4],
};
function get_attribute_info(type) {
    // type: vec2, ivec3, float, etc.
    return _attribute_type_map[type];
}

var _uniform_type_map = {
    'float': 'uniform1fv',
    'vec2': 'uniform2fv',
    'vec3': 'uniform3fv',
    'vec4': 'uniform4fv',

    'int': 'uniform1iv',
    'ivec2': 'uniform2iv',
    'ivec3': 'uniform3iv',
    'ivec4': 'uniform4iv',

    'mat2': 'uniformMatrix2fv',
    'mat3': 'uniformMatrix3fv',
    'mat4': 'uniformMatrix4fv',
};
function get_uniform_function(type) {
    // Find OpenGL uniform function.
    return _uniform_type_map[type];
}

var _gl_type_map = {
    VertexBuffer: 'ARRAY_BUFFER',
    IndexBuffer: 'ELEMENT_ARRAY_BUFFER',
    Texture2D: 'TEXTURE_2D',
};

function get_gl_type(object_type) {
    return _gl_type_map[object_type];
}

function parse_enum(c, str) {
    // Parse an enum or combination of enums stored in a string.
    var strs = str.split('|');
    var value = 0;
    for (var i = 0; i < strs.length; i++) {
        var name = strs[i].toUpperCase().trim();
        value = value | c.gl[name];
    }
    return value;
}



/* Glir queue prototype */
function GlirQueue() {
    this._queue = [];
}
GlirQueue.prototype.clear = function() {
    this._queue = [];
}
GlirQueue.prototype.append = function(e) {
    this._queue.push(e);
}
GlirQueue.prototype.append_multi = function(es) {
    for (var i = 0; i < es.length; i++) {
        this._queue.push(es[i]);
    }
}
GlirQueue.prototype.get = function() {
    return this._queue;
}
Object.defineProperty(GlirQueue.prototype, "length", {
    get: function() { return this._queue.length; },
});



/* Vispy canvas GLIR methods */
VispyCanvas.prototype.set_deferred = function(deferred) {
    this._deferred = deferred;
}

VispyCanvas.prototype.execute_pending_commands = function() {
    var q = this.glir_queue.get();
    if (q.length == 0) {
        return;
    }
    for (var i = 0; i < q.length; i++) {
        // console.debug(q[i]);
        this.command(q[i], false);
    }
    debug("Processed {0} events.".format(q.length));
    this.glir_queue.clear();
};

VispyCanvas.prototype.command = function(command, deferred) {
    if (deferred == undefined) {
        deferred = this._deferred;
    }
    var method = command[0].toLowerCase();
    if (deferred) {
        this.glir_queue.append(command);
    }
    else {
        this.glir[method](this, command.slice(1));
    }
};


/* Creation of vispy.gloo.glir */
define(function() {
    var glir = function() { };

    glir.prototype.init = function(c) {
        // Namespace with the table of all symbols used by GLIR.

        // The key is user-specified and is named the **id**.
        // The WebGL internal handle is called the **handle**.

        // For each id key, the value is an object with the following properties:
        // * object_type ('VertexBuffer', 'Program', etc.)
        // * handle (the WebGL internal handle, for all objects)
        // * data_type (for Buffers)
        // * offset (for Buffers)
        // * attributes (for Programs)
        // * uniforms (for Programs)
        c._ns = {};
        // Deferred mode is enabled by default.
        c._deferred = true;
        c.glir_queue = new GlirQueue();
        c.glir = this;
    };

    glir.prototype.current = function(c, args) {

    };

    glir.prototype.create = function(c, args) {
        var id = args[0];
        var cls = args[1];
        if (cls == 'VertexBuffer') {
            debug("Creating vertex buffer '{0}'.".format(id));
            c._ns[id] = {
                object_type: cls,
                handle: c.gl.createBuffer(),
                size: 0,  // current size of the buffer
            };
        }
        else if (cls == 'IndexBuffer') {
            debug("Creating index buffer '{0}'.".format(id));
            c._ns[id] = {
                object_type: cls,
                handle: c.gl.createBuffer(),
                size: 0,  // current size of the buffer
            };
        }
        else if (cls == 'Texture2D') {
            debug("Creating texture '{0}'.".format(id));
            c._ns[id] = {
                object_type: cls,
                handle: c.gl.createTexture(),
                size: 0,  // current size of the texture
                shape: [],
            };
        }
        else if (cls == 'Program') {
            debug("Creating program '{0}'.".format(id));
            c._ns[id] = {
                object_type: cls,
                handle: c.gl.createProgram(),
                attributes: {},
                uniforms: {},
                textures: {},
            };
        }
    };

    glir.prototype.delete = function(c, args) {
        var id = args[0];
        var cls = c._ns[id].object_type;
        var handle = c._ns[id].handle;
        if (cls == 'VertexBuffer') {
            debug("Deleting vertex buffer '{0}'.".format(id));
            c.gl.deleteBuffer(handle);
        }
        else if (cls == 'IndexBuffer') {
            debug("Deleting index buffer '{0}'.".format(id));
            c.gl.deleteBuffer(handle);
        }
        else if (cls == 'Texture2D') {
            debug("Deleting texture '{0}'.".format(id));
            c.gl.deleteTexture(handle);
        }
        else if (cls == 'Program') {
            debug("Deleting program '{0}'.".format(id));
            c.gl.deleteProgram(handle);
        }
    };

    glir.prototype.shaders = function(c, args) {
        var program_id = args[0];
        var vertex_code = args[1];
        var fragment_code = args[2];

        // Get the program handle.
        var handle = c._ns[program_id].handle;

        // Compile shaders.
        debug("Compiling shaders for program '{0}'.".format(program_id));
        var vs = compile_shader(c, 'VERTEX_SHADER', vertex_code);
        var fs = compile_shader(c, 'FRAGMENT_SHADER', fragment_code);

        // Attach shaders.
        debug("Attaching shaders for program '{0}'".format(program_id));
        attach_shaders(c, handle, vs, fs);
    }

    glir.prototype.size = function(c, args) {
        var object_id = args[0];
        var size = args[1];  // WARNING: size must be in bytes!
        var format = args[2];
        var object = c._ns[object_id];
        var object_handle = object.handle;
        var object_type = object.object_type;
        var gl_type = c.gl[get_gl_type(object_type)];

        // Textures.
        if (object_type.indexOf('Texture') >= 0) {
            // format is 'LUMINANCE', 'ALPHA', 'LUMINANCE_ALPHA', 'RGB' or 'RGBA'
            object.format = format.toUpperCase();
            debug("Setting texture size to {1} for '{0}'.".format(object_id, size));
            // HACK: it doesn't seem we can change the texture size without allocating
            // a buffer in WebGL, so we just store the size and format in the object,
            // and we'll use this information in the subsequent DATA call.
            // set_texture_data(c, object_handle, gl_type, c.gl[object.format],
            //     size[0], size[1], size)
        }
        // Buffers
        else
        {
            debug("Setting buffer size to {1} for '{0}'.".format(object_id, size));
            // Reuse the buffer if the existing size is not null.
            set_buffer_data(c, object_handle, gl_type, 0, size, false)
        }
        // Save the size.
        object.size = size;
    }

    glir.prototype.data = function(c, args) {
        var object_id = args[0];
        var offset = args[1];
        var data = args[2];
        var object = c._ns[object_id];
        var object_type = object.object_type; // VertexBuffer, IndexBuffer, or Texture2D
        var object_handle = object.handle;
        var gl_type = c.gl[get_gl_type(object_type)];

        // Get a TypedArray.
        var array = to_array_buffer(data);

        // Textures.
        if (object_type.indexOf('Texture') >= 0) {
            // The texture shape was specified in SIZE
            var shape = object.size;
            var width = shape[0];
            var height = shape[1];

            // The texture format was specified in SIZE.
            var format = c.gl[object.format];

            debug("Setting texture data for '{0}'.".format(object_id));
            // QUESTION: how to support offset for textures?
            set_texture_data(c, object_handle, gl_type, format, width, height, array);
            object.shape = shape;
        }
        // Buffers
        else
        {
            debug("Setting buffer data for '{0}'.".format(object_id));
            // Reuse the buffer if the existing size is not null.
            set_buffer_data(c, object_handle, gl_type, offset, array, object.size > 0);
            object.size = array.byteLength;
        }
    }

    glir.prototype.attribute = function(c, args) {
        var program_id = args[0];
        var name = args[1];
        var type = args[2];
        // TODO: support non-VBO data
        var vbo_id = args[3][0];
        var stride = args[3][1];
        var offset = args[3][2];

        var program_handle = c._ns[program_id].handle;

        debug("Creating attribute '{0}' for program '{1}'.".format(
                name, program_id
            ));
        var attribute_handle = create_attribute(c, program_handle, name);

        // Store the attribute handle in the attributes array of the program.
        c._ns[program_id].attributes[name] = {
            handle: attribute_handle,
            type: type,
            vbo_id: vbo_id,
            stride: stride,
            offset: offset,
        };
    }

    glir.prototype.uniform = function(c, args) {
        var program_id = args[0];
        var name = args[1];
        var type = args[2];
        var value = args[3];

        var program_handle = c._ns[program_id].handle;

        c.gl.useProgram(program_handle);

        // Check the cache.
        if (c._ns[program_id].uniforms[name] == undefined) {
            // If necessary, we create the uniform and cache both its handle and
            // GL function.
            debug("Creating uniform '{0}' for program '{1}'.".format(
                    name, program_id
                ));
            var uniform_handle = c.gl.getUniformLocation(program_handle, name);
            var uniform_function = get_uniform_function(type);
            // We cache the uniform handle and the uniform function name as well.
            c._ns[program_id].uniforms[name] = [uniform_handle, uniform_function];
        }

        debug("Setting uniform '{0}' to '{1}' with {2} elements.".format(
                name, value, value.length
            ));
        var uniform_info = c._ns[program_id].uniforms[name];
        var uniform_handle = uniform_info[0];
        var uniform_function = uniform_info[1];
        set_uniform(c, uniform_handle, uniform_function, value);
    }

    glir.prototype.texture = function(c, args) {
        var program_id = args[0];
        var sampler_name = args[1];
        var texture_id = args[2];
        // var texture_number = args[3];  // active texture

        var texture_handle = c._ns[texture_id].handle;
        var program_handle = c._ns[program_id].handle;
        // The texture number is the number of textures existing in the program.
        var texture_number = Object.keys(c._ns[program_id].textures).length;

        debug("Initializing texture '{0}' number {1} for program '{2}'.".format(
                texture_id, texture_number, program_id
            ));

        // Set the sampler uniform value.
        var sampler_handle = c.gl.getUniformLocation(program_handle, sampler_name);
        c.gl.uniform1i(sampler_handle, texture_number);

        c._ns[program_id].textures[texture_id] = {
            sampler_name: sampler_name,
            sampler_handle: sampler_handle,
            number: texture_number,
            handle: texture_handle,
        };
    }

    glir.prototype.interpolation = function(c, args) {
        var texture_id = args[0];
        var min = args[1];
        var mag = args[2];
        var texture_handle = c._ns[texture_id].handle;

        var gl_type = c.gl.TEXTURE_2D;
        c.gl.bindTexture(gl_type, texture_handle);
        c.gl.texParameteri(gl_type, c.gl.TEXTURE_MIN_FILTER, c.gl[min]);
        c.gl.texParameteri(gl_type, c.gl.TEXTURE_MAG_FILTER, c.gl[mag]);
        c.gl.bindTexture(gl_type, null);
    }

    glir.prototype.wrapping = function(c, args) {
        var texture_id = args[0];
        var wrapping = args[1];
        var texture_handle = c._ns[texture_id].handle;

        var gl_type = c.gl.TEXTURE_2D;
        c.gl.bindTexture(gl_type, texture_handle);
        c.gl.texParameteri(gl_type, c.gl.TEXTURE_WRAP_S, c.gl[wrapping[0]]);
        c.gl.texParameteri(gl_type, c.gl.TEXTURE_WRAP_T, c.gl[wrapping[1]]);
        c.gl.bindTexture(gl_type, null);
    }

    glir.prototype.draw = function(c, args) {
        var program_id = args[0];
        var mode = args[1].toUpperCase();
        var selection = args[2];

        var program_handle = c._ns[program_id].handle;
        var attributes = c._ns[program_id].attributes;
        var textures = c._ns[program_id].textures;

        // Activate all attributes in the program.
        for (attribute_name in attributes) {
            var attribute = attributes[attribute_name];
            debug("Activating attribute '{0}' for program '{1}'.".format(
                attribute_name, program_id));
            activate_attribute(c, attribute.handle, attribute.vbo_id,
                attribute.type, attribute.stride, attribute.offset);
        }

        // Activate all textures in the program.
        for (texture_id in textures) {
            var texture = textures[texture_id];
            debug("Activating texture '{0}' for program '{1}'.".format(
                texture_id, program_id));
            activate_texture(c, texture.handle, texture.sampler_handle, texture.number);
        }

        // Activate the program.
        c.gl.useProgram(program_handle);

        // Draw the program.
        if (selection.length == 2) {
            // Draw the program without index buffer.
            var start = selection[0];
            var count = selection[1];
            debug("Rendering program '{0}' with {1}.".format(
                program_id, mode));
            c.gl.drawArrays(c.gl[mode], start, count);
        }
        else if (selection.length == 3) {
            // Draw the program with index buffer.
            var index_buffer_id = selection[0];
            var index_buffer_type = selection[1];
            var count = selection[2];
            // Get the index buffer handle from the namespace.
            var index_buffer_handle = c._ns[index_buffer_id].handle;
            debug("Rendering program '{0}' with {1} and index buffer '{2}'.".format(
                program_id, mode, index_buffer_id));
            // Activate the index buffer.
            c.gl.bindBuffer(c.gl.ELEMENT_ARRAY_BUFFER, index_buffer_handle);
            c.gl.drawElements(c.gl[mode], count, c.gl[index_buffer_type], 0);
        }

        // Deactivate attributes.
        for (attribute_name in attributes) {
            debug("Deactivating attribute '{0}' for program '{1}'.".format(
                attribute_name, program_id));
            deactivate_attribute(c, attributes[attribute_name].handle);
        }
    }

    glir.prototype.func = function(c, args) {
        var name = args[0];
        debug("Calling {0}({1}).".format(name, args.slice(1)));

        // Handle enums: replace strings by global GL variables.
        for (var i = 1; i < args.length; i++) {
            if (typeof args[i] === 'string') {
                args[i] = parse_enum(c, args[i]);
            }
        }

        var func = c.gl[name];
        var func_args = args.slice(1)
        func.apply(c.gl, func_args);
    };

    return new glir();
});
