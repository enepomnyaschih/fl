FL.revealAll = false;

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
	this.scouted = [FL.revealAll, false]; // removes black mask
	this.visible = [FL.revealAll, false]; // reveals units
	this.invalid = false; // forces to redraw
	this.resetMining();
};

JW.extend(FL.Cell, JW.Class, {
	reveal: function(player) {
		if (this.scouted[player] && this.visible[player]) {
			return;
		}
		this.scouted[player] = true;
		this.visible[player] = true;
		this.invalid = true;
		if (this.unit) {
			this.unit.visible[player] = true;
			this.unit.resetAnimation();
		}
	},

	hide: function(player) {
		if ((player === 0) && FL.revealAll) {
			return;
		}
		if (!this.scouted[player] || !this.visible[player]) {
			return;
		}
		this.visible[player] = false;
		this.invalid = true;
		if (this.unit && (player === 0)) {
			this.unit.visible[player] = false;
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

	setRock: function(value) {
		if (this.rock === value) {
			return;
		}
		this.rock = value;
		this.resetMining();
	},

	setHill: function(value) {
		if (this.hill === value) {
			return;
		}
		this.hill = value;
		this.resetMining();
	},

	setResource: function(resource) {
		if (this.resource === resource) {
			return;
		}
		if (this.miningBase && this.resource) {
			this.miningBase.removeResource(this.resource);
		}
		this.resource = resource;
		if (this.miningBase && this.resource) {
			this.miningBase.addResource(this.resource);
		}
		this.resetMining();
	},

	isAirportBy: function(player) {
		return (this.miningBase != null) && (this.miningBase.player === player) &&
			(this.resource != null) && (this.resource.id === "airport");
	},

	resetMining: function() {
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
