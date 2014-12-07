FL.Data = function() {
	FL.Data._super.call(this);
	this.map = null;
	this.bases = new JW.Set();
	this.units = new JW.Set();
	this.logEvent = new JW.Event();
	this.lostEvent = new JW.Event();
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

	destroyBase: function(base) {
		this.bases.remove(base);
		this.map.getCell(base.ij).setBase(null);
		base.destroy();
		if (this.bases.count(JW.byValue("player", base.player)) === 0) {
			this.lostEvent.trigger(base.player);
		}
	},

	createUnit: function(ij, player, type, behaviour) {
		var unit = new FL.Unit(ij, player, type, behaviour);
		this.units.add(unit);
		this.map.getCell(ij).setUnit(unit);
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
		if (!unit.ijTarget) {
			return;
		}
		var path = this.getPath(unit.ij, unit.ijTarget, unit.player);
		if (!path) {
			unit.ijTarget = null;
			return;
		}
		unit.hold = false;
		for (var i = 0; (i < path.length) && unit.movement; ++i) {
			var tij = FL.Vector.add(unit.ij, FL.dir8[path[i]]);
			if (!this.isPassable(tij)) {
				break;
			}
			var sourceCell = this.map.getCell(unit.ij);
			var targetCell = this.map.getCell(tij);
			if (targetCell.unit) {
				if ((targetCell.unit.player !== unit.player) &&
						FL.Vector.equal(tij, unit.ijTarget) && (unit.type.attack !== 0)) {
					--unit.movement;
					sourceCell.invalid = true;
					this.fightUnit(unit, targetCell.unit);
				}
				unit.ijTarget = null;
				break;
			}
			if (targetCell.base && (targetCell.base.player !== unit.player)) {
				if (FL.Vector.equal(tij, unit.ijTarget) && (unit.type.attack !== 0)) {
					--unit.movement;
					sourceCell.invalid = true;
					this.fightBase(unit, targetCell.base);
				}
				unit.ijTarget = null;
				break;
			}
			sourceCell.setUnit(null);
			--unit.movement;
			unit.ij = tij;
			targetCell.setUnit(unit);
			if (unit.player === 0) {
				this.reveal(unit.ij, unit.type.sightRangeSqr);
			}
		}
		if (unit.ijTarget && FL.Vector.equal(unit.ij, unit.ijTarget)) {
			unit.ijTarget = null;
		}
	},

	moveUnits: function(player) {
		this.units.$filter(JW.byValue("player", player)).each(this.moveUnit, this);
	},

	fightUnit: function(attacker, defender) {
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

	fightBase: function(attacker, base) {
		var win = FL.fight(attacker.type.attack, FL.baseDefense);
		if (win) {
			this.destroyBase(base);
			this.resetMining();
			if (attacker.player === 0) {
				this.log("Your " + attacker.type.name +
					" (attack: " + attacker.type.attack +
					") has destroyed enemy base" +
					" (defense: " + FL.baseDefense +
					") in successful attack", "fl-good");
			} else {
				this.log("Enemy " + attacker.type.name +
					" (attack: " + attacker.type.attack +
					") has destroyed your base" +
					" (defense: " + FL.baseDefense +
					") in successful attack", "fl-bad");
			}
		} else {
			this.destroyUnit(attacker);
			if (attacker.player === 0) {
				this.log("Your " + attacker.type.name +
					" (attack: " + attacker.type.attack +
					") has been killed by enemy base" +
					" (defense: " + FL.baseDefense +
					") in failed attack", "fl-bad");
			} else {
				this.log("Enemy " + attacker.type.name +
					" (attack: " + attacker.type.attack +
					") has been killed by your base" +
					" (defense: " + FL.baseDefense +
					") in failed attack", "fl-good");
			}
		}
	},

	endTurn: function() {
		this.log("End turn");
		this._endTurnPlayer(0);
		FL.AI.process(this, 1);
		this._endTurnPlayer(1);
		++this.turn;
		this.log("Turn " + this.turn);
	},

	_endTurnPlayer: function(player) {
		this.moveUnits(player);
		this.units.$filter(JW.byValue("player", player)).each(function(unit) {
			unit.movement = unit.type.movement;
		}, this);
		this.resetVision();
		this._produce(player);
	},

	reveal: function(cij, distanceSqr) {
		this.map.eachWithin(cij, distanceSqr, JW.byMethod("reveal"));
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

	resetMining: function() {
		var m = new FL.Matrix(this.map.size);
		this.bases.each(function(base) {
			base.mining = 0;
			base.resources = [];
			this.map.eachWithin(base.ij, FL.baseMiningRangeSqr, function(cell, ij) {
				var miningBase = m.getCell(ij);
				if (!miningBase) {
					m.setCell(ij, base);
					return;
				}
				if (FL.Vector.lengthSqr(FL.Vector.diff(ij, miningBase.ij)) >
					FL.Vector.lengthSqr(FL.Vector.diff(ij, base.ij))) {
					m.setCell(ij, base);
					return;
				}
			}, this);
		}, this);
		for (var i = 0; i < this.map.size; ++i) {
			for (var j = 0; j < this.map.size; ++j) {
				var ij = [i, j];
				var base = m.getCell(ij);
				this.map.getCell(ij).setMiningBase(base);
				if (!base) {
					continue;
				}
				var cell = this.map.getCell(ij);
				if (cell.resource) {
					base.resources.push(cell.resource);
				}
				if (cell.rock) {
					continue;
				}
				base.mining++;
				if (cell.resource && cell.resource.bonus) {
					base.mining += cell.resource.bonus;
				}
			}
		}
	},

	buildBase: function(unit) {
		this.createBase(unit.ij, unit.player);
		this.destroyUnit(unit);
		this.resetMining();
	},

	isBaseBuildable: function(ij, minDistance) {
		if (!this.isPassable(ij)) {
			return false;
		}
		if (this.map.getCell(ij).resource) {
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
				if (!this.map.inMatrix(dij) || (dirs.getCell(dij) != null)) {
					continue;
				}
				var cell = this.map.getCell(dij);
				if ((player !== 0) || cell.scouted) {
					if (!this.isPassable(dij)) {
						continue;
					}
				}
				if ((player !== 0) || cell.visible) {
					var unit = cell.unit;
					if (unit) {
						if ((unit.player === player) || !FL.Vector.equal(dij, tij)) {
							continue;
						}
					}
					if (!unit && this.isByEnemy(cij, player) && this.isByEnemy(dij, player)) {
						continue;
					}
					var base = cell.base;
					if (base && (base.player !== player) && !FL.Vector.equal(dij, tij)) {
						continue;
					}
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
		this._generateResources();
		this._generateBases();
		this.resetMining();
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

	_generateResources: function() {
		JW.Array.each(FL.Resource.typeArray, function(resource) {
			for (var r = 0; r < resource.count; ++r) {
				var ij;
				do {
					ij = this.map.ijRandom();
					var cell = this.map.getCell(ij);
				} while (cell.rock || cell.resource);
				cell.resource = resource;
			}
		}, this);
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
			for (var i = -1; i <= 1; ++i) {
				for (var j = -1; j <= 1; ++j) {
					var cell = this.map.getCell(FL.Vector.add(ij, [i, j]));
					if (cell) {
						cell.rock = false;
					}
				}
			}
			this.createBase(ij, p);
			for (var d = 0; d < 4; ++d) {
				this.createUnit(FL.Vector.add(ij, FL.dir4[d]), p, FL.Unit.types["militia"], "patrol");
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
			var coef = (player === 0) ? 1 : FL.AI.productionCoef;
			var production = base.production[type.id] + base.overflow + Math.round(coef * base.mining);
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
