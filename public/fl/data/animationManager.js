FL.Data.AnimationManager = function(data) {
	FL.Data.AnimationManager._super.call(this);
	this.data = data; // FL.Data
	this.animationQueue = []; // <FL.Unit>
	this.lastHit = new Date().getTime();
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
		if (!this.success) {
			this.timer.set(null);
			return;
		}
		this.success = false;
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
		this.success = true;
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

	// returns true if unit animation is finished
	_animateUnit: function(unit) {
		while (unit.animations.length) {
			var animation = unit.animations[0];
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
		var hit = new Date().getTime();
		while (this.lastHit < hit) {
			this.lastHit += 1000 / FL.animationStepsPerSecond;
			this.animate();
		}
	}
});
