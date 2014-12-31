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
	this.attacked = 0;
	this.defended = 0;
	this.fortified = 0;
	this.behaviour = behaviour || type.ai[FL.random(type.ai.length)];
	this.visible = false;
	this.health = this.own(new JW.Property([1]));
	this.alive = true;

	this.xy = this.own(new JW.Property(FL.ijToXy(this.ij.get())));
	this.opacity = this.own(new JW.Property(0));
	this.animations = []; // <FL.Unit.Animation>

	this.own(new JW.Switcher([this.ij], {
		init: function(ij) {
			this.cell = this.data.map.getCell(ij);
			this.cell.setUnit(this);
			if (this.player === 0) {
				this.data.reveal(ij, this.getSightRangeSqr());
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
	destroy: function() {
		this.alive = false;
		this._super();
	},

	resetAnimation: function() {
		this.animations = [];
		this.xy.set(FL.ijToXy(this.ij.get()));
		this.opacity.set(this.visible ? 1 : 0);
	},

	getCount: function() {
		return this.health.get().length;
	},

	getDefenseDegree: function() {
		return 1 + (this.fortified ? 1 : 0) + (this.cell.hill ? 1 : 0); // plus river
	},

	getSightRangeSqr: function() {
		return this.cell.hill ? this.type.sightRangeSqrHill : this.type.sightRangeSqr;
	},

	merge: function(units) {
		this.setHealth(units.concat(this.health.get()));
	},

	split: function(selection) {
		var splittedUnits = [];
		var remainingUnits = [];
		JW.Array.filter(this.health.get(), function(health, index) {
			if (!selection || selection[index]) {
				splittedUnits.push(health);
			} else {
				remainingUnits.push(health);
			}
		}, this);
		this.setHealth(remainingUnits);
		return splittedUnits;
	},

	setHealth: function(health) {
		if (health.length === 0) {
			this.data.destroyUnit(this);
		} else {
			this.health.set(health.concat().sort().reverse());
		}
	},

	isHealed: function() {
		return JW.Array.every(this.health.get(), JW.byValue("", 1));
	},

	heal: function() {
		if (this.isHealed()) {
			return;
		}
		this.health.set(JW.Array.map(this.health.get(), function(value) {
			var eps = 0.001;
			value += FL.unitHealRate;
			return (1 - value < eps) ? 1 : value;
		}, this));
		if (this.isHealed()) {
			this.hold = false;
		}
	}
});

FL.Unit.typeArray = [
	{
		id: "mcv",
		name: "Mobile Construction Vehicle",
		damage: 0,
		armor: 1,
		defense: 0,
		movement: 1,
		sightRangeSqr: 2,
		sightRangeSqrHill: 8,
		cost: 300,
		ai: ["build"],
		capacity: 10,
		aiPreferred: true
	},
	{
		id: "militia",
		name: "Militia \"Meat shield\"",
		damage: 1,
		armor: 3,
		defense: 1,
		movement: 1,
		sightRangeSqr: 2,
		sightRangeSqrHill: 8,
		cost: 30,
		ai: ["patrol", "hold"],
		capacity: 10,
		aiPreferred: false
	},
	{
		id: "infantry",
		name: "Infantry \"Cannon fodder\"",
		damage: 2,
		armor: 3,
		defense: 0,
		movement: 1,
		sightRangeSqr: 2,
		sightRangeSqrHill: 8,
		cost: 40,
		ai: ["patrol", "attack"],
		capacity: 10,
		aiPreferred: false
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
		damage: 2,
		armor: 4,
		defense: 2,
		movement: 1,
		sightRangeSqr: 8,
		sightRangeSqrHill: 10,
		cost: 50,
		resources: ["yard"],
		ai: ["patrol", "hold"],
		capacity: 5,
		aiPreferred: true
	},
	{
		id: "paratrooper",
		name: "Paratrooper \"Zealot bomb\"",
		damage: 3,
		armor: 5,
		defense: 0,
		movement: 1,
		sightRangeSqr: 8,
		sightRangeSqrHill: 10,
		cost: 70,
		resources: ["yard"],
		paradropRangeSqr: 27,
		ai: ["attack"],
		capacity: 5,
		aiPreferred: true
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
		damage: 2,
		armor: 4,
		defense: 0,
		movement: 3,
		sightRangeSqr: 8,
		sightRangeSqrHill: 10,
		cost: 50,
		resources: ["light"],
		ai: ["patrol", "attack"],
		capacity: 5,
		aiPreferred: true
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
		damage: 2,
		armor: 5,
		defense: 3,
		movement: 2,
		sightRangeSqr: 18,
		sightRangeSqrHill: 27,
		bombRangeSqr: 12,
		bombAttack: 2,
		cost: 70,
		resources: ["light"],
		ai: ["patrol"],
		capacity: 5,
		aiPreferred: true
	},
	{
		id: "tank",
		name: "Tank \"Shushpanzer\"",
		damage: 4,
		armor: 10,
		defense: 0,
		movement: 2,
		sightRangeSqr: 8,
		sightRangeSqrHill: 10,
		cost: 120,
		resources: ["heavy"],
		ai: ["attack"],
		blitz: true,
		capacity: 3,
		aiPreferred: true
	},
	{
		id: "mobile",
		name: "\"Wunderwaffe\" mobile site",
		damage: 3,
		armor: 8,
		defense: 4,
		movement: 2,
		sightRangeSqr: 8,
		sightRangeSqrHill: 10,
		cost: 110,
		resources: ["heavy"],
		ai: ["patrol", "attack"],
		cover: true,
		capacity: 3,
		aiPreferred: true
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
