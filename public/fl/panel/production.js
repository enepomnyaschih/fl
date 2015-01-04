FL.Panel.Production = function(base) {
	FL.Panel.Production._super.call(this);
	this.base = base;
	this.type = this.base.unitType.get();
};

JW.extend(FL.Panel.Production, JW.UI.Component, {
	progressWidth: 150,

	renderProgress: function(el) {
		el.css("width", this.progressWidth + "px");

		if (!this.base.mining) {
			return;
		}
		var value = this.base.overflow + this.base.production[this.type.id];
		var offset = this._getOffset(value);
		el.append('<div class="fl-panel-production-progress-fill" style="width: ' +
			offset + 'px"></div>');
		while (value < this.type.cost) {
			var nextValue = value + this.base.mining;
			var nextOffset = this._getOffset(nextValue);
			el.append('<div class="fl-panel-production-progress-fill" style="width: ' +
				(nextOffset - offset) + 'px"></div>');
			value = nextValue;
			offset = nextOffset;
		}
	},

	renderTurns: function(el) {
		if (!this.base.mining) {
			return;
		}
		var value = this.base.overflow + this.base.production[this.type.id];
		var turns = Math.ceil((this.type.cost - value) / this.base.mining);
		el.text(turns + " turn" + ((turns !== 1) ? "s" : ""));
	},

	renderUnit: function() {
		return this.own(new FL.UnitInfo(this.type, this.base.player, true));
	},

	_getOffset: function(value) {
		return Math.round(this.progressWidth * Math.min(1, value / this.type.cost));
	}
});
