FL.UnitView = function(unit) {
	FL.UnitView._super.call(this);
	this.unit = unit; // FL.Unit
};

JW.extend(FL.UnitView, JW.UI.Component, {
	renderRoot: function(el) {
		el.addClass("fl-unit fl-monitor-unit");
		el.attr("fl-type", this.unit.type.id);
		el.attr("fl-player", this.unit.player);
		this.own(new FL.PositionUpdater(el, this.unit.xy));
		this.own(new JW.UI.CssUpdater(el, "opacity", this.unit.opacity));

		if (this.unit.player === 0) {
			var moved = this.own(new JW.Functor([this.unit.movement], function(movement) {
				return movement === 0;
			}, this)).target;
			this.own(new JW.UI.ClassUpdater(el, "fl-moved", moved));
		}
	}
});
