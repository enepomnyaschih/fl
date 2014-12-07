FL.AI = {
	behaviours: [
		"build",
		"patrol",
		"hold",
		"rush",
		"attack",
		"support",
		"bombard",
		"fly"
	],
	attack: 2,
	patrolDistance: 3,
	aquisitionDistanceSqr: 50,

	process: function(data, player) {
		var bases = data.bases.$toArray().filter(JW.byValue("player", player));
		var units = data.units.$toArray().filter(JW.byValue("player", player));
		var unitCount = JW.Map.map(FL.Unit.types, function() { return 0; });
		var totalUnitCount = JW.Map.map(FL.Unit.types, function() { return 0; });
		var behaviourUnits = JW.Array.$index(FL.AI.behaviours, JW.byField()).map(function() { return []; });
		JW.Array.each(units, function(unit) {
			++unitCount[unit.type.id];
			++totalUnitCount[unit.type.id];
			behaviourUnits[unit.behaviour].push(unit);
		});
		JW.Array.each(bases, function(base) {
			var type = base.unitType.get();
			if (type) {
				++totalUnitCount[type.id];
			}
		});
		JW.Array.each(bases, function(base) {
			if (base.unitType.get()) {
				return;
			}
			var availableUnitTypes = base.getAvailableUnitTypes();
			if (totalUnitCount["mcv"] !== 0) {
				JW.Array.removeItem(availableUnitTypes, FL.Unit.types["mcv"]);
			}
			var unitType = FL.Unit.types['mcv'];//availableUnitTypes[FL.random(availableUnitTypes.length)];
			base.unitType.set(unitType);
			++totalUnitCount[unitType.id];
		});
		JW.Array.each(behaviourUnits["build"], function(unit) {
			var ijTarget = unit.ijTarget || FL.AI.findBaseSpot(data, unit.ij, player);
			if (FL.Vector.equal(ijTarget, unit.ij)) {
				data.buildBase(unit);
			} else {
				unit.ijTarget = ijTarget;
			}
		});
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
				FL.Vector.between(attackUnit.ij, nearestUnit.ij, .6));
			if (!nearestUnit.ijTarget || !FL.Vector.equal(ijTarget, nearestUnit.ijTarget)) {
				nearestUnit.ijTarget = ijTarget;
			} else if (attackUnit.type.attack * nearestUnit.type.attack >
						attackUnit.type.defense * nearestUnit.type.defense) {
				nearestUnit.ijTarget = attackUnit.ij;
			}
		});
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
	}
};
