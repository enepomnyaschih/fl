FL.Panel.UnitPerson = function(unit, selection, index) {
	FL.Panel.UnitPerson._super.call(this);
	this.unit = unit;
	this.selection = selection;
	this.index = index;
	this.person = unit.persons.get()[index];
};

JW.extend(FL.Panel.UnitPerson, JW.UI.Component, {
	healthWidth: 60,

	renderRoot: function(el) {
		if (this.unit.player !== 0) {
			return;
		}
		el.toggleClass("fl-selected", this.selection[this.index]);
		el.mousedown(JW.UI.preventDefault);
		el.click(JW.inScope(function() {
			this.selection[this.index] = !this.selection[this.index];
			el.toggleClass("fl-selected", this.selection[this.index]);
		}, this));
	},

	renderHealthValue: function(el) {
		var value = this.person.health;
		el.text((this.unit.type.armor * value).toFixed(1));
		el.addClass((value === 1) ? "fl-good" : "fl-bad");
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
