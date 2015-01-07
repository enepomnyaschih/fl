FL.Data.AnimationManager = function(data) {
	FL.Data.AnimationManager._super.call(this);
	this.data = data; // FL.Data
	this.animationQueue = []; // <FL.Unit>
	this.lastHit = new Date().getTime();
	this.lastHitRounded = this.lastHit;
	this.changePlayerOnFinish = false;
	this.timer = this.own(new JW.Property(
		new JW.Interval(this._onInterval, this, 17))).ownValue();
	this.success = true;
};

JW.extend(FL.Data.AnimationManager, JW.Class, {
	enqueue: function(unit) {
		if (!JW.Array.containsItem(this.animationQueue, unit)) {
			this.animationQueue.push(unit);
		}
	},

	animate: function() {
		this.animateAll();
		if (this.animationQueue.length === 0) {
			if (this.data.ai && !this.data.ai.doSomething()) {
				this.changePlayerOnFinish = true;
			}
			if (this.changePlayerOnFinish) {
				this.changePlayerOnFinish = false;
				this.data.nextPlayer();
			}
		}
	},

	animateSingle: function() {
		while (this.animationQueue.length) {
			var unit = this.animationQueue[0];
			if (this._animateUnit(unit)) {
				this.animationQueue.shift();
				// continue to stack up the immediate animations
			} else {
				break;
			}
		}
	},

	animateAll: function() {
		var units = this.animationQueue;
		this.animationQueue = [];
		for (var i = 0, l = units.length; i < l; ++i) {
			var unit = units[i];
			if (!this._animateUnit(unit)) {
				this.animationQueue.push(unit);
			}
		}
	},

	animateParticles: function(timeSpent) {
		this.data.particles.$toArray().each(function(particle) {
			if (particle.animate(timeSpent)) {
				this.data.particles.removeItem(particle);
			}
		}, this);
	},

	addParticles: function(xy, config) {
		if (!config) {
			return;
		}
		for (var i = 0; i < config.originCount; ++i) {
			var origin = FL.Vector.mult(this._randomVectorInCircle(), config.originDistance);
			var xyOrigin = FL.Vector.add(xy, FL.Vector.mult(origin, FL.cellSize));
			for (var j = 0; j < config.spreadCount; ++j) {
				var spread = FL.Vector.mult(this._randomVectorInCircle(), config.spreadDistance);
				this.data.particles.add(new FL.Data.Particle(JW.apply({}, config.particle, {
					xyFrom: xyOrigin,
					xyTo: FL.Vector.add(xyOrigin, FL.Vector.mult(spread, FL.cellSize)),
					radiusFrom: this._convertRadius(config.particle.radiusFrom),
					radiusTo: this._convertRadius(config.particle.radiusTo),
					radius: this._convertRadius(config.particle.radius)
				})));
			}
		}
	},

	// returns true if unit animation is finished
	_animateUnit: function(unit) {
		while (unit.animations.length) {
			var animation = unit.animations[0];
			if (!animation.inited) {
				animation.inited = true;
				animation.init();
			}
			if (!animation.animate()) {
				return false;
			}
			unit.animations.shift();
			if (!animation.immediate) {
				return false;
			}
		}
		return true;
	},

	_onInterval: function() {
		if (!this.success) {
			this.timer.set(null);
			return;
		}
		this.success = false;
		var hit = new Date().getTime();
		while (this.lastHitRounded < hit) {
			this.lastHitRounded += 1000 / FL.animationStepsPerSecond;
			this.animate();
		}
		this.animateParticles(hit - this.lastHit);
		this.lastHit = hit;
		this.success = true;
	},

	_randomRadiusVector: function() {
		var angle = 2 * Math.PI * Math.random();
		return [Math.cos(angle), Math.sin(angle)];
	},

	_randomVectorInCircle: function() {
		return FL.Vector.mult(this._randomRadiusVector(), Math.random());
	},

	_convertRadius: function(value) {
		return (value == null) ? null : (FL.cellSize * value);
	}
});
