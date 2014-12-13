FL.Unit = function(ij, player, type, behaviour) {
	FL.Unit._super.call(this);
	this.ij = ij;
	this.player = player;
	this.type = type;
	this.movement = this.type.movement;
	this.ijTarget = null;
	this.hold = false;
	this.attacked = false;
	this.behaviour = behaviour || type.ai[FL.random(type.ai.length)];
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
		cost: 300,
		ai: ["build"]
	},
	{
		id: "militia",
		name: "Militia \"Meat shield\"",
		attack: 1,
		defense: 3,
		movement: 1,
		sightRangeSqr: 2,
		cost: 60,
		ai: ["patrol", "hold"]
	},
	{
		id: "infantry",
		name: "Infantry \"Cannon fodder\"",
		attack: 3,
		defense: 2,
		movement: 1,
		sightRangeSqr: 2,
		cost: 90,
		ai: ["patrol", "attack"]
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
		cost: 120,
		ai: ["support"]
	},*/
	{
		id: "marine",
		name: "Marine \"Hotheads\"",
		attack: 3,
		defense: 6,
		movement: 1,
		sightRangeSqr: 8,
		cost: 120,
		resources: ["yard"],
		ai: ["patrol", "hold"]
	},
	{
		id: "paratrooper",
		name: "Paratrooper \"Zealot bomb\"",
		attack: 6,
		defense: 3,
		movement: 1,
		sightRangeSqr: 8,
		cost: 150,
		resources: ["yard"],
		paradropRangeSqr: 20,
		ai: ["attack"]
	},
	/*{
		id: "artillery",
		name: "Artillery \"Eat it\"",
		attack: 3,
		defense: 2,
		movement: 1,
		sightRangeSqr: 12,
		bombRangeSqr: 5,
		bombAttack: 1,
		cost: 150,
		resources: ["yard"],
		ai: ["bombard"]
	},*/
	{
		id: "humvee",
		name: "Hum-Vee \"Us will not catch up\"",
		attack: 5,
		defense: 2,
		movement: 4,
		sightRangeSqr: 8,
		cost: 150,
		resources: ["light"],
		ai: ["patrol", "attack"]
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
		cost: 240,
		resources: ["light"],
		ai: ["support"]
	},*/
	{
		id: "radar",
		name: "Radar vehicle \"I see you\"",
		attack: 3,
		defense: 8,
		movement: 2,
		sightRangeSqr: 18,
		bombRangeSqr: 12,
		bombAttack: 2,
		cost: 200,
		resources: ["light"],
		ai: ["patrol"]
	},
	{
		id: "tank",
		name: "Tank \"Shushpanzer\"",
		attack: 14,
		defense: 8,
		movement: 2,
		sightRangeSqr: 8,
		cost: 360,
		resources: ["heavy"],
		ai: ["attack"]
	},
	{
		id: "mobile",
		name: "\"Wunderwaffe\" mobile site",
		attack: 8,
		defense: 18,
		movement: 2,
		sightRangeSqr: 8,
		cost: 360,
		resources: ["heavy"],
		ai: ["attack"]
	}/*,
	{
		id: "helicopter",
		name: "Helicopter",
		attack: 3,
		defense: 1,
		flight: 6,
		sightRangeSqr: 12,
		cost: 240,
		resources: ["airport"],
		ai: ["fly"]
	}*/
];

FL.Unit.types = JW.Array.index(FL.Unit.typeArray, JW.byField("id"));
