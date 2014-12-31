FL.Panel.Production = function(base) {
	FL.Panel.Production._super.call(this);
	this.base = base;
	this.type = this.base.unitType.get();
};

JW.extend(FL.Panel.Production, JW.UI.Component, {
	progressWidth: 200,

	renderProgress: function(el) {
		el.css("width", this.progressWidth + "px");
	},

	renderProgressFill: function(el) {
		var production = this.base.overflow + this.base.production[this.type.id];
		var progress = Math.min(1, production / this.type.cost);
		el.css("width", Math.floor(this.progressWidth * progress) + "px");
	},

	renderUnit: function() {
		return this.own(new FL.UnitInfo(this.type, this.base.player, true));
	}
});
