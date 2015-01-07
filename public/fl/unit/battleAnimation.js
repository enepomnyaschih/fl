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
	shotAnimation: {
		originCount: 1,
		spreadCount: 1,
		originDistance: .4,
		spreadDistance: 0,
		particle: {
			colorFrom: "#FF0",
			colorTo: "#000",
			opacityFrom: 1,
			opacityTo: 0,
			radius: 3,
			duration: 800
		}
	},

	animate: function(progress) {
		var shots = Math.round(this.shotAnimation.countPerDamage * progress * this.damage);
		while (this.shots < shots) {
			++this.shots;
			this.data.animationManager.addParticles(this.unit.getCenter(), this.shotAnimation);
		}
	}
});
