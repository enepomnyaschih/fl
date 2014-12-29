FL.Unit = function(data, ij, player, type, behaviour) {
	FL.Unit._super.call(this);
	this.data = data; // FL.Data
	this.ij = this.own(new JW.Property(ij)); // <Vector>, mutable
	this.player = player; // Integer
	this.type = type; // Object
	this.movement = this.own(new JW.Property(this.type.movement)); // <Integer>
	this.cell = null; // FL.Cell
	this.ijTarget = null; // Vector
	this.hold = false;
	this.attacked = false;
	this.behaviour = behaviour || type.ai[FL.random(type.ai.length)];
	this.visible = false;

	this.xy = this.own(new JW.Property(FL.ijToXy(this.ij.get())));
	this.opacity = this.own(new JW.Property(0));
	this.animations = []; // <FL.Unit.Animation>

	this.own(new JW.Switcher([this.ij], {
		init: function(ij) {
			this.cell = this.data.map.getCell(ij);
			this.cell.setUnit(this);
			if (this.player === 0) {
				this.data.reveal(ij, this.type.sightRangeSqr);
			}
			var animate = this.visible || this.cell.visible;
			this.visible = this.cell.visible;
			if (!animate && !this.animations.length) {
				this.resetAnimation();
			} else {
				var animation = animate ?
					new FL.Unit.MovementAnimation(this) :
					new FL.Unit.JumpAnimation(this);
				this.animations.push(animation);
				this.data.animationManager.enqueue(this);
			}
		},
		done: function(ij) {
			this.cell.setUnit(null);
		},
		scope: this
	}));
};

JW.extend(FL.Unit, JW.Class, {
	resetAnimation: function() {
		this.animations = [];
		this.xy.set(FL.ijToXy(this.ij.get()));
		this.opacity.set(this.visible ? 1 : 0);
	}
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
		cost: 70,
		ai: ["patrol", "hold"]
	},
	{
		id: "infantry",
		name: "Infantry \"Cannon fodder\"",
		attack: 3,
		defense: 2,
		movement: 1,
		sightRangeSqr: 2,
		cost: 100,
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
		paradropRangeSqr: 27,
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
		movement: 3,
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
