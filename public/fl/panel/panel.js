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
			el.html('Improves defense and sight. Production: <span class="fl-id">2</span>.')
		} else {
			el.html('Increases production by <span class="fl-id">1</span>.')
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

	renderBase: function() {
		if (this.cell.visible[0] && this.cell.base && (this.cell.base.player === 0)) {
			return this.own(new FL.Panel.Base(this.cell.base));
		}
	}
});
