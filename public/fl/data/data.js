FL.Data = function() {
	FL.Data._super.call(this);
	this.map = null;
	this.bases = new JW.Set();
	this.units = new JW.ObservableArray();
	this.particles = new JW.ObservableArray();
	this.lostEvent = new JW.Event();
	this.nextPlayerEvent = new JW.Event();
	this.mapUpdateEvent = new JW.Event();
	this.turn = new JW.Property(1);
	this.player = 0;
	this.animationManager = this.own(new FL.Data.AnimationManager(this));
	this.baseNames = FL.baseNames.concat();
	this.unitNames = [];
	this.ai = null; // FL.AI
	this.enemyScouted = false;
	this.lostPlayer = null;
	for (var i = 0; i < 2; ++i) {
		this.unitNames.push({
			worker   : this.own(new FL.UnitNameList(["Worker"])),
			infantry : this.own(new FL.UnitNameList(FL.infantryNames)),
			vehicle  : this.own(new FL.UnitNameList(FL.vehicleNames))
		});
	}
	this._generateMap();
};

JW.extend(FL.Data, JW.Class, {
	createBase: function(ij, player) {
		var cell = this.map.getCell(ij);
		var base = new FL.Base(this, cell, player);
		if (this.baseNames.length === 0) {
			base.name = "No more names";
		} else {
			var nameIndex = FL.random(this.baseNames.length);
			base.name = this.baseNames[nameIndex];
			this.baseNames.splice(nameIndex, 1);
		}
		this.bases.add(base);
		cell.base = base;
		this.map.eachWithin(ij, FL.baseMiningRangeSqr, function(cell) {
			cell.addNearBase(base);
		}, this);
		this.reveal(ij, FL.baseSightRangeSqr, player);
		if (cell.visible[0] && (this.turn.get() > 1)) {
			FL.sound("base-build");
		}
		this.mapUpdateEvent.trigger();
		return base;
	},

	destroyBase: function(base) {
		this.map.eachWithin(base.ij, FL.baseMiningRangeSqr, function(cell) {
			cell.removeNearBase(base);
		}, this);
		this.bases.remove(base);
		this.map.getCell(base.ij).setBase(null);
		base.destroy();
		if (base.name !== "No more names") {
			this.baseNames.push(base.name);
		}
		this.mapUpdateEvent.trigger();
		this.checkDefeat(base.player);
	},

	createUnit: function(ij, player, type, behaviour, name) {
		var unit = new FL.Unit(this, ij, player, type, behaviour);
		var unitNameList = this.unitNames[player][type.naming];
		unit.name = unitNameList.checkout(name);
		this.units.add(unit);
		this.reveal(ij, unit.getSightRangeSqr(), player);
		this.mapUpdateEvent.trigger();
		return unit;
	},

	destroyUnit: function(unit) {
		this.units.removeItem(unit);
		unit.destroy();
		this.mapUpdateEvent.trigger();
		this.checkDefeat(unit.player);
	},

	lose: function(player) {
		this.enemyScouted = true;
		this.revealAll(0);
		this.lostPlayer = player;
		this.lostEvent.trigger(player);
	},

	checkDefeat: function(player) {
		var baseCount = this.bases.count(JW.byValue("player", player));
		var mcvCount = this.units.count(function(unit) {
			return unit.alive && (unit.player === player) && (unit.type.id === "mcv");
		}, this);
		if (baseCount === 0 && mcvCount === 0) {
			this.lose(player);
		}
	},

	moveUnit: function(unit, selection) {
		if (!unit.ijTarget) {
			return false;
		}
		if (FL.Vector.equal(unit.ij.get(), unit.ijTarget)) {
			unit.ijTarget = null;
			return false;
		}
		var path = this.getPath(unit.ij.get(), unit.ijTarget, unit.player);
		if (!path) {
			unit.ijTarget = null;
			return false;
		}
		unit.hold = false;
		unit.skipped = false;
		if (!selection || !JW.Array.some(selection, JW.byField())) {
			selection = JW.Array.map(unit.persons.get(), function() { return true; });
		}
		if (!JW.Array.every(selection, JW.byField())) {
			unit = unit.split(selection);
		}
		var useful = false;
		var moved = false;
		for (var i = 0; (i < path.length) && unit.movement.get(); ++i) {
			var tij = FL.Vector.add(unit.ij.get(), FL.dir8[path[i]]);
			var outcome = this.getMoveOutcome(unit, tij, FL.Vector.equal(tij, unit.ijTarget));
			if (outcome === 0) {
				break;
			}
			var targetCell = this.map.getCell(tij);
			if (outcome === 2) {
				useful = this.fightUnit(unit, targetCell.unit) || useful;
				unit.ijTarget = null;
				break;
			}
			if (outcome === 3) {
				useful = this.fightBase(unit, targetCell.base) || useful;
				unit.ijTarget = null;
				break;
			}
			useful = true;
			if (outcome === 5) {
				this.map.everyWithin8(tij, 1, function(cell) {
					if (cell.unit) {
						cell.reveal(unit.player);
					}
				}, this);
				unit.ijTarget = null;
				break;
			}
			moved = true;
			unit.decreaseMovement();
			unit.ij.set(tij);
			if (outcome === 4) {
				unit.ijTarget = null;
				break;
			}
		}
		if (unit.ijTarget && FL.Vector.equal(unit.ij.get(), unit.ijTarget)) {
			unit.ijTarget = null;
		}
		if ((unit.cell.unit != null) && (unit.cell.unit !== unit) && unit.alive) {
			unit.cell.unit.merge(unit.persons.get());
			this.destroyUnit(unit);
		}
		if (moved && unit.visible[0]) {
			FL.sound(unit.type.movementSound);
		}
		if (useful) {
			this.mapUpdateEvent.trigger();
		}
		return useful ? unit : false;
	},

	moveUnits: function(player) {
		this.units.$filter(JW.byValue("player", player)).each(function(unit) {
			this.moveUnit(unit);
		}, this);
	},

	fightUnit: function(attacker, defender) {
		var attackerSurvivors = JW.Array.map(attacker.persons.get(), JW.byMethod("clone"));
		var defenderSurvivors = JW.Array.map(defender.persons.get(), JW.byMethod("clone"));
		var defense = 1 + (defender.cell.hill ? 1 : 0);
		var attackerHits = attacker.getAttackCount();
		var defenderHits = defender.getDefendCount();
		if (attackerHits === 0) {
			return false;
		}
		var attackerDamage = 0;
		var defenderDamage = 0;
		while ((attackerHits !== 0) && (defenderSurvivors.length !== 0)) {
			--attackerHits;
			attackerDamage += attacker.type.damage;
			FL.fight(attacker.type.damage, defense, defenderSurvivors);
		}
		while ((defenderHits !== 0) && (attackerSurvivors.length !== 0)) {
			--defenderHits;
			defenderDamage += defender.type.damage;
			FL.fight(defender.type.damage, 0, attackerSurvivors);
		}
		var attackerVictims = attacker.getCount() - attackerSurvivors.length;
		var defenderVictims = defender.getCount() - defenderSurvivors.length;
		attacker.setPersons(attackerSurvivors, true);
		defender.setPersons(defenderSurvivors, true);
		attacker.retainAttacks(attackerHits);
		defender.retainDefends(defenderHits);
		attacker.animations.push(new FL.Unit.BattleAnimation(this,
			attacker, defenderDamage, attackerVictims,
			defender, attackerDamage, defenderVictims));
		this.animationManager.enqueue(attacker);
		return true;
	},

	fightBase: function(attacker, base) {
		if (base.health.get() === 0) {
			return false;
		}
		var defenderSurvivors = [base.toPerson()];
		var attackerHits = attacker.getAttackCount();
		if (attackerHits === 0) {
			return false;
		}
		var attackerDamage = 0;
		while ((attackerHits !== 0) && (defenderSurvivors.length !== 0)) {
			--attackerHits;
			attackerDamage += attacker.type.damage;
			FL.fight(attacker.type.damage, 0, defenderSurvivors);
		}
		base.health.set((defenderSurvivors.length === 0) ? 0 : defenderSurvivors[0].health);
		attacker.animations.push(new FL.Unit.BattleAnimation(this,
			attacker, 0, 0,
			base, attackerDamage, 1 - defenderSurvivors.length));
		this.animationManager.enqueue(attacker);
		attacker.retainAttacks(attackerHits);
		return true;
	},

	endTurn: function() {
		this.moveUnits(this.player);
		this.animationManager.changePlayerOnFinish = true;
	},

	nextPlayer: function() {
		this._endTurnPlayer(this.player);
		this.player = (this.player + 1) % 2;
		if (this.player === 0) {
			this.turn.set(this.turn.get() + 1);
		}
		this.units.$filter(JW.byValue("player", this.player)).each(JW.byMethod("heal"));
		this.bases.$filter(JW.byValue("player", this.player)).each(JW.byMethod("heal"));
		this.nextPlayerEvent.trigger();
		if (this.player !== 0) {
			this.ai = new FL.AI(this, this.player);
		} else {
			this.ai.destroy();
			this.ai = null;
		}
	},

	_endTurnPlayer: function(player) {
		this.units.$filter(JW.byValue("player", player)).each(JW.byMethod("refresh"));
		this.resetVision(player);
		this._produce(player);
		this.mapUpdateEvent.trigger();
	},

	reveal: function(cij, distanceSqr, player) {
		this.map.eachWithin(cij, distanceSqr, JW.byMethod("reveal", [player]));
	},

	revealAll: function(player) {
		this.map.every(function(cell) {
			cell.reveal(player);
		}, this);
		this.mapUpdateEvent.trigger();
	},

	resetVision: function(player) {
		for (var i = 0; i < this.map.size; ++i) {
			for (var j = 0; j < this.map.size; ++j) {
				this.map.getCell([i, j]).hide(player);
			}
		}
		this.bases.each(function(base) {
			if (base.player === player) {
				this.reveal(base.ij, FL.baseSightRangeSqr, player);
			}
		}, this);
		this.units.each(function(unit) {
			if (unit.player === player) {
				this.reveal(unit.ij.get(), unit.getSightRangeSqr(), player);
			}
		}, this);
	},

	buildBase: function(unit) {
		this.createBase(unit.ij.get(), unit.player);
		this.destroyUnit(unit);
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

	isDroppable: function(tij, player) {
		var cell = this.map.getCell(tij);
		if (!this.isPassable(tij) || cell.unit || (cell.base && cell.base.player !== player)) {
			return false;
		}
		if (!cell.visible[player]) {
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

	isByEnemy: function(cij, player, onlyVisible) {
		return this.map.someWithin8(cij, 1, function(cell) {
			return cell.unit && (cell.unit.player !== player) &&
				(!onlyVisible || cell.unit.visible[player]);
		}, this);
	},

	/*
	0 - can not move
	1 - can move
	2 - fight unit
	3 - fight base
	4 - merge
	5 - can not move because of hidden enemies
	*/
	getMoveOutcome: function(unit, tij, isTargetPoint) {
		if (!this.isPassable(tij)) {
			return 0;
		}
		isTargetPoint = (isTargetPoint == null) || isTargetPoint;
		var sourceCell = unit.cell;
		var targetCell = this.map.getCell(tij);
		if (targetCell.unit && (targetCell.unit.player !== unit.player)) {
			return (unit.type.damage !== 0 && isTargetPoint) ? 2 : 0;
		}
		if (this.isByEnemy(unit.ij.get(), unit.player) && this.isByEnemy(tij, unit.player)) {
			return this.isByEnemy(tij, unit.player, true) ? 0 : 5;
		}
		if (targetCell.unit && (targetCell.unit.player === unit.player)) {
			return ((targetCell.unit.type === unit.type) &&
				(targetCell.unit.getCount() + unit.getCount() <= unit.type.capacity) &&
				isTargetPoint) ? 4 : 0;
		}
		if (targetCell.base && (targetCell.base.player !== unit.player)) {
			return (unit.type.damage !== 0 && isTargetPoint) ? 3 : 0;
		}
		return 1;
	},

	getPath: function(sij, tij, player, everythingVisible) {
		var path = this.findTarget(sij, player, function(cell) {
			return FL.Vector.equal(tij, cell.ij);
		}, this, everythingVisible);
		return path ? JW.Array.map(path, JW.byField("0")) : null;
	},

	findTarget: function(sij, player, callback, scope, everythingVisible, movementLimit) {
		if (callback.call(scope || this, this.map.getCell(sij))) {
			return [];
		}
		if (movementLimit == null) {
			movementLimit = Number.POSITIVE_INFINITY;
		}
		var queue = [sij];
		var tail = 0;
		var movement = 0;
		var movementHead = 0;

		/*
		labels values:
		- number - distance from source, source is 0
		- boolean - result of callback function if already determined
		*/
		var labels = new FL.Matrix(this.map.size);
		labels.setCell(sij, 0);
		while (tail < queue.length) {
			if (tail == movementHead) {
				++movement;
				movementHead = queue.length;
			}
			var cij = queue[tail++];
			for (var dir = 0; dir < FL.dir8.length; ++dir) {
				var dij = FL.Vector.add(cij, FL.dir8[dir]);
				var label = labels.getCell(dij);
				if (!this.map.inMatrix(dij) || (typeof label === "number")) {
					continue;
				}
				var cell = this.map.getCell(dij);
				if (everythingVisible || cell.scouted[player]) {
					if (!this.isPassable(dij)) {
						continue;
					}
				}
				var unit = cell.unit;
				if ((!unit || unit.player === player) &&
						this.isByEnemy(cij, player, !everythingVisible) &&
						this.isByEnemy(dij, player, !everythingVisible)) {
					continue;
				}
				var fits;
				if (typeof label === "boolean") {
					fits = label;
				} else {
					fits = callback.call(scope || this, cell, dij) !== false;
					labels.setCell(dij, fits);
				}
				if (unit && (everythingVisible || unit.visible[player]) && !fits) {
					continue;
				}
				if ((everythingVisible || cell.visible[player]) && cell.base &&
						(cell.base.player !== player) && !fits) {
					continue;
				}
				if (movement < movementLimit) {
					queue.push(dij);
				}
				labels.setCell(dij, movement);
				if (fits) {
					return this._backtracePath(labels, dij, player, everythingVisible);
				}
			}
		}
		return null;
	},

	isControllable: function() {
		return (this.player === 0) && !this.animationManager.sequential;
	},

	isUnitBlockProduction: function(base) {
		if (!base) {
			return false;
		}
		var type = base.unitType.get();
		if (!base.cell.unit || !type) {
			return false;
		}
		if ((base.cell.unit.type === type) && (base.cell.unit.getCount() < type.capacity)) {
			return false;
		}
		var coef = (base.player === 0) ? 1 : FL.AI.productionCoef;
		var production = base.production[type.id] + base.overflow + Math.round(coef * base.mining);
		return production >= type.cost;
	},

	_generateMap: function() {
		this.map = new FL.Matrix(FL.mapSize);
		for (var i = 0; i < FL.mapSize; ++i) {
			for (var j = 0; j < FL.mapSize; ++j) {
				var ij = [i, j];
				var cell = new FL.Cell(this, ij);
				this.map.setCell(ij, cell);
			}
		}
		this._generateRocks();
		this._generateResources();
		this._generateBases();
		this.bases.each(function(base) {
			this.map.eachWithin(base.ij, FL.baseMiningRangeSqr, function(cell) {
				if (cell.resource) {
					if (cell.resource.deniedAtStart) {
						this._generateResource(cell.resource);
						cell.setResource(null);
					} else if (cell.resource.bonus && (base.mining - cell.resource.bonus >= 20)) {
						cell.setResource(null);
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
					cell.setResource(FL.Resource.types[resourceId]);
					resourceId = null;
				}
			}, this);
		}, this);
		this._equalizeResources();
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
				this.map.getCell(ij).setRock(true);
				for (var d = 0; d < 4; ++d) {
					var hij = FL.Vector.add(ij, FL.dir4[d]);
					if (this.map.inMatrix(hij) && (Math.random() < FL.rockHillChance)) {
						this.map.getCell(hij).setHill(true);
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
				this._generateResource(resource);
			}
		}, this);
	},

	_generateResource: function(resource) {
		var ij, cell;
		do {
			ij = this.map.ijRandom();
			cell = this.map.getCell(ij);
		} while (cell.rock || cell.resource || cell.miningBase ||
				this._isResourceTooClose(resource, ij));
		cell.setResource(resource);
	},

	_isResourceTooClose: function(resource, cij) {
		if (!resource.minDistanceSqr) {
			return false;
		}
		var result = false;
		this.map.eachWithin(cij, resource.minDistanceSqr, function(cell) {
			result = result || (cell.resource === resource);
		}, this);
		return result;
	},

	_equalizeResources: function() {
		if (this.map.every(function(cell) { return cell.resource == null; })) {
			return;
		}

		function getDistanceCoef(distance) {
			var value = Math.max(0, 1 - distance / FL.resourceEqualizeRange);
			return value * value;
		}

		var profitMatrix = new FL.Matrix(this.map.size);
		this.map.every(function(cell, ij) {
			var distance = this.map.getSideDistance(ij);
			var profit = FL.resourceEqualizeSideBuff * getDistanceCoef(distance);
			profitMatrix.setCell(ij, Math.max(0, profit));
		}, this);

		var countMatrices = JW.Map.map(FL.Resource.types, function(resource) {
			var matrix = new FL.Matrix(this.map.size);
			matrix.fill(0);
			return matrix;
		}, this);

		var setResource = JW.inScope(function(ij, resource, checkin) {
			if (!resource) {
				return;
			}
			var sign = checkin ? 1 : -1;
			this.map.everyWithin8(ij, FL.resourceEqualizeRange, function(c, p) {
				var distance = FL.Vector.length(FL.Vector.diff(p, ij));
				var profit = sign * resource.profit * getDistanceCoef(distance);
				profitMatrix.setCell(p, profitMatrix.getCell(p) + profit);
			}, this);
			if (!resource.minDistanceSqr) {
				return;
			}
			var countMatrix = countMatrices[resource.id];
			this.map.eachWithin(ij, resource.minDistanceSqr, function(c, p) {
				countMatrix.setCell(p, countMatrix.getCell(p) + sign);
			}, this);
		}, this);

		this.map.every(function(cell, ij) {
			setResource(ij, cell.resource, true);
		}, this);

		while (true) {
			var highestProfit = -1,
				highestProfitCell;
			this.map.every(function(cell, ij) {
				if (!cell.resource || cell.miningBase) {
					return;
				}
				var profit = profitMatrix.getCell(ij);
				if (highestProfit < profit) {
					highestProfit = profit;
					highestProfitCell = cell;
				}
			}, this);
			if (highestProfit < 0) {
				break;
			}

			var resource = highestProfitCell.resource;
			var countMatrix = countMatrices[resource.id];
			highestProfitCell.setResource(null);
			setResource(highestProfitCell.ij, resource, false);

			var lowestProfit = Number.POSITIVE_INFINITY,
				lowestProfitCell;
			this.map.every(function(cell, ij) {
				if (cell.rock || cell.resource || cell.miningBase || countMatrix.getCell(ij)) {
					return;
				}
				var profit = profitMatrix.getCell(ij);
				if (lowestProfit > profit) {
					lowestProfit = profit;
					lowestProfitCell = cell;
				}
			}, this);

			lowestProfitCell.setResource(resource);
			setResource(lowestProfitCell.ij, resource, true);
			profitMatrix.setCell(lowestProfitCell.ij, Number.NEGATIVE_INFINITY);
		}
		/*
		console.log("Lowest: ", lowestProfitCell.ij, ", ", lowestProfit, ", ", resource.id);
		for (var i = 0; i < this.map.size; ++i) {
			console.log(JW.Array.map(profitMatrix.cells[i], function(profit) {
				if (profit < 0) {
					return " -1";
				}
				return JW.String.prepend(Math.round(profit).toString(), 3, " ");
			}, this).join(","));
		}
		*/
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
						cell.setRock(false);
					}
				}
			}
			this.createBase(ij, p).health.set(1);
			for (var d = 0; d < 4; ++d) {
				this.createUnit(FL.Vector.add(ij, FL.dir4[d]), p, FL.Unit.types["militia"], "hold");
			}
		}
	},

	_backtracePath: function(labels, tij, player, everythingVisible) {
		var path = [];
		var distance = labels.getCell(tij);
		var targetUnit = this.map.getCell(tij).unit;
		var tByEnemy, sByEnemy;
		if (targetUnit && (targetUnit.player !== player)) {
			tByEnemy = false;
		} else {
			tByEnemy = this.isByEnemy(tij, player, !everythingVisible);
		}
		while (true) {
			if (distance === 0) {
				path.reverse();
				return path;
			}
			--distance;
			var dir, sij;
			for (var d = 0; d < 8; ++d) {
				dir = (d < 4) ? (2 * d) : (2 * d - 7);
				sij = FL.Vector.diff(tij, FL.dir8[dir]);
				if (labels.getCell(sij) === distance) {
					sByEnemy = this.isByEnemy(sij, player, !everythingVisible);
					if (!tByEnemy || !sByEnemy) {
						break;
					}
				}
			}
			path.push([dir, tij]);
			tByEnemy = sByEnemy;
			tij = sij;
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
				base.production[type.id] = production;
				base.overflow = 0;
				if (this.isUnitBlockProduction(base)) {
					base.cell.unit.hold = false;
				}
				return;
			}
			if (!cell.unit) {
				if (base.player === 0) {
					FL.sound("produced");
				}
				this.createUnit(base.ij, base.player, type, base.unitBehaviour);
			} else if ((cell.unit.type === base.unitType.get()) &&
					(cell.unit.getCount() < cell.unit.type.capacity)) {
				cell.unit.merge([new FL.Unit.Person(cell.unit.type)]);
			} else {
				if (this.isUnitBlockProduction(base)) {
					base.cell.unit.hold = false;
				}
				return;
			}
			base.production[type.id] = 0;
			base.overflow = production - type.cost;
			base.unitType.set(null);
			base.unitBehaviour = null;
		}, this);
	},

	_testBasesMining: function() {
		this.bases.each(function(base) {
			if (base.mining !== base.getTotalMining()) {
				throw new Error("Base mining is spoiled");
			}
		}, this);
	}
});
