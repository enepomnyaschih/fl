FL.Panel.Base = function(base) {
	FL.Panel.Base._super.call(this);
	this.base = base;
	this.selectAnimation = this.own(new JW.Property()).ownValue();
};

JW.extend(FL.Panel.Base, JW.UI.Component, {
	renderName: function(el) {
		el.text(this.base.name);
	},

	renderDefense: function(el) {
		var value = this.base.health.get();
		el.html(
			((value === 1) ?
				('<span class="fl-good">' + FL.baseArmor + '</span>') :
				('<span class="fl-bad">' + (FL.baseArmor * value).toFixed(1) + '</span>')) +
			"/" + FL.baseArmor);
	},

	renderMining: function(el) {
		el.text(this.base.mining);
	},

	renderUnitsBox: function(el) {
		el.width(16 * FL.Unit.typeArray.length + "px");
		if (this.base.unitType.get()) {
			return;
		}
		this.selectAnimation.set(new FL.AlternateAnimation({
			updater: function(value) {
				el.css("background", JW.Color.str(JW.Color.gradient("#FFF", "#BFB", value)));
				el.css("border-color", JW.Color.str(JW.Color.gradient("#FFF", "#0F0", value)));
				el.css("color", JW.Color.str(JW.Color.gradient("#BFB", "#0D0", value)));
			},
			finish: function(value) {
				el.css("background", "");
				el.css("border-color", "");
				el.css("color", "");
			},
			scope: this
		}));
		this.own(this.base.unitType.changeEvent.bind(function() {
			this.selectAnimation.set(null);
		}, this));
	},

	renderSelectProduction: function(el) {
		var visible = this.own(new JW.Functor([this.base.unitType], function(unitType) {
			return !unitType;
		}, this)).target;
		this.own(new JW.UI.VisibleUpdater(el, visible));
	},

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
