FL.Monitor = function(data) {
	FL.Monitor._super.call(this);
	this.data = data;
	this.cellSelect = null;
	this.panel = this.own(new JW.Property()).ownValue();
	this.selectionQueue = [];
	this.selectionTail = 0;
	this.baseExitAttachment = this.own(new JW.Property()).ownValue();
	this.orderIj = null;
	this.orderRangeSqr = null;
	this.orderCallback = null;
	this.orderScope = null;
	this.cells = new FL.Matrix(this.data.map.size);
	this.unitSelection = [];
	this.own(this.data.nextPlayerEvent.bind(this._onNextPlayer, this));
};

JW.extend(FL.Monitor, JW.UI.Component, {
	renderNext: function(el) {
		el.click(JW.inScope(function() {
			this.selectNext();
		}, this));
	},

	renderEndTurn: function(el) {
		el.click(JW.inScope(function() {
			if (!this.data.isControllable()) {
				return;
			}
			this.selectionQueue = [];
			el.removeClass("fl-active");
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

	renderCells: function(el) {
		el.mousedown(JW.inScope(this._onMapMouseDown, this));
		var map = this.data.map;
		for (var i = 0; i < map.size; ++i) {
			var rowEl = jQuery('<div class="fl-monitor-row"></div>');
			for (var j = 0; j < map.size; ++j) {
				var ij = [i, j];
				var cellEl = jQuery('<div class="fl-monitor-cell"></div>');
				this.cells.setCell(ij, cellEl);
				cellEl.attr("fl-i", i);
				cellEl.attr("fl-j", j);
				this._updateCell(cellEl, ij);
				rowEl.append(cellEl);
			}
			rowEl.append('<div class="fl-clear"></div>');
			el.append(rowEl);
		}
	},

	renderUnits: function() {
		return this.data.units.createMapper({
			createItem: function(unit) {
				return new FL.UnitView(unit);
			},
			destroyItem: JW.destroy,
			scope: this
		}).target;
	},

	renderPanel: function() {
		return this.panel;
	},

	afterRender: function() {
		this._super();
		this.selectNext();
	},

	selectCell: function(ij) {
		if (!this.data.isControllable()) {
			ij = null;
		}
		this.resetOrder();
		if (this.cellSelect) {
			this._getCell(this.cellSelect.ij).removeClass("fl-selected");
		}
		this.baseExitAttachment.set(null);
		this.unitSelection = [];
		this.cellSelect = ij ? this.data.map.getCell(ij) : null;
		if (this.cellSelect) {
			this._getCell(ij).addClass("fl-selected");
			var base = this.cellSelect.base;
			if (this._isBaseAutoSelectable(base)) {
				this.baseExitAttachment.set(base.unitType.changeEvent.bind(this.selectNext, this));
			}
			if (this.cellSelect.unit && (this.cellSelect.unit.player === 0)) {
				this.unitSelection = JW.Array.map(this.cellSelect.unit.persons.get(), function() { return true; });
			}
			this.panel.set(new FL.Panel(this, this.cellSelect));
		} else {
			this.panel.set(null);
		}
	},

	selectNext: function() {
		if (!this.data.isControllable()) {
			this.selectCell(null);
			return;
		}
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

	updateMap: function(force) {
		var map = this.data.map;
		for (var i = 0; i < map.size; ++i) {
			for (var j = 0; j < map.size; ++j) {
				var ij = [i, j];
				var cell = this.data.map.getCell(ij);
				if (force || cell.invalid) {
					this._updateCell(this._getCell(ij), ij);
				}
			}
		}
	},

	initOrder: function(cij, rangeSqr, callback, scope) {
		this.selectCell(null);
		this.orderIj = cij;
		this.orderRangeSqr = rangeSqr;
		this.orderCallback = callback;
		this.orderScope = scope;
		this.getElement("cells").addClass("fl-order-active");
		for (var i = 0; i < this.data.map.size; ++i) {
			for (var j = 0; j < this.data.map.size; ++j) {
				var ij = [i, j];
				if (!this.data.isDroppable(this.orderIj, ij, this.orderRangeSqr, 0)) {
					this._getCell(ij).append('<div class="fl-order-overlay"></div>')
				}
			}
		}
		this.panel.set(new FL.Panel.Order());
	},

	resetOrder: function() {
		if (!this.orderIj) {
			return;
		}
		this.orderIj = null;
		this.orderRangeSqr = null;
		this.orderCallback = null;
		this.orderScope = null;
		this.getElement("cells").removeClass("fl-order-active");
		this.getElement("cells").find(".fl-order-overlay").remove();
	},

	_getCell: function(ij) {
		return this.cells.getCell(ij);
	},

	_updateCell: function(el, ij) {
		el = el || this._getCell(ij);
		var cell = this.data.map.getCell(ij);
		cell.invalid = false;
		el.empty();
		el.toggleClass("fl-scouted", cell.scouted);
		el.toggleClass("fl-visible", cell.visible);
		el.toggleClass("fl-rock", cell.rock);
		el.toggleClass("fl-hill", cell.hill);

		if (cell.miningBase) {
			el.attr("fl-player", cell.miningBase.player);
			el.append('<div class="fl-mining"></div>');
		} else {
			el.removeAttr("fl-player");
		}
		var borderEl = jQuery('<div class="fl-border"></div>');
		borderEl.toggleClass("fl-hold", (cell.unit != null) && cell.unit.hold && (cell.unit.player === 0));
		for (var d = 0; d < 4; ++d) {
			var dij = FL.Vector.add(cell.ij, FL.dir4[d]);
			var dCell = this.data.map.getCell(dij);
			borderEl.toggleClass("fl-border-" + d, dCell && !dCell.rock && !cell.rock &&
				cell.miningBase && (dCell.miningBase !== cell.miningBase) &&
				(dCell.miningBase ? (cell.miningBase._iid > dCell.miningBase._iid) : true));
		}
		el.append(borderEl);
		if (cell.resource) {
			var resourceEl = jQuery('<div class="fl-resource"></div>');
			resourceEl.attr("fl-type", cell.resource.id);
			el.append(resourceEl);
		}
		if (cell.base) {
			var baseEl = jQuery('<div class="fl-base"></div>');
			baseEl.attr("fl-player", cell.base.player);
			el.append(baseEl);
		}
		if (cell.scouted && !cell.visible) {
			el.append('<div class="fl-fog"></div>')
		}
	},

	_onNextPlayer: function() {
		this.updateMap();
		this.selectNext();
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
			+cellEl.attr("fl-i"),
			+cellEl.attr("fl-j")
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
		if (!this.data.isControllable()) {
			return;
		}
		if (this.orderIj) {
			if (!this.data.isDroppable(this.orderIj, ij, this.orderRangeSqr, 0)) {
				return;
			}
			this.orderCallback.call(this.orderScope, ij);
			this.resetOrder();
			this.selectNext();
			return;
		}
		if (!this.cellSelect) {
			return;
		}
		var unit = this.cellSelect.unit;
		if (!unit || (unit.player !== 0)) {
			return;
		}
		unit.ijTarget = ij;
		this.data.moveUnit(unit, this.unitSelection);
		this.updateMap();
		if (unit.alive && unit.movement.get()) {
			this.selectCell(unit.ij.get());
		} else {
			this.selectNext();
		}
	},

	_refreshSelectionQueue: function() {
		this.selectionQueue = [];
		this.selectionTail = 0;
		this.data.units.each(function(unit) {
			if (this._isUnitAutoSelectable(unit)) {
				this.selectionQueue.push(unit.ij.get());
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
		return unit && (unit.player === 0) && (unit.movement.get() !== 0) &&
			!unit.hold && !unit.skipped && !unit.ijTarget;
	},

	_isBaseAutoSelectable: function(base) {
		return base && (base.player === 0) && (base.unitType.get() == null);
	}
});
