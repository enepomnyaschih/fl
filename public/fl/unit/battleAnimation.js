FL.Unit.BattleAnimation = function(data, unit, unitDamage, unitVictims, target, targetDamage, targetVictims) {
	FL.Unit.BattleAnimation._super.call(this, unit);
	this.data = data; // FL.Data
	this.unitSide = new FL.Unit.BattleAnimation.Side(this.data, unit, unitDamage, unitVictims);
	this.targetSide = new FL.Unit.BattleAnimation.Side(this.data, target, targetDamage, targetVictims);
	this.speed = this.animationsPerSecond / FL.animationStepsPerSecond;
	this.progress = 0;
	this.duration = 0;
};

JW.extend(FL.Unit.BattleAnimation, FL.Unit.Animation, {
	animationsPerSecond: 1,

	animate: function() {
		this.progress = Math.min(1, this.progress + this.speed);
		this.unitSide.animate(this.progress);
		this.targetSide.animate(this.progress);
		return this.progress === 1;
	}
});



FL.Unit.BattleAnimation.Side = function(data, unit, damage, victims) {
	FL.Unit.BattleAnimation.Side._super.call(this);
	this.data = data;
	this.unit = unit;
	this.damage = damage;
	this.victims = victims;
	this.shots = 0;
	this.shotAnimation = this.unit.type.shotAnimation;
	this.deathAnimation = this.unit.type.deathAnimation;
};

JW.extend(FL.Unit.BattleAnimation.Side, JW.Class, {
	animate: function(progress) {
		var shots = Math.round(this.shotAnimation.countPerDamage * progress * this.damage);
		while (this.shots < shots) {
			++this.shots;
			this.data.animationManager.addParticles(this.unit.getCenter(), this.shotAnimation);
		}
		if (progress === 1) {
			for (var i = 0; i < this.victims; ++i) {
				this.data.animationManager.addParticles(this.unit.getCenter(), this.deathAnimation);
			}
			if (!this.unit.alive) {
				this.data.destroyUnit(this.unit);
			}
		}
	}
});
