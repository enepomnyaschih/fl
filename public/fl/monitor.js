FL.Monitor = function(data) {
	FL.Monitor._super.call(this);
	this.data = data;
	this.ijSelect = null;
	this.panel = this.own(new JW.Property()).ownValue();
};

JW.extend(FL.Monitor, JW.UI.Component, {
	renderMap: function(el) {
		el.mousedown(JW.inScope(this._onMapMouseDown, this));
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

	renderPanel: function() {
		return this.panel;
	},

	_getCell: function(ij) {
		return this.getElement("map").find(".fl-monitor-cell[fl-i=n" + ij[0] + "][fl-j=n" + ij[1] + "]");
	},

	_updateCell: function(el, ij) {
		var cell = this.data.map.getCell(ij);
		el.empty();
		el.toggleClass("fl-scouted", cell.scouted);
		el.toggleClass("fl-visible", cell.visible);
		el.toggleClass("fl-rock", cell.rock);
		if (cell.base) {
			el.attr("fl-base", "n" + cell.base.player);
		} else {
			el.removeAttr("fl-base");
		}
		if (cell.unit) {
			var unitEl = jQuery('<div class="fl-unit">');
			unitEl.attr("fl-type", cell.unit.type.id);
			unitEl.attr("fl-player", "n" + cell.unit.player);
			el.append(unitEl);
		}
	},

	_onMapMouseDown: function(event) {
		event.preventDefault();
		var cellEl = jQuery(event.target);
		if (!cellEl.hasClass("fl-monitor-cell")) {
			cellEl = cellEl.parents(".fl-monitor-cell").eq(0);
		}
		if (!cellEl.hasClass("fl-monitor-cell")) {
			return;
		}
		var ij = [
			+cellEl.attr("fl-i").substr(1),
			+cellEl.attr("fl-j").substr(1)
		];
		if (this.ijSelect) {
			this._getCell(this.ijSelect).removeClass("fl-selected");
		}
		this.ijSelect = ij;
		cellEl.addClass("fl-selected");
		this.panel.set(new FL.Panel(this.data.map.getCell(ij)));
	}
});
