FL.UnitInfo.Stats = function(type, showCost) {
	FL.UnitInfo.Stats._super.call(this);
	this.type = type;
	this.showCost = showCost || false;
};

JW.extend(FL.UnitInfo.Stats, JW.UI.Component, {
	renderDamageBox: function() {
		return this.type.damage !== 0;
	},

	renderDamage: function(el) {
		el.text(this.type.damage);
	},

	renderArmorBox: function() {
		return this.type.armor !== 0;
	},

	renderArmor: function(el) {
		el.text(this.type.armor);
	},

	renderDefenseBox: function() {
		return this.type.defense !== 0;
	},

	renderDefense: function(el) {
		el.text(Math.round(100 * this.type.defense / this.type.armor) + "%");
	},

	renderHealRate: function(el) {
		el.text(Math.round(100 * this.type.healRate) + "%");
	},

	renderMovement: function(el) {
		el.text(this.type.movement);
	},

	renderCostBox: function(el) {
		return this.showCost;
	},

	renderCost: function(el) {
		el.text(this.type.cost);
	},

	renderCapacity: function(el) {
		el.text(this.type.capacity);
	},

	renderDescription: function(el) {
		el.text(this.type.description);
	}
});
