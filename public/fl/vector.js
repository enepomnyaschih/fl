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
	},

	between: function(a, b, c) {
		return FL.Vector.add(a, FL.Vector.mult(FL.Vector.diff(b, a), c))
	},

	round: function(a) {
		return [Math.round(a[0]), Math.round(a[1])];
	},

	norm8: function(a) {
		return [JW.sgn(a[0]), JW.sgn(a[1])];
	},

	parse: function(s) {
		s = s.split(",");
		return [+s[0], +s[1]];
	}
};
