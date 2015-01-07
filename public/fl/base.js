FL.Base = function(data, cell, player) {
	FL.Base._super.call(this);
	this.data = data;
	this.cell = cell;
	this.ij = cell.ij;
	this.player = player;
	this.unitType = this.own(new JW.Property(null));
	this.unitBehaviour = null; // for AI
	this.production = JW.Map.map(FL.Unit.types, function() { return 0; });
	this.name = "Unnamed";
	this.mining = 0;
	this.overflow = 0;
	this.resources = [];
	this.health = this.own(new JW.Property(.1));
};

// implements FL.BattleAnimatable
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
		this.health.set(FL.heal(this.health.get(), FL.baseHealRate));
	},

	toPerson: function() {
		var person = new FL.Unit.Person(FL.Unit.baseType);
		person.health = this.health.get();
		return person;
	},

	addResource: function(resource) {
		if (!resource) {
			return;
		}
		this.resources.push(resource);
	},

	removeResource: function(resource) {
		if (!resource) {
			return;
		}
		JW.Array.removeItem(this.resources, resource);
		var unitType = this.unitType.get();
		if (unitType && !this.isUnitTypeAvailable(unitType)) {
			this.unitType.set(null);
		}
	},

	getShotAnimation: function() {
		return null;
	},

	getDeathAnimation: function() {
		return FL.Base.deathAnimation;
	},

	getCenter: function() {
		return FL.Vector.add(FL.ijToXy(this.ij), [FL.cellSize / 2, FL.cellSize / 2]);
	},

	onBattleFinish: function() {
		if (this.health.get() === 0) {
			this.data.destroyBase(this);
		}
	}
});

FL.Base.deathAnimation = {
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
};
