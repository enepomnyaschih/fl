FL.Data = function() {
	FL.Data._super.call(this);
	this.map = null;
	this.bases = new JW.Set();
	this.units = new JW.Set();
	this._generateMap();
};

JW.extend(FL.Data, JW.Class, {
	createBase: function(ij, player) {
		var base = new FL.Base(ij, player);
		this.bases.add(base);
		this.map.getCell(ij).base = base;
		if (player == 0) {
			this.reveal(ij, FL.baseSightRangeSqr);
		}
		return base;
	},

	createUnit: function(ij, player, type) {
		var unit = new FL.Unit(ij, player, type);
		this.units.add(unit);
		this.map.getCell(ij).unit = unit;
		if (player == 0) {
			this.reveal(ij, unit.type.sightRangeSqr)
		}
	},

	reveal: function(cij, distanceSqr) {
		var distance = Math.ceil(Math.sqrt(distanceSqr));
		for (var i = cij[0] - distance, I = cij[0] + distance; i <= I; ++i) {
			for (var j = cij[1] - distance, J = cij[1] + distance; j <= J; ++j) {
				var ij = [i, j];
				if (FL.Vector.lengthSqr(FL.Vector.diff(ij, cij)) <= distanceSqr) {
					this.map.getCell(ij).reveal();
				}
			}
		}
	},

	isBaseBuildable: function(ij, minDistance) {
		if (!this.isPassable(ij)) {
			return false;
		}
		minDistance = minDistance || FL.minBaseDistanceSqr;
		return this.bases.every(function(base) {
			return FL.Vector.lengthSqr(FL.Vector.diff(ij, base.ij)) >= minDistance;
		}, this);
	},

	isPassable: function(ij) {
		return this.map.inMatrix(ij) && !this.map.getCell(ij).rock;
	},

	isChoke: function(ij) {
		var dij = FL.getIjs8(ij);
		// check sides
		if (this.isPassable(dij[0]) &&
			!this.isPassable(dij[2]) &&
			this.isPassable(dij[4]) &&
			!this.isPassable(dij[6])) {
			return true;
		}
		if (!this.isPassable(dij[0]) &&
			this.isPassable(dij[2]) &&
			!this.isPassable(dij[4]) &&
			this.isPassable(dij[6])) {
			return true;
		}
		// check corners
		for (var d = 0; d < 8; d += 2) {
			if (!this.isPassable(dij[d]) &&
				this.isPassable(dij[d + 1]) &&
				!this.isPassable(dij[(d + 2) % 8])) {
				for (var i = 3; i < 8; ++i) {
					if (this.isPassable(dij[(d + i) % 8])) {
						return true;
					}
				}
			}
		}
		return false;
	},

	_generateMap: function() {
		this.map = new FL.Matrix(FL.mapSize);
		for (var i = 0; i < FL.mapSize; ++i) {
			for (var j = 0; j < FL.mapSize; ++j) {
				var ij = [i, j];
				var cell = new FL.Cell(ij);
				this.map.setCell(ij, cell);
			}
		}
		this._generateRocks();
		this._generateBases();
	},

	_generateRocks: function() {
		for (var i = 0; i < FL.rockCount; ++i) {
			var ij, good;
			do {
				ij = this.map.ijRandom();
				good = this.isPassable(ij) && !this.isChoke(ij);
			} while (!good);

			var currentRockCells = [];
			var addRock = JW.inScope(function(ij) {
				if (!this.isPassable(ij) || this.isChoke(ij)) {
					return;
				}
				currentRockCells.push(ij);
				this.map.getCell(ij).rock = true;
			}, this);
			addRock(ij);

			var density = FL.random(FL.rockDensity);
			for (var j = 0; j < density; ++j) {
				var d = FL.random(4);
				var dij = FL.Vector.add(currentRockCells[FL.random(currentRockCells.length)], FL.dir4[d]);
				addRock(dij);
			}
		}
	},

	_generateBases: function() {
		for (var p = 0; p < FL.playerCount; ++p) {
			var ij;
			while (true) {
				ij = this.map.ijRandom();
				if (!this.isBaseBuildable(ij, FL.minMainBaseDistanceSqr)) {
					continue;
				}
				var ijCenter = this.map.ijCenter();
				var ijDistance = FL.Vector.diff(ij, ijCenter);
				var centerDistance = FL.Vector.length8(ijDistance);
				if (centerDistance < FL.minMainBaseCenterDistance) {
					continue;
				}
				var sideDistance = this.map.size / 2 - centerDistance;
				if (sideDistance < FL.minMainBaseSideDistance) {
					continue;
				}
				break;
			}
			this.createBase(ij, p);
			this.createUnit(ij, p, "soldier");
		}
	}
});
