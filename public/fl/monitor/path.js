FL.Monitor.Path = function(path, color) {
	FL.Monitor.Path._super.call(this);
	this.path = path;
	this.color = color;
};

JW.extend(FL.Monitor.Path, JW.UI.Component, {
	renderRoot: function(el) {
		for (var i = 0; i < this.path.length; ++i) {
			var ij = this.path[i][1];
			var xy = FL.ijToXy(ij);
			var dot = jQuery('<div class="fl-monitor-path-dot"></div>');
			dot.css({
				"background-color": this.color,
				"border-color": JW.Color.str(JW.Color.darken(this.color, .5)),
				left: xy[0] + "px",
				top : xy[1] + "px"
			});
			el.append(dot);
		}
	}
});
