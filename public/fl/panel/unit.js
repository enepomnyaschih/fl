FL.Panel.Unit = function(monitor, unit) {
	FL.Panel.Unit._super.call(this);
	this.monitor = monitor;
	this.unit = unit;
	this.blocksProduction = monitor.data.isUnitBlockProduction(unit.cell.base);
	this.requiresAction = monitor._isUnitAutoSelectable(unit);
};

JW.extend(FL.Panel.Unit, JW.UI.Component, {
	renderName: function(el) {
		el.text(this.unit.name[0] + " #" + this.unit.name[1]);
	},

	renderHeader: function() {
		return this.own(new FL.UnitInfo.Header(this.unit.type, this.unit.player));
	},

	renderPersons: function() {
		return JW.Array.$map(this.unit.persons.get(), function(person, index) {
			return this.own(new FL.Panel.UnitPerson(this.unit, this.monitor.unitSelection, index));
		}, this);
	},

	renderLeave: function(el) {
		if ((this.unit.player !== 0) || !this.blocksProduction) {
			return false;
		}
		this.own(new FL.AlternateAnimation({
			updater: function(value) {
				el.css("background", JW.Color.str(JW.Color.gradient("#FFF", "#FBB", value)));
				el.css("border-color", JW.Color.str(JW.Color.gradient("#FFF", "#F00", value)));
				el.css("color", JW.Color.str(JW.Color.gradient("#FBB", "#D00", value)));
			},
			finish: function(value) {
				el.css("background", "");
				el.css("border-color", "");
				el.css("color", "");
			},
			scope: this
		}));
	},

	renderButtons: function(el) {
		return this.unit.player === 0;
	},

	renderHold: function(el) {
		if (!this.unit.isHealed()) {
			if (this.requiresAction && !this.blocksProduction) {
				this.own(new FL.ButtonAnimation(el));
			}
			el.text("Heal");
		}
		el.click(JW.inScope(function() {
			this.unit.hold = true;
			this.monitor._updateCell(null, this.unit.ij.get());
			this.monitor.selectNextIfDone();
		}, this))
	},

	renderSkip: function(el) {
		el.click(JW.inScope(function() {
			this.unit.hold = false;
			this.unit.skipped = true;
			this.monitor._updateCell(null, this.unit.ij.get());
			this.monitor.selectNextIfDone();
		}, this))
	},

	renderBuild: function(el) {
		if ((this.unit.type.id !== "mcv") || (this.unit.movement.get() === 0)) {
			return false;
		}
		if (!this.monitor.data.isBaseBuildable(this.unit.ij.get(), FL.minBaseDistanceSqr)) {
			return false;
		}
		if (this.requiresAction) {
			this.own(new FL.ButtonAnimation(el));
		}
		el.click(JW.inScope(function() {
			this.monitor.data.buildBase(this.unit);
			this.monitor.selectCell(this.unit.ij.get());
		}, this));
	},

	renderDrop: function(el) {
		if (!this.unit.canDrop()) {
			return false;
		}
		if (this.requiresAction) {
			this.own(new FL.ButtonAnimation(el));
		}
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
					unit.drop(ij);
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
