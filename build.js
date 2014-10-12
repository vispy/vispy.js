({
    optimize: 'uglify2',
    baseUrl: "scripts",
    paths: {
        "jquery": "lib/jquery-ui/external/jquery/jquery",
        "jquery-mousewheel": "lib/jquery.mousewheel.min",
        "jquery-ui": "lib/jquery-ui/jquery-ui.min",
        "screenfull": "lib/screenfull.min",
    },
    name: "vispy",
    out: "dist/vispy.min.js",
    uglify2: {
        compress: null,
    },
})
