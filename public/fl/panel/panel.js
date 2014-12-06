FL.Panel = function(cell) {
	FL.Panel._super.call(this);
	this.cell = cell;
};

JW.extend(FL.Panel, JW.UI.Component, {
	renderTerrain: function(el) {
		if (!this.cell.scouted) {
			el.text("This area is not scouted yet.");
		} else if (this.cell.rock) {
			el.text("This is a mountain. Only infantry units can walk there.")
		}
	},

	renderUnit: function() {
		if (this.cell.visible && this.cell.unit) {
			return this.own(new FL.Panel.Unit(this.cell.unit.type,
				this.cell.unit.player, this.cell.unit.movement, false));
		}
	},

	renderBase: function() {
		if (this.cell.visible && this.cell.base) {
			return this.own(new FL.Panel.Base(this.cell.base));
		}
	}
});
