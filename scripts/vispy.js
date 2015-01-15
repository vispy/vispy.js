var screenful = require("./lib/screenfull.min.js");
var jquerymousewheel = require("./lib/jquery.mousewheel.min.js");
var gloo = require('./gloo.js');
var events = require('./events.js');
var util = require('./util.js');
var data = require('./data.js');


function VispyCanvas($el) {
    this.$el = $el;
}

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


module.exports = new vispy();
