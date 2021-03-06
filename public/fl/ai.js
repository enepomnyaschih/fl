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
	patrolPerBase: 3,
	initialProductionCoef: 1,
	productionCoefPerWin: .2,
	productionCoefPerLoss: .05,

	process: function(data, player) {
		var bases = data.bases.$toArray().filter(JW.byValue("player", player));
		var units = data.units.$toArray().filter(JW.byValue("player", player));
		var unitCount = JW.Map.map(FL.Unit.types, function() { return 0; });
		var totalUnitCount = JW.Map.map(FL.Unit.types, function() { return 0; });
		var behaviourUnits = JW.Array.$index(FL.AI.behaviours, JW.byField()).map(function() { return []; });
		JW.Array.each(units, function(unit) {
			++unitCount[unit.type.id];
			++totalUnitCount[unit.type.id];
			if ((unit.behaviour === "patrol") &&
				(behaviourUnits["patrol"].length >= FL.AI.patrolPerBase * bases.length)) {
				unit.behaviour = "attack";
			}
			behaviourUnits[unit.behaviour].push(unit);
		});
		JW.Array.each(bases, function(base) {
			var type = base.unitType.get();
			if (type) {
				++totalUnitCount[type.id];
			}
		});

		// produce units
		JW.Array.each(bases, function(base) {
			if (base.unitType.get()) {
				return;
			}
			var availableUnitTypes = base.getAvailableUnitTypes();
			if (totalUnitCount["mcv"] !== 0) {
				JW.Array.removeItem(availableUnitTypes, FL.Unit.types["mcv"]);
			}
			//var unitType = FL.Unit.types["militia"];
			var unitType = availableUnitTypes[FL.random(availableUnitTypes.length)];
			base.unitType.set(unitType);
			++totalUnitCount[unitType.id];
		});

		// build bases
		JW.Array.each(behaviourUnits["build"], function(unit) {
			var ijTarget = unit.ijTarget || FL.AI.findBaseSpot(data, unit.ij, player);
			if (FL.Vector.equal(ijTarget, unit.ij)) {
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
				var distanceSqr = FL.Vector.lengthSqr(FL.Vector.diff(attackUnit.ij, base.ij));
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
				var distanceSqr = FL.Vector.lengthSqr(FL.Vector.diff(patrolUnit.ij, nearestBase.ij));
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
				FL.Vector.between(attackUnit.ij, nearestBase.ij, .45));
			if (!nearestUnit.ijTarget || !FL.Vector.equal(ijTarget, nearestUnit.ijTarget)) {
				nearestUnit.ijTarget = ijTarget;
			} else if (attackUnit.type.attack * nearestUnit.type.attack >
						attackUnit.type.defense * nearestUnit.type.defense) {
				nearestUnit.ijTarget = attackUnit.ij;
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
			if (!unit.hold) {
				return;
			}
			data.map.eachWithin(unit.ij, FL.AI.unitHoldRangeSqr, function(cell, ij) {
				holdMap.setCell(ij, true);
			});
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
			if (!holdMap.getCell(unit.ij)) {
				unit.hold = true;
				data.map.eachWithin(unit.ij, FL.AI.unitHoldRangeSqr, function(cell, ij) {
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
					var distanceSqr = FL.Vector.lengthSqr(FL.Vector.diff(unit.ij, ij)) +
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
				unit.ijTarget = FL.Vector.add(unit.ij, FL.dir8[FL.random(8)]);
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
				var profit = FL.AI.getBaseProfit(data, ij, player) -
					3 * FL.Vector.length(FL.Vector.diff(ijUnit, ij));
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
		data.map.eachWithin(ijBase, FL.baseMiningRangeSqr, function(cell, ij) {
			if (cell.rock || cell.miningBase) {
				return;
			}
			if (cell.unit && (cell.unit.player !== player)) {
				profit -= 2 * (cell.unit.type.attack || 0);
			}
			++profit;
			if (cell.resource) {
				profit += cell.resource.aiProfit;
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
					ijTargets.push(unit.ij);
				}
			});
		}
		JW.Array.each(units, function(unit) {
			var nearestTarget, nearestTargetDistanceSqr = Number.POSITIVE_INFINITY;
			JW.Array.each(ijTargets, function(ij) {
				var distanceSqr = FL.Vector.lengthSqr(FL.Vector.diff(unit.ij, ij));
				if (distanceSqr < nearestTargetDistanceSqr) {
					nearestTarget = ij;
					nearestTargetDistanceSqr = distanceSqr;
				}
			});
			if (!nearestTarget) {
				return; // just in case
			}
			if (data.getPath(unit.ij, nearestTarget, player)) {
				unit.ijTarget = nearestTarget;
			} else {
				unit.behaviour = "attacking";
				unit.ijTarget = FL.Vector.add(unit.ij, FL.dir8[FL.random(8)]);
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
