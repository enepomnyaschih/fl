FL.UnitInfo = function(type, player, showCost) {
	FL.UnitInfo._super.call(this);
	this.type = type;
	this.player = player || 0;
	this.showCost = showCost || false;
};

JW.extend(FL.UnitInfo, JW.UI.Component, {
	renderHeader: function() {
		return this.own(new FL.UnitInfo.Header(this.type, this.player));
	},

	renderStats: function() {
		return this.own(new FL.UnitInfo.Stats(this.type, this.showCost));
	}
});
