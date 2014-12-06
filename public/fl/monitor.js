FL.Monitor = function(data) {
	FL.Monitor._super.call(this);
	this.data = data;
};

JW.extend(FL.Monitor, JW.UI.Component, {
	renderRoot: function(el) {
		el.mousedown(JW.UI.preventDefault);
	},

	renderMap: function(el) {
		var map = this.data.map;
		for (var i = 0; i < map.size; ++i) {
			var rowEl = jQuery('<div class="fl-monitor-row"></div>');
			for (var j = 0; j < map.size; ++j) {
				var cell = map.getCell([i, j]);
				var cellEl = jQuery('<div class="fl-monitor-cell"></div>');
				cellEl.toggleClass("fl-rock", cell.rock);
				cellEl.attr("fl-i", "n" + i);
				cellEl.attr("fl-j", "n" + j);
				rowEl.append(cellEl);
			}
			rowEl.append('<div class="fl-clear"></div>');
			el.append(rowEl);
		}
	}
});
