FL.Data = function() {
	FL.Data._super.call(this);
	this.map = null;
	this.bases = new JW.Set();
	this.units = new JW.Set();
	this.logEvent = new JW.Event();
	this.turn = 1;
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
			this.reveal(ij, type.sightRangeSqr)
		}
	},

	destroyUnit: function(unit) {
		this.units.remove(unit);
		this.map.getCell(unit.ij).setUnit(null);
		unit.destroy();
	},

	moveUnit: function(unit) {
		if (!unit.ijTarget || FL.Vector.equal(unit.ijTarget, unit.ij) || (unit.movement === 0)) {
			return;
		}
		var path = this.getPath(unit.ij, unit.ijTarget, unit.player);
		if (!path) {
			unit.ijTarget = null;
			return;
		}
		unit.hold = false;
		for (var i = 0; (i < path.length) && unit.movement; ++i) {
			--unit.movement;
			var tij = FL.Vector.add(unit.ij, FL.dir8[path[i]]);
			var sourceCell = this.map.getCell(unit.ij);
			var targetCell = this.map.getCell(tij);
			if (targetCell.unit) {
				if (unit.type.attack !== 0) {
					sourceCell.invalid = true;
					this.fight(unit, targetCell.unit);
				}
				break;
			}
			sourceCell.setUnit(null);
			unit.ij = tij;
			targetCell.setUnit(unit);
			if (unit.player === 0) {
				this.reveal(unit.ij, unit.type.sightRangeSqr);
			}
		}
	},

	fight: function(attacker, defender) {
		var win = FL.fight(attacker.type.attack, defender.type.defense);
		if (win) {
			this.destroyUnit(defender);
			if (attacker.player === 0) {
				this.log("Your " + attacker.type.name +
					" (attack: " + attacker.type.attack +
					") has killed enemy " + defender.type.name +
					" (defense: " + defender.type.defense +
					") in successful attack", "fl-good");
			} else {
				this.log("Enemy " + attacker.type.name +
					" (attack: " + attacker.type.attack +
					") has killed your " + defender.type.name +
					" (defense: " + defender.type.defense +
					") in successful attack", "fl-bad");
			}
		} else {
			this.destroyUnit(attacker);
			if (attacker.player === 0) {
				this.log("Your " + attacker.type.name +
					" (attack: " + attacker.type.attack +
					") has been killed by enemy " + defender.type.name +
					" (defense: " + defender.type.defense +
					") in failed attack", "fl-bad");
			} else {
				this.log("Enemy " + attacker.type.name +
					" (attack: " + attacker.type.attack +
					") has been killed by your " + defender.type.name +
					" (defense: " + defender.type.defense +
					") in failed attack", "fl-good");
			}
		}
	},

	endTurn: function() {
		this.resetVision();
		this._produce(0);
		this._produce(1);
		this.units.each(function(unit) {
			unit.movement = unit.type.movement;
		}, this);
		this.resetVision();
		++this.turn;
		this.log("Turn " + this.turn);
	},

	reveal: function(cij, distanceSqr) {
		var distance = Math.ceil(Math.sqrt(distanceSqr));
		var iMin = Math.max(0, cij[0] - distance);
		var iMax = Math.min(this.map.size - 1, cij[0] + distance);
		var jMin = Math.max(0, cij[1] - distance);
		var jMax = Math.min(this.map.size - 1, cij[1] + distance);
		for (var i = iMin; i <= iMax; ++i) {
			for (var j = jMin; j <= jMax; ++j) {
				var ij = [i, j];
				if (FL.Vector.lengthSqr(FL.Vector.diff(ij, cij)) <= distanceSqr) {
					this.map.getCell(ij).reveal();
				}
			}
		}
	},

	resetVision: function() {
		for (var i = 0; i < this.map.size; ++i) {
			for (var j = 0; j < this.map.size; ++j) {
				this.map.getCell([i, j]).hide();
			}
		}
		this.bases.each(function(base) {
			if (base.player === 0) {
				this.reveal(base.ij, FL.baseSightRangeSqr);
			}
		}, this);
		this.units.each(function(unit) {
			if (unit.player === 0) {
				this.reveal(unit.ij, unit.type.sightRangeSqr);
			}
		}, this);
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

	isByEnemy: function(ij, player) {
		for (var d = 0; d < FL.dir8.length; ++d) {
			var dij = FL.Vector.add(ij, FL.dir8[d]);
			var dCell = this.map.getCell(dij);
			if (!dCell) {
				continue;
			}
			var dUnit = dCell.unit;
			if (dUnit && (dUnit.player !== player)) {
				return true;
			}
		}
		return false;
	},

	getPath: function(sij, tij, player) {
		if (FL.Vector.equal(sij, tij)) {
			return [];
		}
		var queue = [sij];
		var tail = 0;
		var dirs = new FL.Matrix(this.map.size);
		dirs.setCell(sij, true);
		while (tail < queue.length) {
			var cij = queue[tail++];
			for (var d = 0; d < FL.dir8.length; ++d) {
				var dir = (d < 4) ? (2 * d) : (2 * d - 7);
				var dij = FL.Vector.add(cij, FL.dir8[dir]);
				if (!this.isPassable(dij)) {
					continue;
				}
				if (dirs.getCell(dij) != null) {
					continue;
				}
				var cell = this.map.getCell(dij);
				if ((player === 0) && !cell.visible) {
					continue;
				}
				var unit = cell.unit;
				if (unit) {
					if ((unit.player === player) || !FL.Vector.equal(dij, tij)) {
						continue;
					}
				}
				if (!unit && this.isByEnemy(cij, player) && this.isByEnemy(dij, player)) {
					continue;
				}
				queue.push(dij);
				dirs.setCell(dij, dir);
				if (FL.Vector.equal(dij, tij)) {
					return this._backtracePath(dirs, tij);
				}
			}
		}
		return null;
	},

	log: function(message, cls) {
		this.logEvent.trigger([message, cls]);
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
			this.createUnit(ij, p, FL.Unit.types["militia"]);
			for (var d = 0; d < 8; ++d) {
				this.createUnit(FL.Vector.add(ij, FL.dir8[d]), (p + 1) % 2, FL.Unit.types["militia"]);
			}
		}
	},

	_backtracePath: function(dirs, tij) {
		var path = [];
		while (true) {
			var d = dirs.getCell(tij);
			if (d === true) {
				path.reverse();
				return path;
			}
			path.push(d);
			tij = FL.Vector.diff(tij, FL.dir8[d]);
		}
	},

	_produce: function(player) {
		this.bases.each(function(base) {
			if (base.player !== player) {
				return;
			}
			var type = base.unitType.get();
			if (!type) {
				return;
			}
			var production = base.production[type.id] + base.overflow + 1;
			var cell = this.map.getCell(base.ij);
			if ((production >= type.cost) && !cell.unit) {
				this.createUnit(base.ij, base.player, type);
				base.production[type.id] = 0;
				base.overflow = production - type.cost;
				base.unitType.set(null);
			} else {
				base.production[type.id] = Math.min(production, type.cost);
				base.overflow = 0;
			}
		}, this);
	}
});
