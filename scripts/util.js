// First, checks if it isn't implemented yet.
if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) { 
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}

function is_array(x) {
    return (Object.prototype.toString.call(x) === '[object Array]');
}

var VISPY_DEBUG = false;
function debug(msg) {
    if (VISPY_DEBUG){
        console.debug(msg);
    }
}