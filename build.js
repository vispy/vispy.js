({
    optimize: 'uglify2',
    baseUrl: "scripts",
    paths: {
        "jquery": "lib/jquery-ui/external/jquery/jquery",
        "jqueryui": "lib/jquery-ui/jquery-ui.min",
        "jquery-mousewheel": "lib/jquery.mousewheel.min",
        "screenfull": "lib/screenfull.min",
    },
    name: "vispy",
    out: "dist/vispy.min.js",
    uglify2: {
        compress: null,
    },
})
