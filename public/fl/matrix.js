FL.Matrix = function(size) {
	FL.Matrix._super.call(this);
	this.size = size;
	this.cells = new Array(size);
	for (var i = 0; i < size; ++i) {
		this.cells[i] = new Array(size);
	}
};

JW.extend(FL.Matrix, JW.Class, {
	getCell: function(ij) {
		return JW.get(this.cells, ij);
	},

	setCell: function(ij, value) {
		this.cells[ij[0]][ij[1]] = value;
	},

	inMatrix: function(ij) {
		return (ij[0] >= 0) && (ij[0] < this.size) && (ij[1] >= 0) && (ij[1] < this.size);
	},

	ijRandom: function() {
		return [FL.random(this.size), FL.random(this.size)];
	},

	ijCenter: function() {
		return FL.Vector.mult([this.size, this.size], .5);
	},

	getRect: function(cij, distance) {
		return {
			iMin: Math.max(0, cij[0] - distance),
			iMax: Math.min(this.size - 1, cij[0] + distance),
			jMin: Math.max(0, cij[1] - distance),
			jMax: Math.min(this.size - 1, cij[1] + distance)
		};
	},

	eachWithin: function(cij, distanceSqr, callback, scope) {
		var distance = Math.ceil(Math.sqrt(distanceSqr));
		var rect = this.getRect(cij, distance);
		for (var i = rect.iMin; i <= rect.iMax; ++i) {
			for (var j = rect.jMin; j <= rect.jMax; ++j) {
				var ij = [i, j];
				if (FL.Vector.lengthSqr(FL.Vector.diff(ij, cij)) <= distanceSqr) {
					callback.call(scope || this, this.getCell(ij), ij);
				}
			}
		}
	}
});
