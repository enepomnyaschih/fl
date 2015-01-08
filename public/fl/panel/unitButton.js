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
			el.attr("title", 'Produce <span class="fl-id">' + this.type.name + '</span> ' +
				'(cost: <span class="fl-id">' + this.type.cost + '</span>)');
			el.attr("fl-player", this.base.player);
			el.click(JW.inScope(function(event) {
				this.base.unitType.set(this.type);
			}, this));
		} else {
			var resources = JW.Array.map(this.type.resources, function(resourceId) {
				return '<span class="fl-id">' + FL.Resource.types[resourceId].name + '</span>';
			}, this);
			el.attr("title", '<span class="fl-id">' + this.type.name + '</span> requires ' + resources.join(", "));
		}
	}
});
