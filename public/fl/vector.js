FL.Vector = {
	add: function(a, b) {
		return [a[0] + b[0], a[1] + b[1]];
	},

	mult: function(a, c) {
		return [c * a[0], c * a[1]];
	},

	equal: function(a, b) {
		return (a[0] === b[0]) && (a[1] === b[1]);
	}
};
