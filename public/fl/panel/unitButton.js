FL.Panel.UnitButton = function(base, type) {
	FL.Panel.UnitButton._super.call(this);
	this.base = base;
	this.type = type;
};

JW.extend(FL.Panel.UnitButton, JW.UI.Component, {
	renderRoot: function(el) {
		el.attr("fl-type", this.type.id);
		el.attr("fl-player", "n" + this.base.player);
		el.attr("title", "Produce " + this.type.name + " (cost: " + this.type.cost + ")");
		el.click(JW.inScope(function(event) {
			event.preventDefault();
			this.base.unitType.set(this.type);
		}, this));
	}
});
