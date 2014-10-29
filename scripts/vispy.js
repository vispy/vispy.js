// Require paths.
require.config({
    paths: {
        // "jquery": "lib/jquery-ui/external/jquery/jquery",
        // "jquery": "lib/jquery.min",
        // "jqueryui": "lib/jquery-ui/jquery-ui.min",
        // "jquery-mousewheel": "lib/jquery.mousewheel.min",
        "screenfull": "lib/screenfull.min",
    }
});

function VispyCanvas($el) {
    this.$el = $el;
}

// Vispy library entry point.
define(["events", "gloo", "util", "data"],
    function(events, gloo) {
        var vispy = function() {
            // Constructor of the Vispy library.
            this.events = events;
            this.gloo = gloo;

            // List of canvases on the page.
            this._canvases = [];
        };

        vispy.prototype.init = function(canvas_id) {
            var canvas_el;
            if (typeof canvas_id === 'string') {
                canvas_el = $(canvas_id);
            }
            else {
                canvas_el = canvas_id;
            }
            // Initialize the canvas.
            var canvas = new VispyCanvas(canvas_el);

            canvas.deactivate_context_menu();

            // Initialize events.
            this.events.init(canvas);

            // Initialize WebGL.
            this.gloo.init(canvas);

            // Register the canvas.
            this._canvases.push(canvas);

            return canvas;
        };



        /* Event loop */
        vispy.prototype.start_event_loop = function() {
            window.requestAnimFrame = (function(){
                  return  window.requestAnimationFrame       ||
                          window.webkitRequestAnimationFrame ||
                          window.mozRequestAnimationFrame    ||
                          function(c){
                            window.setTimeout(c, 1000. / 60.);
                          };
            })();

            // "that" is the current vispy instance.
            var that = this;
            (function animloop() {
                that._request_id = requestAnimFrame(animloop);
                try {
                    // Call event_tick() on all active canvases.
                    for (var i = 0; i < that._canvases.length; i++) {
                        that._canvases[i].event_tick();
                    }
                }
                catch(err) {
                    that.stop_event_loop();
                    throw (err);
                }
            })();
        };

        vispy.prototype.stop_event_loop = function() {
            window.cancelAnimationFrame(this._request_id);
        };


        return new vispy();
});
