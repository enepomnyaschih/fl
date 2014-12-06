var FL = {
	mapSize: 32,
	cellSize: 16,
	rockCount: 20,
	rockDensity: 20,
	playerCount: 2,
	minBaseDistanceSqr: 12,
	minMainBaseDistanceSqr: 100,
	minMainBaseSideDistance: 4,
	minMainBaseCenterDistance: 5,
	baseSightRangeSqr: 12,

	dir4: [
		[1, 0],
		[0, 1],
		[-1, 0],
		[0, -1]
	],

	dir8: [
		[1, 0],
		[1, 1],
		[0, 1],
		[-1, 1],
		[-1, 0],
		[-1, -1],
		[0, -1],
		[1, -1]
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
	}
};
