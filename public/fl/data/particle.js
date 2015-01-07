FL.Data.Particle = function(config) {
	FL.Data.Particle._super.call(this);
	config = config || {};
	this.xyFrom = config.xyFrom || config.xy;
	this.xyTo = config.xyTo || config.xy;
	this.colorFrom = config.colorFrom || config.color;
	this.colorTo = config.colorTo || config.color;
	this.opacityFrom = JW.defn(JW.defn(config.opacityFrom, config.opacity), 1);
	this.opacityTo = JW.defn(JW.defn(config.opacityTo, config.opacity), 1);
	this.radiusFrom = config.radiusFrom || config.radius;
	this.radiusTo = config.radiusTo || config.radius;
	this.progress = 0;
	this.duration = config.duration || 1000;
	this.xy = this.own(new JW.Property(this.xyFrom));
	this.color = this.own(new JW.Property(this.colorFrom));
	this.opacity = this.own(new JW.Property(this.opacity));
	this.radius = this.own(new JW.Property(this.radiusFrom));
};

JW.extend(FL.Data.Particle, JW.Class, {
	animate: function(timeSpent) {
		this.progress = Math.min(1, this.progress + timeSpent / this.duration);

		var radius = (1 - this.progress) * this.radiusFrom + this.progress * this.radiusTo;
		var xyCenter = FL.Vector.between(this.xyFrom, this.xyTo, this.progress);
		this.xy.set(FL.Vector.diff(xyCenter, [radius, radius]));
		this.color.set(JW.Color.str(JW.Color.gradient(this.colorFrom, this.colorTo, this.progress)));
		this.opacity.set((1 - this.progress) * this.opacityFrom + this.progress * this.opacityTo);
		this.radius.set(radius);

		return this.progress === 1;
	}
});
