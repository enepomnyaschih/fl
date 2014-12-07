FL.Cell = function(ij) {
	FL.Cell._super.call(this);
	this.ij = ij;
	this.rock = false;
	this.base = null;
	this.miningBase = null; // who makes money from this tile
	this.unit = null;
	this.resource = null;
	this.scouted = false; // removes black mask
	this.visible = false; // reveals units
	this.invalid = false; // forces to redraw
};

JW.extend(FL.Cell, JW.Class, {
	reveal: function() {
		if (this.scouted && this.visible) {
			return;
		}
		this.scouted = true;
		this.visible = true;
		this.invalid = true;
	},

	hide: function() {
		if (!this.scouted || !this.visible) {
			return;
		}
		this.visible = false;
		this.invalid = true;
	},

	setBase: function(base) {
		if (this.base === base) {
			return;
		}
		this.base = base;
		this.invalid = true;
	},

	setMiningBase: function(base) {
		if (base || (base !== this.miningBase)) {
			this.invalid = true; // force borders to redraw always
		}
		this.miningBase = base;
	},

	setUnit: function(unit) {
		if (this.unit === unit) {
			return;
		}
		this.unit = unit;
		this.invalid = true;
	}
});
