FL.Panel = function(cell) {
	FL.Panel._super.call(this);
	this.cell = cell;
};

JW.extend(FL.Panel, JW.UI.Component, {
	renderTerrain: function(el) {
		if (!this.cell.scouted) {
			el.text("This area is not scouted yet.");
		} else if (this.cell.rock) {
			el.text("This is a mountain. Units can not pass.")
		}
	},

	renderUnit: function() {
		if (this.cell.visible && this.cell.unit) {
			return this.own(new FL.UnitInfo(this.cell.unit.type,
				this.cell.unit.player, this.cell.unit.movement, false));
		}
	},

	renderBase: function() {
		if (this.cell.visible && this.cell.base && (this.cell.base.player === 0)) {
			return this.own(new FL.Panel.Base(this.cell.base));
		}
	}
});
