FL.Unit.JumpAnimation = function(unit) {
	FL.Unit.JumpAnimation._super.call(this, unit);
	this.xyTo = FL.ijToXy(unit.ij.get());
	this.opacityTo = unit.visible ? 1 : 0;
};

JW.extend(FL.Unit.JumpAnimation, FL.Unit.Animation, {
	immediate: true,

	animate: function() {
		this.unit.xy.set(this.xyTo);
		this.unit.opacity.set(this.opacityTo);
		return true;
	}
});
