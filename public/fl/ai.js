FL.AI = function(data, player) {
	FL.AI._super.call(this);
	this.data = data;
	this.player = player;

	this.bases = data.bases.$toArray().filter(JW.byValue("player", player));
	this.stackCost = this.stackCostInitial + this.stackCostPerBase * this.bases.length;
	this.unitCount = JW.Map.map(FL.Unit.types, function() { return 0; });
	this.totalUnitCount = JW.Map.map(FL.Unit.types, function() { return 0; });
	this.behaviourUnits = JW.Array.$index(this.behaviours, JW.byField()).map(function() { return []; });
	this.totalBehaviourCount = JW.Map.map(this.behaviourUnits, function() { return 0; });
	this.unitBehaviours = {};
	this.basePatrolCount = JW.Array.$index(this.bases, JW.byField("_iid")).map(function() { return 0; });
	this.units = [];
	this.enemyUnits = null; // Map<Vector2, FL.Unit>
	this.enemyBases = null; // Map<Vector2, FL.Base>
	this.allEnemies = null; // Map<Vector2, Vector2>

	var enemyUnits = data.units.$toArray().filter(function(unit) { return unit.player !== this.player }, this);
	this.threateningPairs = JW.Array.$map(enemyUnits, function(unit) {
		var nearestBase, nearestBaseDistanceSqr = Number.POSITIVE_INFINITY;
		JW.Array.each(this.bases, function(base) {
			var distanceSqr = FL.Vector.lengthSqr(FL.Vector.diff(unit.ij.get(), base.ij));
			if (distanceSqr < nearestBaseDistanceSqr) {
				nearestBase = base;
				nearestBaseDistanceSqr = distanceSqr;
			}
		}, this);
		if (nearestBaseDistanceSqr > this.aquisitionDistanceSqr) {
			return false;
		}
		return [unit, nearestBase];
	}, this).filter(JW.byField());

	data.units.each(function(unit) {
		if (unit.player !== this.player) {
			return;
		}
		this.units.push(unit);
		++this.unitCount[unit.type.id];
		++this.totalUnitCount[unit.type.id];
		if (unit.cell.base) {
			if (unit.cell.base.unitType.get() && (unit.cell.base.unitType.get() !== unit.type)) {
				this.makeUseful(unit);
			} else if (this.isUnitReady(unit)) {
				this.makeUseful(unit);
			}
		} else {
			if (unit.isHealed() || this.isEnemyWithin(unit.ij.get(), this.healSafeDistance)) {
				this.makeUseful(unit);
			}
		}
		++this.totalBehaviourCount[unit.behaviour];
	}, this);
	//console.log(JSON.stringify(this.totalBehaviourCount));

	JW.Array.each(this.bases, function(base) {
		var type = base.unitType.get();
		if (type) {
			++this.totalUnitCount[type.id];
		}
		if (base.unitBehaviour) {
			++this.totalBehaviourCount[base.unitBehaviour];
		}
	}, this);

	// produce units
	this.isLowTierBase = JW.Array.some(this.bases, function(base) {
		return !JW.Array.some(base.resources, JW.byField("aiProduction"));
	}, this);
	this.availableBehaviours = this.behaviours.concat();
	JW.Array.each(this.bases, function(base) {
		if (base.unitType.get()) {
			return;
		}
		var cell = this.data.map.getCell(base.ij);
		if (cell.unit && !this.isUnitReady(cell.unit)) {
			base.unitType.set(cell.unit.type);
			return;
		}
		var availableBehaviours = ((Math.random() < this.forcedHoldProbability) ||
			(this.totalBehaviourCount["hold"] < this.minHoldUnits)) ?
			["hold"] : this.availableBehaviours;
		var unitType;
		if (this.totalBehaviourCount["build"] >= this.mcvLimit) {
			JW.Array.removeItem(availableBehaviours, "build");
		}
		if (this.totalBehaviourCount["patrol"] >= this.patrolInitial + this.patrolPerBase * this.bases.length) {
			JW.Array.removeItem(availableBehaviours, "patrol");
		}
		var availableUnitTypes = base.getAvailableUnitTypes();
		availableUnitTypes = JW.Array.filter(availableUnitTypes, function(unitType) {
			return JW.Array.some(unitType.ai, function(behaviour) {
				return JW.Array.containsItem(availableBehaviours, behaviour);
			}, this);
		}, this);
		var preferredUnitTypes = JW.Array.filter(availableUnitTypes, this.isUnitTypePreferred, this);
		if (preferredUnitTypes.length) {
			availableUnitTypes = preferredUnitTypes;
		}
		unitType = availableUnitTypes[FL.random(availableUnitTypes.length)];
		base.unitType.set(unitType);
		++this.totalUnitCount[unitType.id];
		var unitAvailableBehaviours = JW.Array.filter(unitType.ai, function(behaviour) {
			return JW.Array.containsItem(availableBehaviours, behaviour);
		}, this);
		var behaviour = unitAvailableBehaviours.length ?
			unitAvailableBehaviours[FL.random(unitAvailableBehaviours.length)] :
			unitType.ai[FL.random(unitType.ai.length)];
		base.unitBehaviour = behaviour;
		++this.totalBehaviourCount[behaviour];
	}, this);

	this.holdMap = new FL.Matrix(this.data.map.size);
	JW.Array.each(this.bases, function(base) {
		this.data.map.eachWithin(base.ij, this.baseHoldRangeSqr, function(cell, ij) {
			if (!cell.resource || (cell.resource.id === "airport")) {
				this.holdMap.setCell(ij, true);
			}
		}, this);
	}, this);
	this.data.map.every(function(cell, ij) {
		if (!this.data.isPassable(ij) || this.data.isChoke(ij) || cell.base) {
			this.holdMap.setCell(ij, true);
		}
	}, this);
};

JW.extend(FL.AI, JW.Class, {
	behaviours: [
		"build",
		"patrol",
		"hold",
		"rush",
		"drop",
		"attack",
		"attacking",
		"assaulting"
	],
	patrolDistance: 3,
	healSafeDistance: 3,
	aquisitionDistanceSqr: 37,
	baseHoldRangeSqr: 5,
	unitHoldRangeSqr: 4,
	patrolInitial: 3,
	patrolPerBase: 1,
	mcvLimit: 2,
	baseFirstProductionProfit: 15,
	baseExtraProductionProfit: -4,
	baseDistanceProfit: -2,
	stackCostInitial: -30,
	stackCostPerBase: 80,
	forcedHoldProbability: .35,
	minHoldUnits: 4,

	doSomething: function() {
		if (this.build()) {
			return true;
		}
		this.findEnemies();
		return this.punish() ||
			this.defend() ||
			this.rush() ||
			this.patrol() ||
			this.drop() ||
			this.attack() ||
			this.hold();
	},

	build: function() {
		return JW.Array.some(this.behaviourUnits["build"].concat(), function(unit) {
			this.makeUseless(unit);
			/*if (this.data.isByEnemy(unit.ij.get(), this.player, true)) {
				this.moveUnit(unit, this.bases.length ? this.bases[0].ij : null);
				return true;
			}*/
			var ijTarget = this.findBaseSpot(unit.ij.get());
			if (!ijTarget) {
				unit.ijTarget = null;
				return false;
			}
			if (ijTarget && FL.Vector.equal(ijTarget, unit.ij.get())) {
				var base = this.data.buildBase(unit);
				base.unitType.set(FL.Unit.types["militia"]);
				base.unitBehaviour = "hold";
			} else {
				this.moveUnit(unit, ijTarget);
			}
			return true;
		}, this);
	},

	findEnemies: function() {
		this.allEnemies = {};
		this.enemyUnits = {};
		this.data.units.each(function(unit) {
			if (unit.alive && (unit.player !== this.player)) {
				this.allEnemies[unit.ij.get()] = unit.ij.get();
				this.enemyUnits[unit.ij.get()] = unit;
			}
		}, this);
		this.enemyBases = {};
		this.data.bases.each(function(base) {
			if (base.player !== this.player) {
				this.allEnemies[base.ij] = base.ij;
				this.enemyBases[base.ij] = base;
			}
		}, this);
	},

	punish: function() {
		var punishMatrix = {};
		JW.Array.each(this.units, function(unit) {
			if (!unit.type.damage || !unit.getAttackCount()) {
				return;
			}
			this.data.findTarget(unit.ij.get(), unit.player, function(cell, ij) {
				if (!this.allEnemies[ij]) {
					return false;
				}
				var punishers = punishMatrix[ij] || [];
				punishers.push(unit);
				punishMatrix[ij] = punishers;
				return false;
			}, this, false, unit.movement.get());
		}, this);

		var vulnerableTarget,
			vulnerableVulnerability = 0;
		JW.Map.each(punishMatrix, function(punishers, key) {
			var ij = FL.Vector.parse(key);
			var cell = this.data.map.getCell(ij);
			var vulnerability = 0;
			if (cell.base) {
				vulnerability += 10 - FL.baseArmor * cell.base.health.get();
			}
			if (cell.unit) {
				if (cell.unit.type.id === "mcv") {
					vulnerability += 10;
				}
				JW.Array.each(cell.unit.persons.get(), function(person) {
					var defense = 1;
					if (cell.hill) {
						++defense;
					}
					if (person.fortified) {
						++defense;
					}
					vulnerability -= person.health * (person.type.armor + defense * person.type.defense);
					if (person.defend) {
						vulnerability -= 2 * person.type.damage;
					}
				}, this);
			}
			JW.Array.each(punishers, function(punisher) {
				var punisherScore = 0;
				var damage = punisher.type.damage * punisher.getAttackCount();
				if (punisher.type.blitz && (FL.Vector.length8(FL.Vector.diff(punisher.ij.get(), ij)) === 1)) {
					damage *= 1.5; // tanks can die in the first battle, so 2 is too much =(
				}
				punisherScore += damage;
				JW.Array.each(punisher.persons.get(), function(person) {
					punisherScore += .5 * person.health * person.type.armor;
				}, this);
				if (punisher.type.defense && punisher.cell.resource && !punisher.cell.nearBases.isEmpty()) {
					vulnerability += .5 * punisherScore;
				} else {
					vulnerability += punisherScore;
				}
			}, this);
			if (vulnerableVulnerability <= vulnerability) {
				vulnerableTarget = ij;
				vulnerableVulnerability = vulnerability;
			}
		}, this);

		if (!vulnerableTarget) {
			return false;
		}
		var punishers = punishMatrix[vulnerableTarget];
		var toughestPunisher,
			toughestToughness = 0;
		JW.Array.each(punishers, function(punisher) {
			var toughness = punisher.type.damage * punisher.getAttackCount();
			JW.Array.each(punisher.persons.get(), function(person) {
				toughness += person.health;
			}, this);
			if (toughestToughness < toughness) {
				toughestPunisher = punisher;
				toughestToughness = toughness;
			}
		}, this);

		if (!toughestPunisher) { // impossible but what the heck
			console.warn("Impossible scenario: couldn't select a punisher");
			return false;
		}
		this.moveUnit(toughestPunisher, vulnerableTarget);
		return true;
	},

	findBaseSpot: function(ijUnit) {
		var ijBest = null;
		var profitBest = Number.NEGATIVE_INFINITY;
		this.data.map.every(function(cell, ij) {
			if (cell.rock || cell.miningBase) {
				return;
			}
			if (cell.unit && !FL.Vector.equal(ijUnit, ij)) {
				return;
			}
			var profit = this.getBaseProfit(ij) +
				this.baseDistanceProfit * FL.Vector.length(FL.Vector.diff(ijUnit, ij));
			if (profit <= profitBest) {
				return;
			}
			if (!this.data.isBaseBuildable(ij)) {
				return;
			}
			ijBest = ij;
			profitBest = profit;
		}, this);
		return ijBest;
	},

	getBaseProfit: function(ijBase) {
		var profit = 0;
		var hasProduction = false;
		this.data.map.eachWithin(ijBase, FL.baseMiningRangeSqr, function(cell, ij) {
			if (cell.rock || cell.miningBase) {
				return;
			}
			if (cell.unit && cell.unit.type.damage && (cell.unit.player !== this.player)) {
				profit -= 10000;
			}
			profit += cell.mining;
			if (cell.resource) {
				if (cell.resource.aiProfit) {
					profit += cell.resource.aiProfit;
				}
				if (cell.resource.aiProduction) {
					if (hasProduction) {
						profit += this.baseExtraProductionProfit;
					} else {
						hasProduction = true;
						profit += this.baseFirstProductionProfit;
					}
				}
			}
		}, this);
		return profit;
	},

	defend: function() {
		var beatenPairIndex = JW.Array.find(this.threateningPairs, function(pair) {
			var attackUnit = pair[0];
			var nearestBase = pair[1];
			var nearestUnit, nearestUnitDistanceSqr = Number.POSITIVE_INFINITY;
			JW.Array.each(this.behaviourUnits["patrol"], function(patrolUnit) {
				var distanceSqr = FL.Vector.lengthSqr(FL.Vector.diff(patrolUnit.ij.get(), nearestBase.ij));
				if (distanceSqr < nearestUnitDistanceSqr) {
					nearestUnit = patrolUnit;
					nearestUnitDistanceSqr = distanceSqr;
				}
			}, this);
			if (!nearestUnit) {
				return false;
			}
			this.makeUseless(nearestUnit);
			if (!nearestUnit.type.defense) {
				this.moveUnit(nearestUnit, attackUnit.ij.get());
				return true;
			}
			var nearestTarget,
				nearestAttackDistanceSqr = Number.POSITIVE_INFINITY,
				nearestDefendDistance = Number.POSITIVE_INFINITY;
			this.data.map.everyWithin8(nearestBase.ij, 1, function(cell, ij) {
				if (cell.base || (cell.unit && cell.unit !== nearestUnit)) {
					return;
				}
				var attackDistanceSqr = FL.Vector.lengthSqr(FL.Vector.diff(ij, attackUnit.ij.get()));
				var defendDistance = FL.Vector.length8(FL.Vector.diff(ij, nearestUnit.ij.get()));
				if ((attackDistanceSqr < nearestAttackDistanceSqr) ||
						(attackDistanceSqr === nearestAttackDistanceSqr &&
							defendDistance < nearestDefendDistance)) {
					nearestTarget = ij;
					nearestAttackDistanceSqr = attackDistanceSqr;
					nearestDefendDistance = defendDistance;
				}
			}, this);
			if (!nearestTarget) {
				this.moveUnit(nearestUnit, null);
				return false;
			}
			this.moveUnit(nearestUnit, nearestTarget);
			return true;
		}, this);
		if (beatenPairIndex != null) {
			this.threateningPairs.splice(beatenPairIndex, 1);
			return true;
		}
		return false;
	},

	rush: function() {
		return JW.Array.some(this.behaviourUnits["rush"].concat(), function(unit) {
			if (this.isRushable(unit.cell)) {
				this.moveUnit(unit, null);
				return false;
			}
			var path = this.data.findTarget(unit.ij.get(), unit.player, function(cell) {
				return this.isRushable(cell) && !cell.unit;
			}, this);
			if (!path || (path.length === 0)) {
				this.changeBehaviour(unit, "patrol");
				return false;
			}
			this.moveUnit(unit, JW.Array.getLast(path)[1]);
			return true;
		}, this);
	},

	isRushable: function(cell) {
		return (cell.resource != null) && !cell.nearBases.every(JW.byValue("player", this.player));
	},

	patrol: function() {
		if (this.behaviourUnits["patrol"].length === 0) {
			return false;
		}
		// looking for a base with the least defender count and the farthest nearest patroller
		var vulnerableBase,
			vulnerableBasePatrolCount = Number.POSITIVE_INFINITY,
			vulnerableBaseNearestUnit,
			vulnerableBaseNearestUnitDistanceSqr = 0;
		JW.Array.each(this.bases, function(base) {
			var patrolCount = this.basePatrolCount[base._iid];
			if (patrolCount > vulnerableBasePatrolCount) {
				return;
			}
			if (patrolCount > 10) {
				return;
			}
			var nearestUnit,
				nearestUnitDistanceSqr = Number.POSITIVE_INFINITY;
			JW.Array.each(this.behaviourUnits["patrol"], function(unit) {
				var distanceSqr = FL.Vector.lengthSqr(FL.Vector.diff(unit.ij.get(), base.ij));
				if (distanceSqr < nearestUnitDistanceSqr) {
					nearestUnit = unit;
					nearestUnitDistanceSqr = distanceSqr;
				}
			}, this);
			if ((patrolCount === vulnerableBasePatrolCount) &&
					(nearestUnitDistanceSqr < vulnerableBaseNearestUnitDistanceSqr)) {
				return;
			}
			vulnerableBase = base;
			vulnerableBasePatrolCount = patrolCount;
			vulnerableBaseNearestUnit = nearestUnit;
			vulnerableBaseNearestUnitDistanceSqr = nearestUnitDistanceSqr;
		}, this);
		var nearestTarget,
			nearestTargetDistanceSqr = Number.POSITIVE_INFINITY;
		var placementFactor = FL.random(2);
		this.data.map.everyWithin8(vulnerableBase.ij, 1, function(cell, ij) {
			if (cell.rock || cell.base || cell.unit) {
				return;
			}
			var distanceSqr = FL.Vector.lengthSqr(FL.Vector.diff(ij, vulnerableBaseNearestUnit.ij.get()));
			if (distanceSqr < nearestTargetDistanceSqr) {
				nearestTarget = ij;
				nearestTargetDistanceSqr = distanceSqr + placementFactor;
			}
		}, this);
		if (!nearestTarget) {
			// ignore this base next time
			this.basePatrolCount[vulnerableBase._iid] = Number.POSITIVE_INFINITY;
			return true;
		}
		this.basePatrolCount[vulnerableBase._iid]++;
		this.moveUnit(vulnerableBaseNearestUnit, nearestTarget);
		this.makeUseless(vulnerableBaseNearestUnit);
		return true;
	},

	drop: function() {
		return JW.Array.some(this.behaviourUnits["drop"].concat(), function(unit) {
			if (unit.canDrop()) {
				return this.paradrop(unit);
			}
			var path = this.data.findTarget(unit.ij.get(), unit.player, function(cell) {
				return cell.isAirportBy(this.player);
			});
			if (!path) {
				this.changeBehaviour(unit, "attack", true);
				return false;
			}
			if (path.length === 0) {
				this.moveUnit(unit, null);
				return false;
			}
			this.moveUnit(unit, JW.Array.getLast(path)[1]);
			return true;
		}, this);
	},

	paradrop: function(unit) {
		var dropTarget = null;
		var dropTargetDistanceSqr = Number.POSITIVE_INFINITY;
		this.data.map.every(function(cell) {
			if (!this.data.isDroppable(cell.ij, unit.player)) {
				return;
			}
			this.data.bases.each(function(base) {
				if (base.player === unit.player) {
					return;
				}
				var distanceSqr = FL.Vector.lengthSqr(FL.Vector.diff(base.ij, cell.ij));
				if (distanceSqr < dropTargetDistanceSqr) {
					dropTarget = cell.ij;
					dropTargetDistanceSqr = distanceSqr;
				}
			}, this);
		}, this);
		unit.ijTarget = null;
		if (!dropTarget) {
			this.moveUnit(unit, null);
			return false;
		}
		unit.drop(dropTarget);
		if (unit.movement.get() === 0) {
			this.makeUseless(unit);
		}
		unit.behaviour = (dropTargetDistanceSqr < 9) ? "assaulting" : "attacking";
		return true;
	},

	attack: function() {
		JW.Array.each(this.behaviourUnits["attack"].concat(), function(unit) {
			var behaviour = (this.isEnemyWithin(unit.ij.get(), 3) || FL.random(2)) ? "attacking" : "assaulting";
			this.changeBehaviour(unit, behaviour, true);
		}, this);
		return this.issueAttack(this.behaviourUnits["assaulting"], this.enemyBases) ||
			this.issueAttack(this.behaviourUnits["attacking"], this.allEnemies);
	},

	issueAttack: function(units, enemies) {
		return JW.Array.some(units.concat(), function(unit) {
			var path = this.data.findTarget(unit.ij.get(), this.player, function(cell, ij) {
				return enemies[ij] != null;
			}, this);
			if (path && (path.length !== 0)) {
				this.moveUnit(unit, JW.Array.getLast(path)[1]);
				return true;
			}
			if (unit.behaviour === "assaulting") {
				this.changeBehaviour(unit, "attacking");
			} else {
				this.moveUnit(unit, null);
			}
			return false;
		}, this);
	},

	hold: function() {
		var result = JW.Array.some(this.behaviourUnits["hold"].concat(), function(unit) {
			var target;
			if (!this.holdMap.getCell(unit.ij.get())) {
				target = unit.ij.get();
			} else {
				var targetDistanceSqr = Number.POSITIVE_INFINITY;
				this.holdMap.every(function(held, ij) {
					if (held) {
						return;
					}
					var cell = this.data.map.getCell(ij);
					if (cell.unit) {
						return;
					}
					var distanceSqr = FL.Vector.length(FL.Vector.diff(unit.ij.get(), ij)) +
						.2 * FL.Vector.length(FL.Vector.diff(this.data.map.ijCenter(), ij));
					if (distanceSqr < targetDistanceSqr) {
						target = ij;
						targetDistanceSqr = distanceSqr;
					}
				}, this);
			}
			if (target) {
				this.data.map.eachWithin(target, this.unitHoldRangeSqr, function(cell, ij) {
					if (!FL.Vector.equal(ij, target) && cell.resource && cell.nearBases.length) {
						return;
					}
					this.holdMap.setCell(ij, true);
				}, this);
			}
			return this.moveUnit(unit, target);
		}, this);
		/*
		if (!result) {
			for (var i = 0; i < this.data.map.size; ++i) {
				console.log(JW.Array.map(this.holdMap.cells[i], function(v) { return v ? 1 : 0; }).join(" "));
			}
		}*/
		return result;
	},

	isUnitTypePreferred: function(unitType) {
		return (unitType.id === "mcv") ? !this.isLowTierBase : unitType.aiPreferred;
	},

	isUnitReady: function(unit) {
		if (unit.behaviour === "hold") {
			return true;
		}
		if (unit.getCount() >= Math.min(unit.type.capacity, Math.round(this.stackCost / unit.type.cost))) {
			return true;
		}
		var base = unit.cell.base;
		if (!base) {
			return true;
		}
		if (!base.isUnitTypeAvailable(unit.type)) {
			return true;
		}
		var type = base.unitType.get();
		return type && (type !== unit.type);
	},

	isEnemyWithin: function(ij, distance) {
		return this.data.map.someWithin8(ij, distance, function(cell, ij) {
			return (cell.unit && (cell.unit.player !== this.player)) ||
				(cell.base && (cell.base.player !== this.player));
		}, this);
	},

	moveUnit: function(unit, ij) {
		unit.ijTarget = ij;
		var moved = this.data.moveUnit(unit);
		if (!moved || !unit.alive || !unit.movement.get()) {
			this.makeUseless(unit);
		}
	},

	makeUseful: function(unit, behaviour) {
		if (unit.alive && (unit.movement.get() !== 0)) {
			behaviour = behaviour || unit.behaviour;
			this.behaviourUnits[behaviour].push(unit);
			this.unitBehaviours[unit._iid] = behaviour;
		}
	},

	makeUseless: function(unit) {
		var behaviour = this.unitBehaviours[unit._iid];
		if (behaviour) {
			JW.Array.removeItem(this.behaviourUnits[behaviour], unit);
		}
		JW.Array.removeItem(this.units, unit);
	},

	changeBehaviour: function(unit, behaviour, permanent) {
		this.makeUseless(unit);
		this.makeUseful(unit, behaviour);
		if (permanent) {
			unit.behaviour = behaviour;
		}
	}
});

JW.apply(FL.AI, {
	initialProductionCoef: 1,
	productionCoefPerWin: .1,
	productionCoefPerLoss: .05
});

FL.AI.productionCoef = FL.AI.initialProductionCoef +
	(localStorage["wins"] || 0) * FL.AI.productionCoefPerWin -
	(localStorage["losses"] || 0) * FL.AI.productionCoefPerLoss;
