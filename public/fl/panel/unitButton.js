FL.Panel.UnitButton = function(base, type) {
	FL.Panel.UnitButton._super.call(this);
	this.base = base;
	this.type = type;
};

JW.extend(FL.Panel.UnitButton, JW.UI.Component, {
	renderRoot: function(el) {
		el.click(JW.UI.preventDefault);
		el.attr("fl-type", this.type.id);
		if (this.base.isUnitTypeAvailable(this.type)) {
			el.attr("title", "Produce " + this.type.name + " (cost: " + this.type.cost + ")");
			el.attr("fl-player", this.base.player);
			el.click(JW.inScope(function(event) {
				this.base.unitType.set(this.type);
			}, this));
		} else {
			var resources = JW.Array.map(this.type.resources, function(resourceId) {
				return FL.Resource.types[resourceId].name;
			}, this);
			el.attr("title", this.type.name + " requires " + resources.join(", "));
		}
	}
});
