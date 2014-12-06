FL.Data = function() {
	FL.Data._super.call(this);
	var self = this;

	this.map = new FL.Matrix(FL.mapSize);
	for (var i = 0; i < FL.mapSize; ++i) {
		for (var j = 0; j < FL.mapSize; ++j) {
			var ij = [i, j];
			var cell = new FL.Cell(ij);
			this.map.setCell(ij, cell);
		}
	}
	for (var i = 0; i < FL.rockCount; ++i) {
		var ij, good;
		do {
			ij = this.map.ijRandom();
			good = this.isPassable(ij) && !this.isChoke(ij);
		} while (!good);

		var currentRockCells = [];
		function addRock(ij) {
			if (!self.isPassable(ij) || self.isChoke(ij)) {
				return;
			}
			gg.push(ij);
			currentRockCells.push(ij);
			self.map.getCell(ij).rock = true;
		}
		addRock(ij);

		var density = FL.random(FL.rockDensity);
		for (var j = 0; j < density; ++j) {
			var d = FL.random(4);
			var dij = FL.Vector.add(currentRockCells[FL.random(currentRockCells.length)], FL.dir4[d]);
			addRock(dij);
		}
	}
};
var gg = [];
JW.extend(FL.Data, JW.Class, {
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
	}
});
