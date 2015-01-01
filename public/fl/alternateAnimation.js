// replacement for CSS animation, because one takes too much CPU
FL.AlternateAnimation = function(config) {
	FL.AlternateAnimation._super.call(this);
	this.updater = config.updater;
	this.finish = config.finish;
	this.scope = config.scope || this;
	this.time = new Date().getTime();
	this.own(new JW.Interval(this._animate, this, 40));
};

JW.extend(FL.AlternateAnimation, JW.Class, {
	destroy: function() {
		if (this.finish) {
			this.finish.call(this.scope);
		}
		this._super();
	},

	_animate: function() {
		var value = new Date().getTime() - this.time;
		value = Math.abs(JW.smod(value, 1000)) / 500;
		if (this.updater) {
			this.updater.call(this.scope, value);
		}
	}
});
