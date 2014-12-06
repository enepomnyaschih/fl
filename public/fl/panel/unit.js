FL.Panel.Unit = function(monitor, unit) {
	FL.Panel.Unit._super.call(this);
	this.monitor = monitor;
	this.unit = unit;
};

JW.extend(FL.Panel.Unit, JW.UI.Component, {
	renderInfo: function() {
		return this.own(new FL.UnitInfo(this.unit.type,
			this.unit.player, this.unit.movement, false));
	},

	renderHold: function(el) {
		el.click(JW.inScope(function() {
			this.unit.hold = true;
			this.monitor._updateCell(null, this.unit.ij);
			this.monitor.selectNext();
		}, this))
	}
});
