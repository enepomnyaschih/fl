FL.Unit = function(data, ij, player, type, behaviour) {
	FL.Unit._super.call(this);
	this.data = data; // FL.Data
	this.ij = this.own(new JW.Property(ij)); // <Vector>, mutable
	this.player = player; // Integer
	this.type = type; // Object
	this.movement = this.own(new JW.Property(this.type.movement)); // <Integer>
	this.cell = null; // FL.Cell
	this.ijTarget = null; // Vector
	this.name = ["Unnamed", 1];
	this.hold = false;
	this.skipped = false;
	this.behaviour = behaviour || type.ai[FL.random(type.ai.length)];
	this.visible = [false, true];
	this.persons = this.own(new JW.Property([new FL.Unit.Person(type)]));
	this.alive = true;

	this.xy = this.own(new JW.Property(FL.ijToXy(this.ij.get())));
	this.opacity = this.own(new JW.Property(0));
	this.animations = []; // <FL.Unit.Animation>

	this.ijSwitcher = this.own(new JW.Property(new JW.Switcher([this.ij], {
		init: function(ij) {
			this.cell = this.data.map.getCell(ij);
			if (!this.cell.unit) {
				this.cell.setUnit(this);
			}
			this.data.reveal(ij, this.getSightRangeSqr(), this.player);
			var animate = this.visible[0] || this.cell.visible[0];
			this.setVisible(this.cell.visible[0], 0);
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
			if (this.cell.unit === this) {
				this.cell.setUnit(null);
			}
		},
		scope: this
	}))).ownValue();
};

// implements FL.BattleAnimatable
JW.extend(FL.Unit, JW.Class, {
	destroy: function() {
		this.alive = false;
		this.movement.set(0);
		this._super();
	},

	kill: function() {
		if (!this.alive) {
			return;
		}
		this.alive = false;
		this.ijSwitcher.set(null);
	},

	resetAnimation: function() {
		this.animations = [];
		this.xy.set(FL.ijToXy(this.ij.get()));
		this.opacity.set(this.visible[0] ? 1 : 0);
	},

	getCount: function() {
		return this.persons.get().length;
	},

	getAttackCount: function() {
		return JW.Array.count(this.persons.get(), JW.byField("attack"));
	},

	getDefendCount: function() {
		return JW.Array.count(this.persons.get(), JW.byField("defend"));
	},

	getSightRangeSqr: function() {
		return this.cell.hill ? this.type.sightRangeSqrHill : this.type.sightRangeSqr;
	},

	getShotAnimation: function() {
		return this.type.shotAnimation;
	},

	getDeathAnimation: function() {
		return this.type.deathAnimation;
	},

	getCenter: function() {
		return FL.Vector.add(this.xy.get(), [FL.cellSize / 2, FL.cellSize / 2]);
	},

	onBattleFinish: function() {
		if (!this.alive) {
			this.data.destroyUnit(this);
		}
	},

	merge: function(persons) {
		this.setPersons(persons.concat(this.persons.get()));
		this.ijTarget = null;
	},

	split: function(selection) {
		var splittedPersons = [];
		var remainingPersons = [];
		JW.Array.filter(this.persons.get(), function(person, index) {
			if (!selection || selection[index]) {
				splittedPersons.push(person);
			} else {
				remainingPersons.push(person);
			}
		}, this);
		this.setPersons(remainingPersons);

		var unit = this.data.createUnit(this.ij.get(), this.player, this.type, this.behaviour, this.name[0]);
		unit.ijTarget = this.ijTarget;
		this.ijTarget = null;
		unit.setPersons(splittedPersons);
		return unit;
	},

	setPersons: function(persons, animateDeath) {
		if (persons.length === 0) {
			if (animateDeath) {
				this.kill();
			} else {
				this.data.destroyUnit(this);
			}
		} else {
			this.persons.set(JW.Array.toSorted(persons, JW.byField("health"), this, -1));
			this.movement.set(Math.min.apply(Math, JW.Array.map(persons, JW.byField("movement"))));
		}
	},

	retainAttacks: function(value) {
		this.setPersons(JW.Array.map(this.persons.get(), function(person) {
			if (person.attack) {
				if (value) {
					--value;
				} else {
					if (!this.type.blitz) {
						person.attack = false;
					}
					person.fortified = false;
					--person.movement;
				}
			}
			return person;
		}, this));
	},

	retainDefends: function(value) {
		if (this.type.cover) {
			return;
		}
		this.setPersons(JW.Array.map(this.persons.get(), function(person) {
			if (person.defend) {
				person.defend = (--value >= 0);
			}
			return person;
		}, this));
	},

	decreaseMovement: function() {
		this.setPersons(JW.Array.map(this.persons.get(), function(person) {
			person.decreaseMovement();
			return person;
		}, this));
	},

	isHealed: function() {
		return JW.Array.every(this.persons.get(), JW.byValue("health", 1));
	},

	heal: function() {
		var wasHealed = this.isHealed();
		this.setPersons(JW.Array.map(this.persons.get(), JW.byMethod("heal")));
		if (!wasHealed && this.isHealed()) {
			this.hold = false;
		}
	},

	refresh: function() {
		this.setPersons(JW.Array.map(this.persons.get(), JW.byMethod("refresh")));
		this.skipped = false;
	},

	canDrop: function() {
		return this.type.paradroppable && (this.movement.get() !== 0) &&
			this.cell.isAirportBy(this.player);
	},

	drop: function(ij) {
		this.decreaseMovement();
		this.ijTarget = null;
		this.hold = false;
		this.ij.set(ij);
		if (this.visible[0]) {
			FL.sound("paradrop");
		}
		this.data.mapUpdateEvent.trigger();
	},

	setVisible: function(visible, player) {
		if (this.visible[player] === visible) {
			return;
		}
		this.visible[player] = visible;
		if (visible && (player === 0) && (this.player !== 0) &&
				!this.data.enemyScouted && !FL.revealAll) {
			this.data.enemyScouted = true;
			FL.sound("enemy-units-approaching");
		}
	}
});

FL.Unit.shotAnimations = {
	rifle: {
		sound: "rifle",
		countPerDamage: 8,
		originCount: 1,
		spreadCount: 1,
		originDistance: .5,
		spreadDistance: 0,
		particle: {
			color: "#FFF",
			opacity: 1,
			radius: 0.04,
			duration: 200
		}
	},
	lightCannon: {
		sound: "light-cannon",
		countPerDamage: 2,
		originCount: 1,
		spreadCount: 1,
		originDistance: .5,
		spreadDistance: 0,
		particle: {
			colorFrom: "#FF0",
			colorTo: "#000",
			opacityFrom: 1,
			opacityTo: 0,
			radius: 0.2,
			duration: 1000
		}
	},
	heavyCannon: {
		sound: "heavy-cannon",
		countPerDamage: .5,
		originCount: 1,
		spreadCount: 1,
		originDistance: .5,
		spreadDistance: 0,
		particle: {
			colorFrom: "#FF0",
			colorTo: "#000",
			opacityFrom: 1,
			opacityTo: 0,
			radius: 0.3,
			duration: 1200
		}
	}
};

FL.Unit.deathAnimations = {
	mcv: {
		sound: "death-heavy",
		originCount: 1,
		spreadCount: 1,
		originDistance: 0,
		spreadDistance: 0,
		particle: {
			colorFrom: "#FFF",
			colorTo: "#FF0",
			opacityFrom: 1,
			opacityTo: .2,
			radiusFrom: .2,
			radiusTo: 1,
			duration: 1500
		}
	},
	infantry: {
		sound: "death-infantry",
		originCount: 2,
		spreadCount: 4,
		originDistance: .3,
		spreadDistance: .6,
		particle: {
			color: "#D00",
			opacity: .8,
			radius: 0.05,
			duration: 500
		}
	},
	lightVehicle: {
		sound: "death-light",
		originCount: 1,
		spreadCount: 1,
		originDistance: .3,
		spreadDistance: 0,
		particle: {
			colorFrom: "#FFF",
			colorTo: "#FF0",
			opacityFrom: 1,
			opacityTo: .2,
			radiusFrom: .15,
			radiusTo: .5,
			duration: 1000
		}
	},
	heavyVehicle: {
		sound: "death-heavy",
		originCount: 1,
		spreadCount: 1,
		originDistance: .2,
		spreadDistance: 0,
		particle: {
			colorFrom: "#FFF",
			colorTo: "#FF0",
			opacityFrom: 1,
			opacityTo: .2,
			radiusFrom: .2,
			radiusTo: .8,
			duration: 1200
		}
	}
};

FL.Unit.typeArray = [
	{
		id: "mcv",
		name: "Mobile Construction Vehicle",
		description: '<div class="fl-skill">- Can build a new base</div>',
		damage: 0,
		armor: 5,
		defense: 0,
		healRate: .1,
		movement: 1,
		sightRangeSqr: 2,
		sightRangeSqrHill: 5,
		cost: 300,
		ai: ["build"],
		capacity: 1,
		aiPreferred: true,
		naming: "worker",
		shotAnimation: FL.Unit.shotAnimations.rifle,
		deathAnimation: FL.Unit.deathAnimations.mcv,
		movementSound: "move-infantry"
	},
	{
		id: "militia",
		name: "Militia \"Meat shield\"",
		description: '<div class="fl-info">Weak defensive unit. Used for base defense in ' +
			'emergencies. Can be used for scouting in the early stages of ' +
			'the game. In the late game, can be used to slow down the enemy ' +
			'forces.</div>',
		damage: 1,
		armor: 3,
		defense: 1.5,
		healRate: .1,
		movement: 1,
		sightRangeSqr: 2,
		sightRangeSqrHill: 5,
		cost: 50,
		ai: ["hold", "rush"],
		capacity: 5,
		aiPreferred: false,
		naming: "infantry",
		shotAnimation: FL.Unit.shotAnimations.rifle,
		deathAnimation: FL.Unit.deathAnimations.infantry,
		movementSound: "move-infantry"
	},
	{
		id: "infantry",
		name: "Infantry \"Cannon fodder\"",
		description: '<div class="fl-info">Spendable attacking unit. Can be used for early push ' +
			'and weakening the enemy defenses, but requires protection.</div>',
		damage: 2,
		armor: 3,
		defense: 0,
		healRate: .1,
		movement: 1,
		sightRangeSqr: 2,
		sightRangeSqrHill: 5,
		cost: 60,
		ai: ["attack"],
		capacity: 5,
		aiPreferred: false,
		naming: "infantry",
		shotAnimation: FL.Unit.shotAnimations.rifle,
		deathAnimation: FL.Unit.deathAnimations.infantry,
		movementSound: "move-infantry"
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
		description: '<div class="fl-skill">- Has enhanced heal rate</div>' +
			'<div class="fl-info">Strong defensive unit. Increased heal rate and low cost make ' +
			'them essential in the choke points protection.</div>',
		damage: 2,
		armor: 4,
		defense: 2,
		healRate: .2,
		movement: 1,
		sightRangeSqr: 5,
		sightRangeSqrHill: 10,
		cost: 80,
		resources: ["yard"],
		ai: ["hold", "rush"],
		capacity: 5,
		aiPreferred: true,
		naming: "infantry",
		shotAnimation: FL.Unit.shotAnimations.rifle,
		deathAnimation: FL.Unit.deathAnimations.infantry,
		movementSound: "move-infantry"
	},
	{
		id: "paratrooper",
		name: "Paratrooper \"Here's Jonny!\"",
		description: '<div class="fl-skill">- Can be paradropped</div>' +
			'<div class="fl-info">Strong attacking unit. Has very slow movement speed but can be ' +
			'paradropped to any visible point of the map from a secured airport.</div>',
		damage: 3,
		armor: 5,
		defense: 0,
		healRate: .1,
		movement: 1,
		sightRangeSqr: 5,
		sightRangeSqrHill: 10,
		cost: 100,
		resources: ["yard"],
		paradroppable: true,
		ai: ["drop"],
		capacity: 5,
		aiPreferred: true,
		naming: "infantry",
		shotAnimation: FL.Unit.shotAnimations.rifle,
		deathAnimation: FL.Unit.deathAnimations.infantry,
		movementSound: "move-infantry"
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
		description: '<div class="fl-info">Low-armored, fast unit. High movement speed makes it ' +
			'essential in scouting, rushing enemy bases and supporting the ' +
			'main forces.</div>',
		damage: 2,
		armor: 4,
		defense: 0,
		healRate: .1,
		movement: 3,
		sightRangeSqr: 5,
		sightRangeSqrHill: 10,
		cost: 80,
		resources: ["light"],
		ai: ["patrol", "attack"],
		capacity: 5,
		aiPreferred: true,
		naming: "vehicle",
		shotAnimation: FL.Unit.shotAnimations.rifle,
		deathAnimation: FL.Unit.deathAnimations.lightVehicle,
		movementSound: "move-light"
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
		name: "Radar vehicle \"Eye of Sauron\"",
		description: '<div class="fl-skill">- Has enhanced sight range</div>' +
			'<div class="fl-info">Strong defensive unit. High sight range lets it see the enemy ' +
			'forces from the distance and provide nasty drop locations for ' +
			'paratroopers.</div>',
		damage: 2,
		armor: 5,
		defense: 2.5,
		healRate: .1,
		movement: 2,
		sightRangeSqr: 18,
		sightRangeSqrHill: 27,
		bombRangeSqr: 12,
		bombAttack: 2,
		cost: 125,
		resources: ["light"],
		ai: ["patrol", "hold", "rush"],
		capacity: 5,
		aiPreferred: true,
		naming: "vehicle",
		shotAnimation: FL.Unit.shotAnimations.lightCannon,
		deathAnimation: FL.Unit.deathAnimations.lightVehicle,
		movementSound: "move-light"
	},
	{
		id: "tank",
		name: "Tank \"Shushpanzer\"",
		description: '<div class="fl-skill">- Can attack twice in one turn</div>' +
			'<div class="fl-info">Powerful attacking unit. Has the highest damage and armor ' +
			'values among all units in the game.</div>',
		damage: 4,
		armor: 10,
		defense: 0,
		healRate: .1,
		movement: 2,
		sightRangeSqr: 5,
		sightRangeSqrHill: 10,
		cost: 200,
		resources: ["heavy"],
		ai: ["attack"],
		blitz: true,
		capacity: 3,
		aiPreferred: true,
		naming: "vehicle",
		shotAnimation: FL.Unit.shotAnimations.heavyCannon,
		deathAnimation: FL.Unit.deathAnimations.heavyVehicle,
		movementSound: "move-heavy"
	},
	{
		id: "mobile",
		name: "\"Wunderwaffe\" mobile site",
		description: '<div class="fl-skill">- Can strike in defense multiple times in one turn</div>' +
			'<div class="fl-info">Powerful defensive unit. Has the highest defensive armor ' +
			'value among all units in the game.</div>',
		damage: 3,
		armor: 8,
		defense: 4,
		healRate: .1,
		movement: 2,
		sightRangeSqr: 5,
		sightRangeSqrHill: 10,
		cost: 200,
		resources: ["heavy"],
		ai: ["patrol", "assaulting", "rush"],
		cover: true,
		capacity: 3,
		aiPreferred: true,
		naming: "vehicle",
		shotAnimation: FL.Unit.shotAnimations.lightCannon,
		deathAnimation: FL.Unit.deathAnimations.heavyVehicle,
		movementSound: "move-heavy"
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

FL.Unit.baseType = {
	id: "base",
	name: "Base",
	damage: 0,
	armor: 10,
	defense: 0,
	movement: 0
};

FL.Unit.types = JW.Array.index(FL.Unit.typeArray, JW.byField("id"));
