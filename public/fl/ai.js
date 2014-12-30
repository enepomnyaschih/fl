FL.AI = {
	behaviours: [
		"build",
		"patrol",
		"hold",
		"rush",
		"attack",
		"attacking",
		"assaulting",
		"support",
		"bombard",
		"fly"
	],
	attack: 2,
	patrolDistance: 3,
	aquisitionDistanceSqr: 50,
	baseHoldRangeSqr: 10,
	unitHoldRangeSqr: 4,
	patrolPerBase: 1,
	initialProductionCoef: 1,
	productionCoefPerWin: .2,
	productionCoefPerLoss: .05,
	mcvLimit: 2,
	baseFirstProductionProfit: 15,
	baseExtraProductionProfit: -4,
	baseDistanceProfit: -2,

	process: function(data, player) {
		var bases = data.bases.$toArray().filter(JW.byValue("player", player));
		var units = data.units.$toArray().filter(JW.byValue("player", player));
		var unitCount = JW.Map.map(FL.Unit.types, function() { return 0; });
		var totalUnitCount = JW.Map.map(FL.Unit.types, function() { return 0; });
		var behaviourUnits = JW.Array.$index(FL.AI.behaviours, JW.byField()).map(function() { return []; });
		var totalBehaviourCount = JW.Map.map(behaviourUnits, function() { return 0; });
		JW.Array.each(units, function(unit) {
			++unitCount[unit.type.id];
			++totalUnitCount[unit.type.id];
			behaviourUnits[unit.behaviour].push(unit);
			++totalBehaviourCount[unit.behaviour];
		});
		JW.Array.each(bases, function(base) {
			var type = base.unitType.get();
			if (type) {
				++totalUnitCount[type.id];
			}
			if (base.unitBehaviour) {
				++totalBehaviourCount[base.unitBehaviour];
			}
		});

		// produce units
		var availableBehaviours = FL.AI.behaviours.concat();
		JW.Array.each(bases, function(base) {
			if (base.unitType.get()) {
				return;
			}
			var unitType;
			if (totalBehaviourCount["build"] === 0) {
				unitType = FL.Unit.types["mcv"];
			} else {
				if (totalBehaviourCount["build"] >= FL.AI.mcvLimit) {
					JW.Array.removeItem(availableBehaviours, "build");
				}
				if (totalBehaviourCount["patrol"] >= FL.AI.patrolPerBase * bases.length) {
					JW.Array.removeItem(availableBehaviours, "patrol");
				}
				var availableUnitTypes = base.getAvailableUnitTypes();
				availableUnitTypes = JW.Array.filter(availableUnitTypes, function(unitType) {
					return JW.Array.some(unitType.ai, function(behaviour) {
						return JW.Array.containsItem(availableBehaviours, behaviour);
					});
				});
				var preferredUnitTypes = JW.Array.filter(availableUnitTypes, JW.byField("aiPreferred"));
				if (preferredUnitTypes.length) {
					availableUnitTypes = preferredUnitTypes;
				}
				unitType = availableUnitTypes[FL.random(availableUnitTypes.length)];
			}
			base.unitType.set(unitType);
			++totalUnitCount[unitType.id];
			var unitAvailableBehaviours = JW.Array.filter(unitType.ai, function(behaviour) {
				return JW.Array.containsItem(availableBehaviours, behaviour);
			});
			var behaviour = unitAvailableBehaviours.length ?
				unitAvailableBehaviours[FL.random(unitAvailableBehaviours.length)] :
				unitType.ai[FL.random(unitType.ai.length)];
			base.unitBehaviour = behaviour;
			++totalBehaviourCount[behaviour];
		});

		// build bases
		JW.Array.each(behaviourUnits["build"], function(unit) {
			var ijTarget = unit.ijTarget || FL.AI.findBaseSpot(data, unit.ij.get(), player);
			if (FL.Vector.equal(ijTarget, unit.ij.get())) {
				data.buildBase(unit);
			} else {
				unit.ijTarget = ijTarget;
			}
		});

		// defend
		var orderedUnits = new JW.Set();
		data.units.each(function(attackUnit) {
			if (attackUnit.player === player) {
				return;
			}
			var nearestBase, nearestBaseDistanceSqr = Number.POSITIVE_INFINITY;
			JW.Array.each(bases, function(base) {
				var distanceSqr = FL.Vector.lengthSqr(FL.Vector.diff(attackUnit.ij.get(), base.ij));
				if (distanceSqr < nearestBaseDistanceSqr) {
					nearestBase = base;
					nearestBaseDistanceSqr = distanceSqr;
				}
			});
			if (nearestBaseDistanceSqr > FL.AI.aquisitionDistanceSqr) {
				return;
			}
			var nearestUnit, nearestUnitDistanceSqr = Number.POSITIVE_INFINITY;
			JW.Array.each(behaviourUnits["patrol"], function(patrolUnit) {
				if (orderedUnits.contains(patrolUnit)) {
					return;
				}
				var distanceSqr = FL.Vector.lengthSqr(FL.Vector.diff(patrolUnit.ij.get(), nearestBase.ij));
				if (distanceSqr < nearestUnitDistanceSqr) {
					nearestUnit = patrolUnit;
					nearestUnitDistanceSqr = distanceSqr;
				}
			});
			if (!nearestUnit) {
				return;
			}
			orderedUnits.add(nearestUnit);
			var ijTarget = FL.Vector.round(
				FL.Vector.between(attackUnit.ij.get(), nearestBase.ij, .45));
			if (!nearestUnit.ijTarget || !FL.Vector.equal(ijTarget, nearestUnit.ijTarget)) {
				nearestUnit.ijTarget = ijTarget;
			} else if (attackUnit.type.attack * nearestUnit.type.attack >
						attackUnit.type.defense * nearestUnit.type.defense) {
				nearestUnit.ijTarget = attackUnit.ij.get();
			}
		});

		// patrol
		if (behaviourUnits["attack"].length < FL.AI.attack) {
			behaviourUnits["patrol"] = behaviourUnits["patrol"].concat(behaviourUnits["attack"]);
		} else {
			FL.AI.attack++;
			var newBehaviour = FL.random(2) ? "assaulting" : "attacking";
			behaviourUnits[newBehaviour] = behaviourUnits[newBehaviour].concat(behaviourUnits["attack"]);
			JW.Array.each(behaviourUnits["attack"], function(unit) {
				unit.behaviour = newBehaviour;
			});
		}
		JW.Array.each(behaviourUnits["patrol"], function(unit) {
			if (orderedUnits.contains(unit)) {
				return;
			}
			if (unit.ijTarget) {
				return;
			}
			var base = bases[FL.random(bases.length)];
			if (!base) {
				return;
			}
			var rect = data.map.getRect(base.ij, FL.AI.patrolDistance);
			unit.ijTarget = [
				rect.iMin + FL.random(rect.iMax - rect.iMin + 1),
				rect.jMin + FL.random(rect.jMax - rect.jMin + 1)
			];
		});

		// attack
		FL.AI.issueAttack(data, player, behaviourUnits["attacking"], true, true);
		FL.AI.issueAttack(data, player, behaviourUnits["assaulting"], false, true);

		// hold
		var holdMap = new FL.Matrix(data.map.size);
		JW.Array.each(bases, function(base) {
			data.map.eachWithin(base.ij, FL.AI.baseHoldRangeSqr, function(cell, ij) {
				holdMap.setCell(ij, true);
			});
		});
		JW.Array.each(behaviourUnits["hold"], function(unit) {
			unit.hold = false;
		});
		for (var i = 0; i < data.map.size; ++i) {
			for (var j = 0; j < data.map.size; ++j) {
				var ij = [i, j];
				if (!data.isPassable(ij) || data.isChoke(ij)) {
					holdMap.setCell(ij, true);
				}
			}
		}
		JW.Array.each(behaviourUnits["hold"], function(unit) {
			if (!holdMap.getCell(unit.ij.get())) {
				unit.hold = true;
				data.map.eachWithin(unit.ij.get(), FL.AI.unitHoldRangeSqr, function(cell, ij) {
					holdMap.setCell(ij, true);
				});
			}
			if (unit.hold) {
				return;
			}
			var nearestTarget, nearestTargetDistanceSqr = Number.POSITIVE_INFINITY;
			for (var i = 0; i < data.map.size; ++i) {
				for (var j = 0; j < data.map.size; ++j) {
					var ij = [i, j];
					if (holdMap.getCell(ij)) {
						continue;
					}
					var distanceSqr = FL.Vector.lengthSqr(FL.Vector.diff(unit.ij.get(), ij)) +
						.2 * FL.Vector.lengthSqr(FL.Vector.diff(data.map.ijCenter(), ij));
					if (distanceSqr < nearestTargetDistanceSqr) {
						nearestTarget = ij;
						nearestTargetDistanceSqr = distanceSqr;
					}
				}
			}
			if (nearestTarget) {
				unit.ijTarget = nearestTarget;
			} else {
				unit.ijTarget = FL.Vector.add(unit.ij.get(), FL.dir8[FL.random(8)]);
				if (!data.map.inMatrix(unit.ijTarget)) {
					unit.ijTarget = null;
				}
			}
		});
	},

	findBaseSpot: function(data, ijUnit, player) {
		var ijBest = null;
		var profitBest = Number.NEGATIVE_INFINITY;
		for (var i = 0; i < data.map.size; ++i) {
			for (var j = 0; j < data.map.size; ++j) {
				var ij = [i, j];
				var cell = data.map.getCell(ij);
				if (cell.rock || cell.miningBase) {
					continue;
				}
				if (cell.unit && !FL.Vector.equal(ijUnit, ij)) {
					continue;
				}
				var profit = FL.AI.getBaseProfit(data, ij, player) +
					FL.AI.baseDistanceProfit * FL.Vector.length(FL.Vector.diff(ijUnit, ij));
				if (profit <= profitBest) {
					continue;
				}
				if (!data.isBaseBuildable(ij)) {
					continue;
				}
				ijBest = ij;
				profitBest = profit;
			}
		}
		return ijBest;
	},

	getBaseProfit: function(data, ijBase, player) {
		var profit = 0;
		var hasProduction = false;
		data.map.eachWithin(ijBase, FL.baseMiningRangeSqr, function(cell, ij) {
			if (cell.rock || cell.miningBase) {
				return;
			}
			if (cell.unit && (cell.unit.player !== player)) {
				profit -= 2 * (cell.unit.type.attack || 0);
			}
			profit += cell.hill ? 2 : 1;
			if (cell.resource) {
				if (cell.resource.aiProfit) {
					profit += cell.resource.aiProfit;
				}
				if (cell.resource.aiProduction) {
					if (hasProduction) {
						profit += FL.AI.baseExtraProductionProfit;
					} else {
						hasProduction = true;
						profit += FL.AI.baseFirstProductionProfit;
					}
				}
			}
		});
		return profit;
	},

	issueAttack: function(data, player, units, includeUnits, includeBases) {
		var ijTargets = [];
		if (includeBases) {
			data.bases.each(function(base) {
				if (base.player !== player) {
					ijTargets.push(base.ij);
				}
			});
		}
		if (includeUnits) {
			data.units.each(function(unit) {
				if (unit.player !== player) {
					ijTargets.push(unit.ij.get());
				}
			});
		}
		JW.Array.each(units, function(unit) {
			var nearestTarget, nearestTargetDistanceSqr = Number.POSITIVE_INFINITY;
			JW.Array.each(ijTargets, function(ij) {
				var distanceSqr = FL.Vector.lengthSqr(FL.Vector.diff(unit.ij.get(), ij));
				if (distanceSqr < nearestTargetDistanceSqr) {
					nearestTarget = ij;
					nearestTargetDistanceSqr = distanceSqr;
				}
			});
			if (!nearestTarget) {
				return; // just in case
			}
			if (data.getPath(unit.ij.get(), nearestTarget, player)) {
				unit.ijTarget = nearestTarget;
			} else {
				unit.behaviour = "attacking";
				unit.ijTarget = FL.Vector.add(unit.ij.get(), FL.dir8[FL.random(8)]);
				if (!data.map.inMatrix(unit.ijTarget)) {
					unit.ijTarget = null;
				}
			}
		});
	}
};

FL.AI.productionCoef = FL.AI.initialProductionCoef +
	(localStorage["wins"] || 0) * FL.AI.productionCoefPerWin -
	(localStorage["losses"] || 0) * FL.AI.productionCoefPerLoss;
