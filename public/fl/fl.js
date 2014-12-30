var FL = {
	mapSize: 32,
	cellSize: 16,
	rockCount: 20,
	rockDensity: 20,
	rockHillChance: .4,
	plainHillChance: .04,
	playerCount: 2,
	minBaseDistanceSqr: 8,
	minMainBaseDistanceSqr: 100,
	minMainBaseSideDistance: 4,
	minMainBaseCenterDistance: 5,
	unitHealRate: .1,
	baseHealRate: .1,
	baseSightRangeSqr: 12,
	baseArmor: 10,
	baseMiningRangeSqr: 5,
	animationStepsPerSecond: 20,

	dir4: [
		[0, 1],
		[-1, 0],
		[0, -1],
		[1, 0]
	],

	dir8: [
		[0, 1],
		[-1, 1],
		[-1, 0],
		[-1, -1],
		[0, -1],
		[1, -1],
		[1, 0],
		[1, 1]
	],

	sound: function(name) {
		var el = new Audio();
		el.src = "audio/" + name + ".ogg";
		el.play();
	},

	random: function(n) {
		return Math.floor(Math.random() * n);
	},

	getIjs4: function(ij) {
		var dij = [];
		for (var d = 0; d < 4; ++d) {
			dij.push(FL.Vector.add(ij, FL.dir4[d]));
		}
		return dij;
	},

	getIjs8: function(ij) {
		var dij = [];
		for (var d = 0; d < 8; ++d) {
			dij.push(FL.Vector.add(ij, FL.dir8[d]));
		}
		return dij;
	},

	fight: function(damage, health) {
		var eps = 0.001;
		var target = FL.random(health.length);
		if (health[target] <= damage + eps) {
			health.splice(target, 1);
		} else {
			health[target] -= damage;
		}
	},

	ijToXy: function(ij) {
		return [FL.cellSize * ij[1], FL.cellSize * ij[0]];
	}
};
