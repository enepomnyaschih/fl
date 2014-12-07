FL.Monitor = function(data) {
	FL.Monitor._super.call(this);
	this.data = data;
	this.cellSelect = null;
	this.panel = this.own(new JW.Property()).ownValue();
	this.selectionQueue = [];
	this.selectionTail = 0;
	this.baseExitAttachment = this.own(new JW.Property()).ownValue();
};

JW.extend(FL.Monitor, JW.UI.Component, {
	renderNext: function(el) {
		el.click(JW.inScope(function() {
			this.selectNext();
		}, this));
	},

	renderEndTurn: function(el) {
		el.click(JW.inScope(function() {
			this.selectionQueue = [];
			el.removeClass("fl-active");
			this.selectCell(null);
			this.data.endTurn();
			this.updateMap();
			this.selectNext();
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

	afterRender: function() {
		this._super();
		this.selectNext();
	},

	selectCell: function(ij) {
		if (this.cellSelect) {
			this._getCell(this.cellSelect.ij).removeClass("fl-selected");
		}
		this.baseExitAttachment.set(null);
		this.cellSelect = ij ? this.data.map.getCell(ij) : null;
		if (this.cellSelect) {
			this._getCell(ij).addClass("fl-selected");
			var base = this.cellSelect.base;
			if (this._isBaseAutoSelectable(base)) {
				this.baseExitAttachment.set(base.unitType.changeEvent.bind(this.selectNext, this));
			}
			this.panel.set(new FL.Panel(this, this.cellSelect));
		} else {
			this.panel.set(null);
		}
	},

	selectNext: function() {
		while (this.selectionTail < this.selectionQueue.length) {
			var cell = this.data.map.getCell(this.selectionQueue[this.selectionTail++]);
			var isUnit = this._isUnitAutoSelectable(cell.unit);
			var isBase = this._isBaseAutoSelectable(cell.base);
			if (isUnit || isBase) {
				this.selectCell(cell.ij);
				return;
			}
		}
		this._refreshSelectionQueue();
		if (this.selectionQueue.length) {
			this.selectCell(this.selectionQueue[this.selectionTail++]);
			return;
		}
		this.data.moveUnits(0);
		this.updateMap();
		this._refreshSelectionQueue();
		if (this.selectionQueue.length) {
			this.selectCell(this.selectionQueue[this.selectionTail++]);
			return;
		}
		this.selectCell(null);
		this.getElement("end-turn").addClass("fl-active");
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
		el = el || this._getCell(ij);
		var cell = this.data.map.getCell(ij);
		cell.invalid = false;
		el.empty();
		el.toggleClass("fl-scouted", true);//cell.scouted);
		el.toggleClass("fl-visible", true);//cell.visible);
		el.toggleClass("fl-rock", cell.rock);
		el.toggleClass("fl-hold", (cell.unit != null) && cell.unit.hold && (cell.unit.player === 0));
		for (var d = 0; d < 4; ++d) {
			var dij = FL.Vector.add(cell.ij, FL.dir4[d]);
			var dCell = this.data.map.getCell(dij);
			el.toggleClass("fl-border-" + d,
				dCell && !dCell.rock && !cell.rock &&
				cell.miningBase && (dCell.miningBase !== cell.miningBase) &&
				(dCell.miningBase ? (cell.miningBase._iid > dCell.miningBase._iid) : true));
		}
		if (cell.miningBase) {
			el.attr("fl-player", "n" + cell.miningBase.player);
		} else {
			el.removeAttr("fl-player");
		}
		if (cell.resource) {
			var resourceEl = jQuery('<div class="fl-resource"></div>');
			resourceEl.attr("fl-type", cell.resource.id);
			el.append(resourceEl);
		}
		if (cell.base) {
			var baseEl = jQuery('<div class="fl-base"></div>');
			baseEl.attr("fl-player", "n" + cell.base.player);
			el.append(baseEl);
		}
		if (cell.unit) {
			var unitEl = jQuery('<div class="fl-unit"></div>');
			unitEl.attr("fl-type", cell.unit.type.id);
			unitEl.attr("fl-player", "n" + cell.unit.player);
			unitEl.toggleClass("fl-moved", cell.unit.movement === 0);
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
			this.selectNext();
		}
	},

	_refreshSelectionQueue: function() {
		this.selectionQueue = [];
		this.selectionTail = 0;
		this.data.units.each(function(unit) {
			if (this._isUnitAutoSelectable(unit)) {
				this.selectionQueue.push(unit.ij);
			}
		}, this);
		this.data.bases.each(function(base) {
			var contains = JW.Array.some(this.selectionQueue, function(ij) {
				return FL.Vector.equal(ij, base.ij);
			}, this);
			if (!contains && this._isBaseAutoSelectable(base)) {
				this.selectionQueue.push(base.ij);
			}
		}, this);
	},

	_isUnitAutoSelectable: function(unit) {
		return unit && (unit.player === 0) && (unit.movement !== 0) && !unit.hold && !unit.ijTarget;
	},

	_isBaseAutoSelectable: function(base) {
		return base && (base.player === 0) && (base.unitType.get() == null);
	}
});
