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
				var ij = [i, j];
				var cellEl = jQuery('<div class="fl-monitor-cell"></div>');
				cellEl.attr("fl-i", "n" + i);
				cellEl.attr("fl-j", "n" + j);
				this._updateCell(cellEl, ij)
				rowEl.append(cellEl);
			}
			rowEl.append('<div class="fl-clear"></div>');
			el.append(rowEl);
		}
	},

	_updateCell: function(el, ij) {
		var cell = this.data.map.getCell(ij);
		el.toggleClass("fl-scouted", cell.scouted);
		el.toggleClass("fl-visible", cell.visible);
		el.toggleClass("fl-rock", cell.rock);
		if (cell.base) {
			el.attr("fl-base", "n" + cell.base.player);
		} else {
			el.removeAttr("fl-base");
		}
	}
});
