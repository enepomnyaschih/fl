FL.Cell = function(data, ij) {
	FL.Cell._super.call(this);
	this.data = data;
	this.ij = ij;
	this.rock = false;
	this.hill = (Math.random() < FL.plainHillChance);
	this.mining = 0;
	this.base = null;
	this.nearBases = this.own(new JW.Set());
	this.miningBase = null; // who makes money from this tile
	this.unit = null;
	this.resource = null;
	this.scouted = false; // removes black mask
	this.visible = false; // reveals units
	this.invalid = false; // forces to redraw
	this._resetMining();
};

JW.extend(FL.Cell, JW.Class, {
	reveal: function() {
		if (this.scouted && this.visible) {
			return;
		}
		this.scouted = true;
		this.visible = true;
		this.invalid = true;
		if (this.unit) {
			this.unit.visible = true;
			this.unit.resetAnimation();
		}
	},

	hide: function() {
		if (!this.scouted || !this.visible) {
			return;
		}
		this.visible = false;
		this.invalid = true;
		if (this.unit) {
			this.unit.visible = false;
			this.unit.resetAnimation();
		}
	},

	setBase: function(base) {
		if (this.base === base) {
			return;
		}
		this.base = base;
		this.invalid = true;
	},

	addNearBase: function(base) {
		if (this.rock) {
			return;
		}
		if (this.nearBases.add(base)) {
			this._updateMiningBase();
		}
	},

	removeNearBase: function(base) {
		if (this.nearBases.remove(base)) {
			this._updateMiningBase();
		}
	},

	setUnit: function(unit) {
		if (this.unit === unit) {
			return;
		}
		this.unit = unit;
		this.invalid = true;
		this._updateMiningBase();
	},

	setResource: function(resource) {
		if (this.resource === resource) {
			return;
		}
		if (this.miningBase) {
			this.miningBase.removeResource(this.resource);
		}
		this.resource = resource;
		if (this.miningBase) {
			this.miningBase.addResource(this.resource);
		}
		this._resetMining();
	},

	_resetMining: function() {
		var mining = this.rock ? 0 : this.hill ? 2 : 1;
		if (this.resource && this.resource.bonus) {
			mining += this.resource.bonus;
		}
		if (this.miningBase && (mining !== this.mining)) {
			this.miningBase.mining += mining - this.mining;
		}
		this.mining = mining;
	},

	_updateMiningBase: function() {
		var nearestBase = null;
		var nearestBaseDistanceSqr = Number.POSITIVE_INFINITY;
		this.nearBases.each(function(base) {
			if (this.unit && (this.unit.player !== base.player)) {
				return;
			}
			var distanceSqr = FL.Vector.lengthSqr(FL.Vector.diff(this.ij, base.ij));
			if (distanceSqr < nearestBaseDistanceSqr) {
				nearestBase = base;
				nearestBaseDistanceSqr = distanceSqr;
			}
		}, this);
		if (nearestBase === this.miningBase) {
			return;
		}
		if (this.miningBase) {
			this.miningBase.mining -= this.mining;
			this.miningBase.removeResource(this.resource);
		}
		this.miningBase = nearestBase;
		if (this.miningBase) {
			this.miningBase.mining += this.mining;
			this.miningBase.addResource(this.resource);
		}
		this.data.map.everyWithin8(this.ij, 1, function(cell) {
			cell.invalid = true;
		}, this);
	}
});
