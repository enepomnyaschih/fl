FL.Panel = function(monitor, cell) {
	FL.Panel._super.call(this);
	this.monitor = monitor;
	this.cell = cell;
};

JW.extend(FL.Panel, JW.UI.Component, {
	renderTerrainName: function(el) {
		if (!this.cell.scouted[0]) {
		} else if (this.cell.rock) {
			el.text("Mountain")
		} else if (this.cell.hill) {
			el.text("Hill")
		} else {
			el.text("Plain")
		}
	},

	renderTerrainDescription: function(el) {
		if (!this.cell.scouted[0]) {
			el.text("This area is not scouted yet.");
		} else if (this.cell.rock) {
			el.text("Doesn't make production. Units can not pass.")
		} else if (this.cell.hill) {
			el.text("Improves defense and sight. Production: 2.")
		} else {
			el.text("Increases production by 1.")
		}
	},

	renderResourceName: function(el) {
		if (this.cell.scouted[0] && this.cell.resource) {
			el.text(this.cell.resource.name);
		}
	},

	renderResourceDescription: function(el) {
		if (this.cell.scouted[0] && this.cell.resource) {
			el.html(this.cell.resource.descriptionHtml);
		}
	},

	renderUnit: function() {
		if (this.cell.visible[0] && this.cell.unit) {
			return this.own(new FL.Panel.Unit(this.monitor, this.cell.unit));
		}
	},

	renderBase: function() {
		if (this.cell.visible[0] && this.cell.base && (this.cell.base.player === 0)) {
			return this.own(new FL.Panel.Base(this.cell.base));
		}
	}
});
