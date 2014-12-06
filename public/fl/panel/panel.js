FL.Panel = function(monitor, cell) {
	FL.Panel._super.call(this);
	this.monitor = monitor;
	this.cell = cell;
};

JW.extend(FL.Panel, JW.UI.Component, {
	renderTerrainName: function(el) {
		if (!this.cell.scouted) {
		} else if (this.cell.rock) {
			el.text("Mountain")
		} else {
			el.text("Plain")
		}
	},

	renderTerrainDescription: function(el) {
		if (!this.cell.scouted) {
			el.text("This area is not scouted yet.");
		} else if (this.cell.rock) {
			el.text("Doesn't make production. Units can not pass.")
		} else {
			el.text("Increases production by 1.")
		}
	},

	renderResourceName: function(el) {
		if (this.cell.scouted && this.cell.resource) {
			el.text(this.cell.resource.name);
		}
	},

	renderResourceDescription: function(el) {
		if (this.cell.scouted && this.cell.resource) {
			el.html(this.cell.resource.descriptionHtml);
		}
	},

	renderUnit: function() {
		if (this.cell.visible && this.cell.unit) {
			return this.own(new FL.Panel.Unit(this.monitor, this.cell.unit));
		}
	},

	renderBase: function() {
		if (this.cell.visible && this.cell.base && (this.cell.base.player === 0)) {
			return this.own(new FL.Panel.Base(this.cell.base));
		}
	}
});
