FL.Panel.Order = function() {
	FL.Panel.Order._super.call(this);
};

JW.extend(FL.Panel.Order, JW.UI.Component, {
	renderRoot: function(el) {
		el.text("Right mouse button - issue order");
	}
});
