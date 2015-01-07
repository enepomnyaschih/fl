FL.App = function(data) {
	FL.App._super.call(this);
	this.data = data;
};

JW.extend(FL.App, JW.UI.Component, {
	renderRoot: function(el) {
		el.bind("contextmenu", JW.UI.preventDefault);
	},

	renderMonitor: function() {
		return this.monitor = new FL.Monitor(this.data);
	},

	afterRender: function() {
		this._super();
		this.data.lostEvent.bind(this._onLost, this);
	},

	_onLost: function(lostPlayer) {
		this.monitor.collapse();
		this.children.set(new FL.ScreenWin(lostPlayer !== 0), "screen-win");
	}
});
