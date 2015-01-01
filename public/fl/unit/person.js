FL.Unit.Person = function(type) {
	FL.Unit.Person._super.call(this);
	this.type = type;
	this.health = 1;
	this.movement = type ? type.movement : 0;
	this.attack = true;
	this.defend = true;
	this.fortified = false;
};

JW.extend(FL.Unit.Person, JW.Class, {
	clone: function() {
		var person = new FL.Unit.Person(this.type);
		person.health = this.health;
		person.movement = this.movement;
		person.attack = this.attack;
		person.defend = this.defend;
		person.fortified = this.fortified;
		return person;
	},

	decreaseMovement: function() {
		if (--this.movement === 0) {
			this.attack = false;
		}
		this.fortified = false;
	},

	heal: function() {
		if (!this.fortified) {
			return this;
		}
		var person = this.clone();
		person.health = FL.heal(this.health, this.type.healRate);
		return person;
	},

	refresh: function() {
		var person = new FL.Unit.Person(this.type);
		person.health = this.health;
		person.fortified = (this.movement === this.type.movement);
		person.movement = this.type ? this.type.movement : 0;
		person.attack = true;
		person.defend = true;
		return person;
	}
});
