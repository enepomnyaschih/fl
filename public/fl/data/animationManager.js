FL.Data.AnimationManager = function(data) {
	FL.Data.AnimationManager._super.call(this);
	this.data = data; // FL.Data
	this.animationQueue = []; // <FL.Unit>
	this.sequential = false;
	this.lastHit = new Date().getTime();
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

	startSequentialAnimation: function() {
		this.sequential = true;
	},

	animate: function() {
		if (!this.success) {
			this.timer.set(null);
			return;
		}
		this.success = false;
		if (!this.sequential) {
			this.animateAll();
		} else {
			if (this.data.player === 0) {
				this.animateAll();
			} else {
				this.animateSingle();
			}
			if (this.animationQueue.length === 0) {
				this.sequential = false;
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
