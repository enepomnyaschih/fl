FL.Data = function() {
	FL.Data._super.call(this);
	this.map = null;
	this.bases = new JW.Set();
	this.units = new JW.ObservableArray();
	this.logEvent = new JW.Event();
	this.lostEvent = new JW.Event();
	this.nextPlayerEvent = new JW.Event();
	this.turn = 1;
	this.player = 0;
	this.animationManager = this.own(new FL.Data.AnimationManager(this));
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
		var unit = new FL.Unit(this, ij, player, type, behaviour);
		this.units.add(unit);
		if (player == 0) {
			this.reveal(ij, unit.getSightRangeSqr());
		}
	},

	destroyUnit: function(unit) {
		this.units.removeItem(unit);
		unit.destroy();
	},

	moveUnit: function(unit, selection) {
		if (!unit.ijTarget) {
			return;
		}
		var path = this.getPath(unit.ij.get(), unit.ijTarget, unit.player);
		if (!path) {
			unit.ijTarget = null;
			return;
		}
		if (!selection) {
			selection = JW.Array.map(unit.health.get(), function() { return true; });
		}
		var selectionCount = JW.Array.count(selection, JW.byField());
		unit.hold = false;
		for (var i = 0; (i < path.length) && unit.movement.get(); ++i) {
			var tij = FL.Vector.add(unit.ij.get(), FL.dir8[path[i]]);
			if (!this.isPassable(tij)) {
				break;
			}
			var sourceCell = unit.cell;
			var targetCell = this.map.getCell(tij);
			if (targetCell.unit) {
				if ((targetCell.unit.player !== unit.player) && (unit.attacked < unit.getCount()) &&
						FL.Vector.equal(tij, unit.ijTarget) && (unit.type.damage !== 0)) {
					unit.movement.set(unit.movement.get() - 1);
					this.fightUnit(unit, targetCell.unit);
				} else if ((targetCell.unit.player === unit.player) &&
						(targetCell.unit.type === unit.type) &&
						(targetCell.unit.getCount() + selectionCount <= unit.type.capacity) &&
						FL.Vector.equal(tij, unit.ijTarget)) {
					targetCell.unit.movement.set(Math.min(unit.movement.get() - 1, targetCell.unit.movement.get()));
					targetCell.unit.merge(unit.split(selection));
				}
				unit.ijTarget = null;
				break;
			}
			if (targetCell.base && (targetCell.base.player !== unit.player)) {
				if (FL.Vector.equal(tij, unit.ijTarget) && (unit.attacked < unit.getCount()) &&
						(unit.type.damage !== 0)) {
					unit.movement.set(unit.movement.get() - 1);
					sourceCell.invalid = true;
					this.fightBase(unit, targetCell.base);
				}
				unit.ijTarget = null;
				break;
			}
			unit.movement.set(unit.movement.get() - 1);
			unit.ij.set(tij);
		}
		if (unit.ijTarget && FL.Vector.equal(unit.ij.get(), unit.ijTarget)) {
			unit.ijTarget = null;
		}
	},

	moveUnits: function(player) {
		this.units.$filter(JW.byValue("player", player)).each(this.moveUnit, this);
	},

	fightUnit: function(attacker, defender) {
		var attackerHealth = attacker.health.get().concat();
		var defenderHealth = defender.health.get().concat();
		var attackerDamage = attacker.type.damage /
			(defender.type.armor + defender.getDefenseDegree() * defender.type.defense);
		var defenderDamage = defender.type.damage / attacker.type.armor;
		while ((attacker.attacked < attacker.getCount()) && (defenderHealth.length !== 0)) {
			++attacker.attacked;
			FL.fight(attackerDamage, defenderHealth);
		}
		while ((defender.defended < defender.getCount()) && (attackerHealth.length !== 0)) {
			++defender.defended;
			FL.fight(defenderDamage, attackerHealth);
		}
		attacker.setHealth(attackerHealth);
		defender.setHealth(defenderHealth);
		if (attacker.type.blitz) {
			attacker.attacked = 0;
		}
		if (defender.type.cover) {
			defender.defended = 0;
		}
	},

	fightBase: function(attacker, base) {
		var defenderHealth = [base.health.get()];
		var attackerDamage = attacker.type.damage / FL.baseArmor;
		while ((attacker.attacked < attacker.getCount()) && (defenderHealth.length !== 0)) {
			++attacker.attacked;
			FL.fight(attackerDamage, defenderHealth);
		}
		if (defenderHealth.length === 0) {
			this.destroyBase(base);
			this.resetMining();
		} else {
			base.health.set(defenderHealth[0]);
		}
		if (attacker.type.blitz) {
			attacker.attacked = 0;
		}
	},

	endTurn: function() {
		if (this.player === 0) {
			this.log("End turn");
		}
		this.moveUnits(this.player);
		this.animationManager.startSequentialAnimation();
	},

	nextPlayer: function() {
		this._endTurnPlayer(this.player);
		this.player = (this.player + 1) % 2;
		if (this.player === 0) {
			++this.turn;
			this.log("Turn " + this.turn);
		}
		this.nextPlayerEvent.trigger();
		if (this.player !== 0) {
			FL.AI.process(this, this.player);
			this.endTurn();
		}
	},

	_endTurnPlayer: function(player) {
		this.units.$filter(JW.byValue("player", player)).each(function(unit) {
			unit.fortified = (unit.movement.get() === unit.type.movement);
			if (unit.fortified) {
				unit.heal();
			}
			unit.movement.set(unit.type.movement);
			unit.attacked = 0;
			unit.defended = 0;
		}, this);
		this.bases.$filter(JW.byValue("player", player)).each(JW.byMethod("heal"));
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
				this.reveal(unit.ij.get(), unit.getSightRangeSqr());
			}
		}, this);
	},

	resetMining: function() {
		var m = new FL.Matrix(this.map.size);
		this.bases.each(function(base) {
			base.mining = 0;
			base.resources = [];
			this.map.eachWithin(base.ij, FL.baseMiningRangeSqr, function(cell, ij) {
				if (cell.rock) {
					return;
				}
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
				base.mining += cell.hill ? 2 : 1;
				if (cell.resource && cell.resource.bonus) {
					base.mining += cell.resource.bonus;
				}
			}
		}
	},

	buildBase: function(unit) {
		this.createBase(unit.ij.get(), unit.player);
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

	isDroppable: function(sij, tij, rangeSqr, player) {
		if (FL.Vector.lengthSqr(FL.Vector.diff(sij, tij)) > rangeSqr) {
			return false;
		}
		var cell = this.map.getCell(tij);
		if (!this.isPassable(tij) || cell.unit || cell.base) {
			return false;
		}
		if ((player === 0) && !cell.scouted) {
			return false;
		}
		return true;
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
					if (unit && !FL.Vector.equal(dij, tij)) {
						continue;
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

	isControllable: function() {
		return (this.player === 0) && !this.animationManager.sequential;
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
		this.bases.each(function(base) {
			this.map.eachWithin(base.ij, FL.baseMiningRangeSqr, function(cell) {
				if (cell.resource) {
					if (cell.resource.aiProduction) {
						cell.resource = null;
					} else if (cell.resource.bonus && (base.mining - cell.resource.bonus >= 20)) {
						base.mining -= cell.resource.bonus;
						cell.resource = null;
					}
				}
			}, this);
			var resourceId;
			if (base.mining < 20) {
				resourceId = "aluminum";
			} else if (base.mining < 24) {
				resourceId = "oil";
			} else if (base.mining < 26) {
				resourceId = "iron";
			} else if (base.mining < 30) {
				resourceId = "copper";
			} else {
				return;
			}
			this.map.eachWithin(base.ij, 2, function(cell) {
				if (resourceId && !cell.resource) {
					cell.resource = FL.Resource.types[resourceId];
					resourceId = null;
				}
			}, this);
		}, this);
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
				for (var d = 0; d < 4; ++d) {
					var hij = FL.Vector.add(ij, FL.dir4[d]);
					if (this.map.inMatrix(hij) && (Math.random() < FL.rockHillChance)) {
						this.map.getCell(hij).hill = true;
					}
				}
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
			this.createBase(ij, p).health.set(1);
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
			if (production < type.cost) {
				base.production[type.id] = Math.min(production, type.cost);
				base.overflow = 0;
				return;
			}
			if (!cell.unit) {
				this.createUnit(base.ij, base.player, type, base.unitBehaviour);
			} else if ((cell.unit.type === base.unitType.get()) &&
					(cell.unit.getCount() < cell.unit.type.capacity)) {
				cell.unit.merge([1]);
				cell.unit.hold = false;
			} else {
				return;
			}
			base.production[type.id] = 0;
			base.overflow = production - type.cost;
			base.unitType.set(null);
			base.unitBehaviour = null;
		}, this);
	}
});
