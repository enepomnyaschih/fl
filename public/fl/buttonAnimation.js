FL.ButtonAnimation = function(el) {
	FL.ButtonAnimation._super.call(this);
	this.own(new FL.AlternateAnimation({
		updater: function(value) {
			var color = JW.Color.str(JW.Color.gradient("#00D000", "#009000", value));
			el.css("background-color", color);
			el.css("border-color", color);
		},
		finish: function() {
			el.css("background-color", "");
			el.css("border-color", "");
		},
		scope: this
	}))
};

JW.extend(FL.ButtonAnimation, JW.Class);
