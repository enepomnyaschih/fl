FL.Panel.Unit = function(monitor, unit) {
	FL.Panel.Unit._super.call(this);
	this.monitor = monitor;
	this.unit = unit;
};

JW.extend(FL.Panel.Unit, JW.UI.Component, {
	renderHeader: function() {
		return this.own(new FL.UnitInfo.Header(this.unit.type, this.unit.player));
	},

	renderPersons: function() {
		return JW.Array.$map(this.unit.persons.get(), function(person, index) {
			return this.own(new FL.Panel.UnitPerson(this.unit, this.monitor.unitSelection, index));
		}, this);
	},

	renderButtons: function(el) {
		return this.unit.player === 0;
	},

	renderHold: function(el) {
		el.click(JW.inScope(function() {
			this.unit.hold = true;
			this.monitor._updateCell(null, this.unit.ij.get());
			this.monitor.selectNext();
		}, this))
	},

	renderBuild: function(el) {
		if ((this.unit.type.id !== "mcv") || (this.unit.movement.get() === 0)) {
			return false;
		}
		if (!this.monitor.data.isBaseBuildable(this.unit.ij.get(), FL.minBaseDistanceSqr)) {
			return false;
		}
		el.click(JW.inScope(function() {
			this.monitor.data.buildBase(this.unit);
			this.monitor.updateMap();
			this.monitor.selectCell(this.unit.ij.get());
		}, this));
	},

	renderDrop: function(el) {
		if (!this.unit.type.paradropRangeSqr || (this.unit.movement.get() === 0)) {
			return false;
		}
		if (!this.unit.cell.base) {
			return false;
		}
		el.click(JW.inScope(function() {
			var unit = this.unit;
			var monitor = this.monitor;
			var data = this.monitor.data;
			this.monitor.initOrder(unit.ij.get(), unit.type.paradropRangeSqr, function(ij) {
				unit.decreaseMovement();
				unit.ijTarget = null;
				unit.ij.set(ij);
				monitor.updateMap();
			});
		}, this));
	},

	renderStats: function() {
		return this.own(new FL.UnitInfo.Stats(this.unit.type, false));
	}
});
