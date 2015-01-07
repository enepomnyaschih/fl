FL.Unit.Animation = function(unit) {
	FL.Unit.Animation._super.call(this);
	this.unit = unit; // FL.Unit;
	this.inited = false;
};

JW.extend(FL.Unit.Animation, JW.Class, {
	// returns true if animation is finished
	// abstract Boolean animate();

	immediate: false,

	init: function() {
	}
});
