FL.Vector = {
	add: function(a, b) {
		return [a[0] + b[0], a[1] + b[1]];
	},

	diff: function(a, b) {
		return [a[0] - b[0], a[1] - b[1]];
	},

	mult: function(a, c) {
		return [Math.round(c * a[0]), Math.round(c * a[1])];
	},

	equal: function(a, b) {
		return (a[0] === b[0]) && (a[1] === b[1]);
	},

	length: function(a) {
		return Math.sqrt(FL.Vector.lengthSqr(a));
	},

	lengthSqr: function(a) {
		return a[0] * a[0] + a[1] * a[1];
	},

	length8: function(a) {
		return Math.max(Math.abs(a[0]), Math.abs(a[1]));
	}
};
