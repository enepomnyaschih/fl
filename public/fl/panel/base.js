FL.Panel.Base = function(base) {
	FL.Panel.Base._super.call(this);
	this.base = base;
};

JW.extend(FL.Panel.Base, JW.UI.Component, {
	renderUnits: function() {
		return JW.Array.$map(FL.Unit.typeArray, function(type) {
			return this.own(new FL.Panel.UnitButton(this.base, type));
		}, this);
	},

	renderProduction: function() {
		return this.own(new JW.Mapper([this.base.unitType], {
			createValue: function(type) {
				return new FL.Panel.Production(this.base);
			},
			destroyValue: JW.destroy,
			scope: this
		})).target;
	}
});
