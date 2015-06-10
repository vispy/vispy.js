""" PyScript module for gloo.js
Lightweight gloo
"""

from flexx.pyscript import window, document, undefined


def check_error(gl, when='periodic check'):
    """ Check this from time to time to detect GL errors.

    Parameters
    ----------
    when : str
        Shown in the exception to help the developer determine when
        this check was done.
    """

    errors = []
    while True:
        err = gl.getError()
        if err == gl.NO_ERROR or (errors and err == errors[-1]):
            break
        errors.append(err)
    if len(errors):
        msg = ''
        for e in errors:
            msg += e
        raise RuntimeError('OpenGL got errors (%s): %s' % (when, msg))


class GlooObject(object):
    """ Abstract base class for all Gloo classes.
    """
    
    def __init__(self, gl):
        self._gl = gl
        self._handle = None  # should be set in _init()
        self._create()
        assert self._handle is not None

    def _create(self):
        raise NotImplementedError()


class Program(GlooObject):
    """ The program.
    combines vertex and fragment shader
    """
    
    UTYPEMAP = {
        'float': 'uniform1fv',
        'vec2': 'uniform2fv',
        'vec3': 'uniform3fv',
        'vec4': 'uniform4fv',
        'int': 'uniform1iv',
        'ivec2': 'uniform2iv',
        'ivec3': 'uniform3iv',
        'ivec4': 'uniform4iv',
        'bool': 'uniform1iv',
        'bvec2': 'uniform2iv',
        'bvec3': 'uniform3iv',
        'bvec4': 'uniform4iv',
        'mat2': 'uniformMatrix2fv',
        'mat3': 'uniformMatrix3fv',
        'mat4': 'uniformMatrix4fv',
        'sampler1D': 'uniform1i',
        'sampler2D': 'uniform1i',
        'sampler3D': 'uniform1i',
    }
    
    ATYPEINFO = {
        'float': (1, 5126) ,
        'vec2': (2, 5126),
        'vec3': (3, 5126),
        'vec4': (4, 5126),
    }
    
    def _create(self):
        self._handle = self._gl.createProgram()
        self._handles = []
        self._unset_variables = []
        self._validated = False
        self._samplers = {}  # name -> (tex-target, tex-handle, unit)
        self._attributes = {}  # name -> (vbo-handle, attr-handle, func, args)
        self._known_invalid = []
    
    def delete(self):
        self._gl.deleteProgram(self._handle)
    
    def activate(self):
        self._gl.useProgram(self._handle)
    
    def deactivate(self):
        self._gl.useProgram(0)
    
    def set_shaders(self, vert, frag):
        """ This function takes care of setting the shading code and
        compiling+linking it into a working program object that is ready
        to use.
        """
        gl = self._gl
        self._linked = False
        # Create temporary shader objects
        vert_handle = gl.createShader(gl.VERTEX_SHADER)
        frag_handle = gl.createShader(gl.FRAGMENT_SHADER)
        # For both vertex and fragment shader: set source, compile, check
        tmp = [(vert, vert_handle, 'vertex'), (frag, frag_handle, 'fragment')]
        for i in range(2):
            code, handle, type_ = tmp[i]
            gl.shaderSource(handle, code)
            gl.compileShader(handle)
            status = gl.getShaderParameter(handle, gl.COMPILE_STATUS)
            if not status:
                errors = gl.getShaderInfoLog(handle)
                raise RuntimeError('errors in ' + type_ + ' shader:\n' + errors)
        # Attach shaders
        gl.attachShader(self._handle, vert_handle)
        gl.attachShader(self._handle, frag_handle)
        # Link the program and check
        gl.linkProgram(self._handle)
        if not gl.getProgramParameter(self._handle, gl.LINK_STATUS):
            raise RuntimeError("Program link error:\n" + 
                               gl.getProgramInfoLog(self._handle))

        # Now we can remove the shaders. We no longer need them and it
        # frees up precious GPU memory:
        # http://gamedev.stackexchange.com/questions/47910
        gl.detachShader(self._handle, vert_handle)
        gl.detachShader(self._handle, frag_handle)
        gl.deleteShader(vert_handle)
        gl.deleteShader(frag_handle)
        # Now we know what variables will be used by the program
        self._unset_variables = self._get_active_attributes_and_uniforms()
        self._handles = {}
        self._known_invalid = []
        self._linked = True
    
    def _get_active_attributes_and_uniforms(self):
        """ Retrieve active attributes and uniforms to be able to check that
        all uniforms/attributes are set by the user.
        """
        gl = self._gl
        # This match a name of the form "name[size]" (= array)
        regex = RegExp("""(\w+)\s*(\[(\d+)\])\s*""")
        # Get how many active attributes and uniforms there are
        cu = gl.getProgramParameter(self._handle, gl.ACTIVE_UNIFORMS)
        ca = gl.getProgramParameter(self._handle, gl.ACTIVE_ATTRIBUTES)
        # Get info on each one
        attributes = []
        uniforms = []
        for x in [(attributes, ca, gl.getActiveAttrib),
                  (uniforms, cu, gl.getActiveUniform)]:
            container, count, func = x
            for i in range(count):
                info = func.call(gl, self._handle, i)
                name = info.name
                m = name.match(regex)  # Check if xxx[0] instead of xx
                if m:
                    name = m.group(0)
                    for i in range(info.size):
                        container.append(('%s[%d]' % (name, i), info.type))
                else:
                    container.append((name, info.type))
        #return attributes, uniforms
        # todo: PyScript does not yet support list comprehensions
        # return [v[0] for v in attributes] + [v[0] for v in uniforms]
        x = []
        for v in attributes:
            x.append(v[0])
        for v in uniforms:
            x.append(v[0])
        return x
    
    def set_texture(self, name, value):
        """ Set a texture sampler. Value is the id of the texture to link.
        """
        if not self._linked:
            raise RuntimeError('Cannot set uniform when program has no code')
        # Get handle for the uniform, first try cache
        handle = self._handles.get(name, -1)
        if handle < 0:
            if name in self._known_invalid:
                return
            handle = self._gl.getUniformLocation(self._handle, name)
            if name in self._unset_variables:
                self._unset_variables.remove(name)  # Mark as set
            self._handles[name] = handle  # Store in cache
            if handle < 0:
                self._known_invalid.append(name)
                print('Variable %s is not an active uniform' % name)
                return
        # Program needs to be active in order to set uniforms
        self.activate()
        if True:
            # Sampler: the value is the id of the texture
            unit = len(self._samplers.keys())
            if name in self._samplers:
                unit = self._samplers[name][-1]  # Use existing unit            
            self._samplers[name] = value._target, value._handle, unit
            self._gl.uniform1i(handle, unit)
    
    def set_uniform(self, name, type_, value):
        """ Set a uniform value. Value is assumed to have been checked.
        """
        if not self._linked:
            raise RuntimeError('Cannot set uniform when program has no code')
        # Get handle for the uniform, first try cache
        handle = self._handles.get(name, -1)
        count = 1
        if handle < 0:
            if name in self._known_invalid:
                return
            handle = self._gl.getUniformLocation(self._handle, name)
            if name in self._unset_variables:
                self._unset_variables.remove(name)
            # if we set a uniform_array, mark all as set
            if not type_.startswith('mat'):
                count = value.length // (self.ATYPEINFO[type_][0])
            if count > 1:
                for ii in range(count):
                    if '%s[%s]' % (name, ii) in self._unset_variables:
                        name_ = '%s[%s]' % (name, ii)
                        if name_ in self._unset_variables:
                            self._unset_variables.remove(name_)
            self._handles[name] = handle  # Store in cache
            if handle < 0:
                self._known_invalid.add(name)
                logger.info('Variable %s is not an active uniform' % name)
                return
        # Look up function to call
        funcname = self.UTYPEMAP[type_]
        # Program needs to be active in order to set uniforms
        self.activate()
        self._gl[funcname](handle, value)
    
    # todo: Better api
    def set_attribute(self, name, type_, value):
        """ Set an attribute value. Value is assumed to have been checked.
        """
        if not self._linked:
            raise RuntimeError('Cannot set attribute when program has no code')
        
        # Get handle for the attribute, first try cache
        handle = self._handles.get(name, -1)
        if handle < 0:
            if name in self._known_invalid:
                return
            handle = self._gl.getAttribLocation(self._handle, name)
            if name in self._unset_variables:
                self._unset_variables.remove(name)  # Mark as set
            self._handles[name] = handle  # Store in cache
            if handle < 0:
                self._known_invalid.append(name)
                if value[0] != 0 and value[2] > 0:  # VBO with offset
                    return  # Probably an unused element in a structured VBO
                print('Variable %s is not an active attribute' % name)
                return
        # Program needs to be active in order to set uniforms
        self.activate()
        # Triage depending on VBO or tuple data
        if value[0] == 0:
            # Look up function call
            funcname = self.ATYPEMAP[type_]
            # Set data
            self._attributes[name] = 0, handle, funcname, value[1:]
        else:
            # Get meta data
            vbo, stride, offset = value
            size, gtype = self.ATYPEINFO[type_]
            # Set data
            funcname = 'vertexAttribPointer'
            args = size, gtype, self._gl.FALSE, stride, offset
            self._attributes[name] = vbo._handle, handle, funcname, args

    def _pre_draw(self):
        self.activate()
        # Activate textures
        for x in self._samplers.values():
            tex_target, tex_handle, unit = x
            self._gl.activeTexture(self._gl.TEXTURE0 + unit)
            self._gl.bindTexture(tex_target, tex_handle)
        # Activate attributes
        for x in self._attributes.values():
            vbo_handle, attr_handle, funcname, args = x
            if vbo_handle:
                self._gl.bindBuffer(self._gl.ARRAY_BUFFER, vbo_handle)
                self._gl.enableVertexAttribArray(attr_handle)
                self._gl[funcname](attr_handle, *args)
            else:
                self._gl.bindBuffer(self._gl.ARRAY_BUFFER, 0)
                self._gl.disableVertexAttribArray(attr_handle)
                self._gl[funcname](attr_handle, *args)
        # Validate. We need to validate after textures units get assigned
        if not self._validated:
            self._validated = True
            self._validate()
    
    def _validate(self):
        # Validate ourselves
        if len(self._unset_variables):
            print('Program has unset variables: %s' %
                        self._unset_variables)
        # Validate via OpenGL
        self._gl.validateProgram(self._handle)
        if not self._gl.getProgramParameter(self._handle, 
                                            self._gl.VALIDATE_STATUS):
            print(self._gl.getProgramInfoLog(self._handle))
            raise RuntimeError('Program validation error')
    
    def draw(self, mode, selection):
        """ Draw program in given mode, with given selection (IndexBuffer or
        first, count).
        """
        if not self._linked:
            raise RuntimeError('Cannot draw program if code has not been set')
        # Init
        check_error(self._gl, 'before draw')
        # Draw
        if len(selection) == 3:
            # Selection based on indices
            id_, gtype, count = selection
            if count:
                self._pre_draw()
                ibuf = self._gl._objects.get(id_, None)
                ibuf.activate()
                self._gl.drawElements(mode, count, gtype, None)
                ibuf.deactivate()
        else:
            # Selection based on start and count
            first, count = selection
            if count:
                self._pre_draw()
                self._gl.drawArrays(mode, first, count)
        # Wrap up
        e = self._gl.getError()
        check_error(self._gl, 'after draw')


class Buffer(GlooObject):
    _target = None
    _usage = 35048  # DYNAMIC_DRAW - STATIC_DRAW, STREAM_DRAW or DYNAMIC_DRAW
    
    def _create(self):
        self._handle = self._gl.createBuffer()
        self._buffer_size = 0
    
    def delete(self):
        self._gl.deleteBuffer(self._handle)
    
    def activate(self):
        self._gl.bindBuffer(self._target, self._handle)
    
    def deactivate(self):
        self._gl.bindBuffer(self._target, 0)
    
    # todo: is this not always 32bit? for attributes yes...
    def set_size(self, nbytes):  # in bytes
        if nbytes != self._buffer_size:
            self.activate()
            self._gl.bufferData(self._target, nbytes, self._usage)
            self._buffer_size = nbytes
    
    #  todo: make possible to also resize here, first init, flag?
    def set_data(self, offset, data):
        self.activate()
        nbytes = len(data) * data.BYTES_PER_ELEMENT
        self._gl.bufferSubData(self._target, offset, data)


class VertexBuffer(Buffer):
    _target = 34962  # ARRAY_BUFFER
    

class IndexBuffer(Buffer):
    _target = 34963  # ELEMENT_ARRAY_BUFFER


class Texture2D(GlooObject):
    _target = 3553  # TEXTURE_2D
    
    _types = {
        'Int8Array': 5120,  # BYTE,
        'Uint8Array': 5121,  # UNSIGNED_BYTE,
        'Int16Array': 5122,  # SHORT,
        'Uint16Array': 5123,  # UNSIGNED_SHORT,
        'Int32Array': 5124,  # INT,
        'Int32Array': 5125,  # UNSIGNED_INT,
        # 'xx' : gl.GL_HALF_FLOAT,
        'Float32Array': 5126,  # FLOAT,
        # 'Float64Array' : gl.GL_DOUBLE
    }
    
    def _create(self):
        self._handle = self._gl.createTexture()
        self._shape_format = None  # To make setting size cheap
    
    def delete(self):
        self._gl.deleteTexture(self._handle)
    
    def activate(self):
        self._gl.bindTexture(self._target, self._handle)
    
    def deactivate(self):
        self._gl.bindTexture(self._target, 0)
    
    # Taken from pygly
    def _get_alignment(self, width):
        """Determines a textures byte alignment.

        If the width isn't a power of 2
        we need to adjust the byte alignment of the image.
        The image height is unimportant

        www.opengl.org/wiki/Common_Mistakes#Texture_upload_and_pixel_reads
        """
        # we know the alignment is appropriate
        # if we can divide the width by the
        # alignment cleanly
        # valid alignments are 1,2,4 and 8
        # put 4 first, since it's the default
        alignments = [4, 8, 2, 1]
        for alignment in alignments:
            if width % alignment == 0:
                return alignment
    
    def set_wrapping(self, wrap_s, wrap_t):
        self.activate()
        self._gl.texParameterf(self._target, self._gl.TEXTURE_WRAP_S, wrap_s)
        self._gl.texParameterf(self._target, self._gl.TEXTURE_WRAP_T, wrap_t)
    
    def set_interpolation(self, min, mag):
        self.activate()
        self._gl.texParameterf(self._target, self._gl.TEXTURE_MIN_FILTER, min)
        self._gl.texParameterf(self._target, self._gl.TEXTURE_MAG_FILTER, mag)
    
    def set_size(self, shape, format):
        # Shape is height, width
        height, width = shape
        if (height, width, format) != self._shape_format:
            self._shape_format = height, width, format
            self.activate()
            self._gl.texImage2D(self._target, 0, format, width, height, 0, format, 
                                self._gl.UNSIGNED_BYTE, null)
    
    def set_data(self, offset, shape, data):
        self.activate()
        format = self._shape_format[2]
        height, width = shape
        y, x = offset
        # Get gtype
        gtype = self._types.get(data.constructor.name, None)
        if gtype is None:
            raise ValueError("Type %s not allowed for texture" % 
                             data.constructor.name)
        # Set alignment (width is nbytes_per_pixel * npixels_per_line)
        alignment = self._get_alignment(shape[-2]*shape[-1])
        if alignment != 4:
            self._gl.pixelStorei(self._gl.UNPACK_ALIGNMENT, alignment)
        # Upload
        self._gl.texSubImage2D(self._target, 0, x, y, width, height, 
                               format, gtype, data)
        if alignment != 4:
            self._gl.pixelStorei(self._gl.UNPACK_ALIGNMENT, 4)


if __name__ == '__main__':
    import os
    from flexx.pyscript.functions import script2js
    script2js(__file__, 'gloo2')
    
    # AK: small hack to easily deploy for Bokeh
    bokehdir = '/home/almar/dev/pylib/bokeh/bokehjs/src/vendor/gloo/'
    if os.path.isdir(bokehdir):
        script2js(__file__, 'gloo2', bokehdir + 'gloo2.js')
