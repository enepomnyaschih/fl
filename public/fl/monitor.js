FL.Monitor = function(data) {
	FL.Monitor._super.call(this);
	this.data = data;
	this.cellSelect = null;
	this.panel = this.own(new JW.Property()).ownValue();
};

JW.extend(FL.Monitor, JW.UI.Component, {
	renderEndTurn: function(el) {
		el.click(JW.inScope(function() {
			this.selectCell(null);
			this.data.endTurn();
			this.updateMap();
		}, this));
	},

	renderLog: function(el) {
		this.data.logEvent.bind(function(message) {
			var messageEl = jQuery('<div class="fl-message"></div>');
			messageEl.text(message[0]);
			if (message[1]) {
				messageEl.addClass(message[1]);
			}
			el.append(messageEl);
			el.scrollTop(1000000);
		}, this);
	},

	renderMap: function(el) {
		el.mousedown(JW.inScope(this._onMapMouseDown, this));
		el.bind("contextmenu", JW.UI.preventDefault);
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

	selectCell: function(ij) {
		if (this.cellSelect) {
			this._getCell(this.cellSelect.ij).removeClass("fl-selected");
		}
		this.cellSelect = ij ? this.data.map.getCell(ij) : null;
		if (this.cellSelect) {
			this._getCell(ij).addClass("fl-selected");
			this.panel.set(new FL.Panel(this.cellSelect));
		} else {
			this.panel.set(null);
		}
	},

	updateMap: function() {
		var map = this.data.map;
		for (var i = 0; i < map.size; ++i) {
			for (var j = 0; j < map.size; ++j) {
				var ij = [i, j];
				var cell = this.data.map.getCell(ij);
				if (cell.invalid) {
					this._updateCell(this._getCell(ij), ij);
				}
			}
		}
	},

	_getCell: function(ij) {
		return this.getElement("map").find(".fl-monitor-cell[fl-i=n" + ij[0] + "][fl-j=n" + ij[1] + "]");
	},

	_updateCell: function(el, ij) {
		var cell = this.data.map.getCell(ij);
		cell.invalid = false;
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
		if (cell.scouted && !cell.visible) {
			el.append('<div class="fl-fog"></div>')
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
		switch (event.which) {
			case 1: this._onLeftMouseDown(cellEl, ij); break;
			case 3: this._onRightMouseDown(cellEl, ij); break;
		}
	},

	_onLeftMouseDown: function(cellEl, ij) {
		this.selectCell(ij);
	},

	_onRightMouseDown: function(cellEl, ij) {
		if (!this.cellSelect) {
			return;
		}
		var unit = this.cellSelect.unit;
		if (!unit || (unit.player !== 0)) {
			return;
		}
		unit.ijTarget = ij;
		this.data.moveUnit(unit);
		this.updateMap();
		if (unit.movement) {
			this.selectCell(unit.ij);
		} else {
			this.selectCell(null);
		}
	}
});
