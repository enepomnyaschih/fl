FL.App = function(data) {
	FL.App._super.call(this);
	this.data = data;
};

JW.extend(FL.App, JW.UI.Component, {
	renderMonitor: function() {
		return new FL.Monitor(this.data);
	}
});
