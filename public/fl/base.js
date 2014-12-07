FL.Base = function(ij, player) {
	FL.Base._super.call(this);
	this.ij = ij;
	this.player = player;
	this.unitType = this.own(new JW.Property(null));
	this.production = JW.Map.map(FL.Unit.types, function() { return 0; });
	this.mining = 0;
	this.overflow = 0;
};

JW.extend(FL.Base, JW.Class, {
});
