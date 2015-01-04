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
		if (!this.unit.isHealed()) {
			this.own(new FL.ButtonAnimation(el));
			el.text("Heal");
		}
		el.click(JW.inScope(function() {
			this.unit.hold = true;
			this.monitor._updateCell(null, this.unit.ij.get());
			this.monitor.selectNext();
		}, this))
	},

	renderSkip: function(el) {
		el.click(JW.inScope(function() {
			this.unit.hold = false;
			this.unit.skipped = true;
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
		this.own(new FL.ButtonAnimation(el));
		el.click(JW.inScope(function() {
			this.monitor.data.buildBase(this.unit);
			this.monitor.updateMap();
			this.monitor.selectCell(this.unit.ij.get());
		}, this));
	},

	renderDrop: function(el) {
		if (!this.unit.type.paradroppable || (this.unit.movement.get() === 0)) {
			return false;
		}
		if (!this.unit.cell.miningBase || (this.unit.cell.miningBase.player !== this.unit.player)) {
			return false;
		}
		if (!this.unit.cell.resource || (this.unit.cell.resource.id !== "airport")) {
			return false;
		}
		this.own(new FL.ButtonAnimation(el));
		el.click(JW.inScope(function() {
			var unit = this.unit;
			var monitor = this.monitor;
			var data = this.monitor.data;
			monitor.getElement("cells").addClass("fl-order-paradrop");
			this.monitor.initOrder({
				test: function(ij) {
					return data.isDroppable(ij, 0);
				},
				execute: function(ij) {
					unit.decreaseMovement();
					unit.ijTarget = null;
					unit.hold = false;
					unit.ij.set(ij);
					monitor.updateMap();
				},
				finish: function() {
					monitor.getElement("cells").removeClass("fl-order-paradrop");
				},
				scope: this
				// actually, this will already die because the panel
				// is replaced during order processing
			});
		}, this));
	},

	renderStats: function() {
		return this.own(new FL.UnitInfo.Stats(this.unit.type, false));
	}
});
