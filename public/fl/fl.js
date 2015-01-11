var FL = {
	mapSize: 32,
	cellSize: 16,
	rockCount: 15,
	rockDensity: 30,
	rockHillChance: .4,
	plainHillChance: .04,
	playerCount: 2,
	minBaseDistanceSqr: 8,
	minMainBaseDistanceSqr: 200,
	minMainBaseSideDistance: 6,
	maxMainBaseSideDistance: 8,
	baseHealRate: .1,
	baseSightRangeSqr: 12,
	baseArmor: 10,
	baseMiningRangeSqr: 5,
	animationStepsPerSecond: 20,
	resourceEqualizeRange: 7,
	resourceEqualizeSideBuff: 10,

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

	fight: function(damage, defense, survivors) {
		var eps = 0.001;
		var target = FL.random(survivors.length);
		var survivor = survivors[target];
		if (defense && survivor.fortified) {
			++defense;
		}
		damage /= survivor.type.armor + defense * survivor.type.defense;
		if (survivor.health <= damage + eps) {
			survivors.splice(target, 1);
		} else {
			survivor.health -= damage;
		}
	},

	heal: function(value, rate) {
		var eps = 0.001;
		value += rate;
		return (1 - value < eps) ? 1 : value;
	},

	ijToXy: function(ij) {
		return [FL.cellSize * ij[1], FL.cellSize * ij[0]];
	},

	getHealthColor: function(value) {
		return JW.Color.str(JW.Color.multiGradient([[0, "#600"], [.2, "#B00"], [.6, "#FF0"], [1, "#0B0"]], value));
	}
};
