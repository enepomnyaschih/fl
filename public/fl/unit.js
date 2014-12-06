FL.Unit = function(ij, player, type) {
	FL.Unit._super.call(this);
	this.ij = ij;
	this.player = player;
	this.type = type;
	this.movement = this.type.movement;
	this.ijTarget = null;
	this.hold = false;
};

JW.extend(FL.Unit, JW.Class, {
});

FL.Unit.typeArray = [
	{
		id: "mcv",
		name: "Mobile Construction Vehicle",
		attack: 0,
		defense: 1,
		movement: 1,
		sightRangeSqr: 2,
		cost: 10
	},
	{
		id: "militia",
		name: "Militia",
		attack: 1,
		defense: 2,
		movement: 1,
		sightRangeSqr: 8,
		cost: 2
	}
];

FL.Unit.types = JW.Array.index(FL.Unit.typeArray, JW.byField("id"));
