FL.App = function(data) {
	FL.App._super.call(this);
	this.data = data;
};

JW.extend(FL.App, JW.UI.Component, {
	renderMonitor: function() {
		return new FL.Monitor(this.data);
	},

	afterRender: function() {
		this._super();
		this.data.lostEvent.bind(this._onLost, this);
	},

	_onLost: function(player) {
		this.children.set(new FL.ScreenWin(player === 0), "monitor");
	}
});
