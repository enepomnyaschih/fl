FL.Panel.UnitPerson = function(unit, person) {
	FL.Panel.UnitPerson._super.call(this);
	this.unit = unit;
	this.person = person;
};

JW.extend(FL.Panel.UnitPerson, JW.UI.Component, {
	healthWidth: 60,

	renderHealthValue: function(el) {
		var value = this.person.health;
		if (value === 1) {
			el.addClass("fl-good").text(this.unit.type.armor);
		} else {
			el.addClass("fl-bad").text((this.unit.type.armor * value).toFixed(1));
		}
	},

	renderHealth: function(el) {
		el.css("width", this.healthWidth + "px");
	},

	renderHealthFill: function(el) {
		el.css("width", Math.floor(this.healthWidth * this.person.health) + "px");
		el.css("background", FL.getHealthColor(this.person.health));
	},

	renderMovement: function(el) {
		for (var i = this.unit.type.movement - 1; i >= 0; --i) {
			el.append('<div class="fl-panel-unitperson-movement-point ' +
				(i < this.person.movement ? "fl-remaining" : "fl-spent") + '"></div>');
		}
	},

	renderAttack: function() {
		return (this.unit.type.damage !== 0) && this.person.attack;
	},

	renderDefend: function() {
		return (this.unit.type.damage !== 0) && this.person.defend;
	},

	renderFortified: function() {
		return (this.unit.type.defense !== 0) && this.person.fortified;
	}
});
