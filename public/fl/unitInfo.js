FL.UnitInfo = function(type, player, health, movement, showCost) {
	FL.UnitInfo._super.call(this);
	this.type = type;
	this.player = player || 0;
	this.health = health || null;
	this.movement = JW.defn(movement, type.movement);
	this.showCost = showCost || false;
};

JW.extend(FL.UnitInfo, JW.UI.Component, {
	renderIcon: function(el) {
		el.attr("fl-type", this.type.id);
		el.attr("fl-player", this.player);
	},

	renderName: function(el) {
		el.text(this.type.name);
	},

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
		if (this.health) {
			el.html(JW.Array.map(this.health, function(value) {
				return (value === 1) ?
					('<span class="fl-good">' + this.type.armor + '</span>') :
					('<span class="fl-bad">' + (this.type.armor * value).toFixed(1) + '</span>');
			}, this).join("+") + "/" + this.type.armor);
		} else {
			el.text(this.type.armor);
		}
	},

	renderDefenseBox: function() {
		return this.type.defense !== 0;
	},

	renderDefense: function(el) {
		el.text(Math.round(100 * this.type.defense / this.type.armor) + "%");
	},

	renderMovement: function(el) {
		if ((this.movement === this.type.movement) || (this.player !== 0)) {
			el.text(this.movement);
		} else {
			el.text(this.movement + "/" + this.type.movement);
		}
	},

	renderCostBox: function(el) {
		return this.showCost;
	},

	renderCost: function(el) {
		el.text(this.type.cost);
	},

	renderCapacity: function(el) {
		el.text(this.type.capacity);
	}
});
