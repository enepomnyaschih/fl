FL.UnitInfo.Header = function(type, player) {
	FL.UnitInfo.Header._super.call(this);
	this.type = type;
	this.player = player || 0;
};

JW.extend(FL.UnitInfo.Header, JW.UI.Component, {
	renderIcon: function(el) {
		el.attr("fl-type", this.type.id);
		el.attr("fl-player", this.player);
	},

	renderName: function(el) {
		el.text(this.type.name);
	}
});
