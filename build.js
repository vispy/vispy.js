({
    optimize: "uglify2",
    baseUrl: "scripts",
    paths: {
        "screenfull": "lib/screenfull.min",
    },
    name: "vispy",
    out: "dist/vispy.min.js",
    uglify2: {
        compress: true,
        beautify: false,
    },
})
