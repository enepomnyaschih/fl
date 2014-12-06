FL.UnitInfo = function(type, player, movement, showCost) {
	FL.UnitInfo._super.call(this);
	this.type = type;
	this.player = player || 0;
	this.movement = JW.defn(movement, type.movement);
	this.showCost = showCost || false;
};

JW.extend(FL.UnitInfo, JW.UI.Component, {
	renderIcon: function(el) {
		el.attr("fl-type", this.type.id);
		el.attr("fl-player", "n" + this.player);
	},

	renderName: function(el) {
		el.text(this.type.name);
	},

	renderAttack: function(el) {
		el.text(this.type.attack || "N/A");
	},

	renderDefense: function(el) {
		el.text(this.type.defense);
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
	}
});
