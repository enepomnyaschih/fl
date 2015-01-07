FL.Monitor.Particle = function(particle) {
	FL.Monitor.Particle._super.call(this);
	this.particle = particle; // FL.Data.Particle
};

JW.extend(FL.Monitor.Particle, JW.UI.Component, {
	renderRoot: function(el) {
		el.addClass("fl-monitor-particle");
		this.own(new FL.PositionUpdater(el, this.particle.xy));
		this.own(new JW.UI.CssUpdater(el, "background-color", this.particle.color));
		this.own(new JW.UI.CssUpdater(el, "opacity", this.particle.opacity));

		var radius = this.own(new JW.Functor([this.particle.radius], function(value) {
			return Math.round(value) + "px";
		}, this)).target;
		this.own(new JW.UI.CssUpdater(el, "border-radius", radius));

		var size = this.own(new JW.Functor([this.particle.radius], function(value) {
			return Math.round(2 * value) + "px";
		}, this)).target;
		this.own(new JW.UI.CssUpdater(el, "width", size));
		this.own(new JW.UI.CssUpdater(el, "height", size));
	}
})
