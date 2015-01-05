FL.UnitNameList = function(names) {
	FL.UnitNameList._super.call(this);
	this.names = names;
	this.counts = JW.Array.$index(names, JW.byField()).map(function() { return 0; });
};

JW.extend(FL.UnitNameList, JW.Class, {
	checkout: function(name) {
		var name = name || this.names[FL.random(this.names.length)];
		return [name, ++this.counts[name]];
	}
});
