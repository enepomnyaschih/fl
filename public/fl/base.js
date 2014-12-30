FL.Base = function(ij, player) {
	FL.Base._super.call(this);
	this.ij = ij;
	this.player = player;
	this.unitType = this.own(new JW.Property(null));
	this.unitBehaviour = null; // for AI
	this.production = JW.Map.map(FL.Unit.types, function() { return 0; });
	this.mining = 0;
	this.overflow = 0;
	this.resources = [];
	this.health = this.own(new JW.Property(.1));
};

JW.extend(FL.Base, JW.Class, {
	isUnitTypeAvailable: function(type) {
		if (!type.resources) {
			return true;
		}
		return JW.Array.every(type.resources, function(resourceId) {
			return JW.Array.containsItem(this.resources, FL.Resource.types[resourceId]);
		}, this);
	},

	getAvailableUnitTypes: function() {
		return JW.Array.filter(FL.Unit.typeArray, this.isUnitTypeAvailable, this);
	},

	heal: function() {
		var eps = 0.001;
		var value = this.health.get() + FL.baseHealRate;
		this.health.set((1 - value < eps) ? 1 : value);
	}
});
