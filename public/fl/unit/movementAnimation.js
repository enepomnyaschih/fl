FL.Unit.MovementAnimation = function(unit) {
	FL.Unit.MovementAnimation._super.call(this, unit);
	this.xyFrom = null;
	this.opacityFrom = null;
	this.xyTo = FL.ijToXy(unit.ij.get());
	this.opacityTo = unit.visible[0] ? 1 : 0;
	this.speed = this.animationsPerSecond * unit.type.movement / FL.animationStepsPerSecond;
	this.progress = 0;
	this.func = null;
	this.duration = 0;
};

JW.extend(FL.Unit.MovementAnimation, FL.Unit.Animation, {
	animationsPerSecond: 4,

	animate: function() {
		if (!this.xyFrom) {
			this.xyFrom = this.unit.xy.get();
			this.opacityFrom = this.unit.opacity.get();
			this.func = (this.unit.animations.length === 1) ? this._slowDownFunc : this._flatFunc;
			this.duration = (this.unit.animations.length === 1) ? 2 : 1;
		}
		this.progress = Math.min(this.duration, this.progress + this.speed);

		var value = this.func(this.progress);
		this.unit.xy.set(FL.Vector.between(this.xyFrom, this.xyTo, value));
		this.unit.opacity.set((1 - value) * this.opacityFrom + value * this.opacityTo);
		return this.progress === this.duration;
	},

	_slowDownFunc: function(progress) {
		return progress - progress * progress / 4;
	},

	_flatFunc: function(progress) {
		return progress;
	}
});
