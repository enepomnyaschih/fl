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
		cost: 200
	},
	{
		id: "militia",
		name: "Militia \"Meat shield\"",
		attack: 1,
		defense: 2,
		movement: 1,
		sightRangeSqr: 8,
		cost: 40
	},
	{
		id: "infantry",
		name: "Infantry \"Cannon fodder\"",
		attack: 3,
		defense: 2,
		movement: 1,
		sightRangeSqr: 8,
		cost: 60
	},
	/*{
		id: "ack",
		name: "Antiaircraft gun \"Muff\"",
		attack: 1,
		defense: 2,
		movement: 1,
		sightRangeSqr: 8,
		samRangeSqr: 2,
		samAttack: 1,
		cost: 80
	},*/
	{
		id: "marine",
		name: "Marine \"Hotheads\"",
		attack: 3,
		defense: 6,
		movement: 1,
		sightRangeSqr: 8,
		cost: 80,
		resources: ["yard"]
	},
	/*{
		id: "paratrooper",
		name: "Paratrooper \"Zealot bomb\"",
		attack: 6,
		defense: 3,
		movement: 1,
		sightRangeSqr: 8,
		cost: 100,
		resources: ["yard"],
		landing: true
	},
	{
		id: "artillery",
		name: "Artillery \"Eat it\"",
		attack: 3,
		defense: 2,
		movement: 1,
		sightRangeSqr: 12,
		bombRangeSqr: 5,
		bombAttack: 1,
		cost: 100,
		resources: ["yard"]
	},*/
	{
		id: "humvee",
		name: "Hum-Vee \"Us will not catch up\"",
		attack: 3,
		defense: 3,
		movement: 4,
		sightRangeSqr: 8,
		cost: 100,
		resources: ["light"]
	},
	/*{
		id: "sam",
		name: "Mobile SAM site \"Ah snap\"",
		attack: 2,
		defense: 4,
		movement: 2,
		sightRangeSqr: 8,
		samRangeSqr: 8,
		samAttack: 2,
		cost: 160,
		resources: ["light"]
	},
	{
		id: "radar",
		name: "Radar artillery \"I see you\"",
		attack: 6,
		defense: 3,
		movement: 2,
		sightRangeSqr: 20,
		bombRangeSqr: 12,
		bombAttack: 2,
		cost: 160,
		resources: ["light"]
	},*/
	{
		id: "tank",
		name: "Tank \"Shushpanzer\"",
		attack: 14,
		defense: 8,
		movement: 2,
		sightRangeSqr: 8,
		cost: 240,
		resources: ["heavy"]
	},
	{
		id: "mobile",
		name: "\"Wunderwaffe\" mobile site",
		attack: 8,
		defense: 16,
		movement: 2,
		sightRangeSqr: 8,
		cost: 240,
		resources: ["heavy"]
	}/*,
	{
		id: "helicopter",
		name: "Helicopter",
		attack: 3,
		defense: 1,
		flight: 6,
		sightRangeSqr: 12,
		cost: 160,
		resources: ["airport"]
	}*/
];

FL.Unit.types = JW.Array.index(FL.Unit.typeArray, JW.byField("id"));
