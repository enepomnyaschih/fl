// Stupid jQuery UI effects core takes >5 seconds to initialize.
// Screw that crap. I just need this easing
$.easing["easeOutQuad"] = function(p) {
	return 1 - Math.pow(1 - p, 2);
};
