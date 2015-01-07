FL.Unit.BattleAnimation = function(data,
		attacker, attackerDamage, attackerVictims,
		defender, defenderDamage, defenderVictims) {
	FL.Unit.BattleAnimation._super.call(this, attacker);
	this.data = data; // FL.Data
	this.attackerSide = new FL.Unit.BattleAnimation.Side(
		this.data, defender, attacker, attackerDamage, attackerVictims);
	this.defenderSide = new FL.Unit.BattleAnimation.Side(
		this.data, attacker, defender, defenderDamage, defenderVictims);
	this.speed = this.animationsPerSecond / FL.animationStepsPerSecond;
	this.progress = 0;
	this.duration = 0;
};

JW.extend(FL.Unit.BattleAnimation, FL.Unit.Animation, {
	animationsPerSecond: 1,

	animate: function() {
		this.progress = Math.min(1, this.progress + this.speed);
		this.attackerSide.animate(this.progress);
		this.defenderSide.animate(this.progress);
		return this.progress === 1;
	}
});



FL.Unit.BattleAnimation.Side = function(data, attacker, defender, damage, victims) {
	FL.Unit.BattleAnimation.Side._super.call(this);
	this.data = data;
	this.attacker = attacker;
	this.defender = defender;
	this.damage = damage;
	this.victims = victims;
	this.shots = 0;
	this.shotAnimation = this.attacker.getShotAnimation();
	this.deathAnimation = this.defender.getDeathAnimation();
};

JW.extend(FL.Unit.BattleAnimation.Side, JW.Class, {
	animate: function(progress) {
		var center = this.defender.getCenter();
		if (this.shotAnimation) {
			var shots = Math.round(this.shotAnimation.countPerDamage * progress * this.damage);
			while (this.shots < shots) {
				++this.shots;
				this.data.animationManager.addParticles(center, this.shotAnimation);
			}
		}
		if (progress === 1) {
			for (var i = 0; i < this.victims; ++i) {
				this.data.animationManager.addParticles(center, this.deathAnimation);
			}
			this.defender.onBattleFinish();
		}
	}
});
