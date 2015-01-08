FL.Monitor = function(data) {
	FL.Monitor._super.call(this);
	this.data = data;
	this.cellSelect = null;
	this.cellAnimation = this.own(new JW.Property()).ownValue();
	this.selectNextAnimation = this.own(new JW.Property()).ownValue();
	this.endTurnAnimation = this.own(new JW.Property()).ownValue();
	this.army = this.own(new JW.Property()).ownValue();
	this.panel = this.own(new JW.Property()).ownValue();
	this.selectionQueue = [];
	this.selectionTail = 0;
	this.baseExitAttachment = this.own(new JW.Property()).ownValue();
	this.order = null;
	this.cells = new FL.Matrix(this.data.map.size);
	this.unitSelection = [];
	this.collapsed = false;
	this.beginTime = new Date().getTime();
	this.own(this.data.nextPlayerEvent.bind(this.selectNext, this));
	this.own(this.data.mapUpdateEvent.bind(this.updateMap, this));
	this.own(new JW.Interval(this._animateArrows, this, 40));
};

JW.extend(FL.Monitor, JW.UI.Component, {
	arrowsRotationPeriod: 4000,
	arrowsScalingPeriod: 1000,
	arrowsSize: 100,

	renderTurn: function(el) {
		this.own(new JW.UI.TextUpdater(el, this.data.turn));
	},

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
			this.endTurnAnimation.set(null);
			this.selectCell(null);
			this.data.endTurn();
		}, this));
	},

	renderArmy: function(el) {
		return this.army;
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

	renderParticles: function() {
		return this.data.particles.createMapper({
			createItem: function(particle) {
				return new FL.Monitor.Particle(particle);
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
			this.cellAnimation.set(null);
		}
		this.baseExitAttachment.set(null);
		this.selectNextAnimation.set(null);
		this.unitSelection = [];

		var animateArrows = this.cellSelect != null;
		this.cellSelect = ij ? this.data.map.getCell(ij) : null;
		if (this.cellSelect) {
			var cellEl = this._getCell(ij);
			this.cellAnimation.set(new FL.AlternateAnimation({
				updater: function(value) {
					cellEl.children(".fl-border").css("background",
						"rgba(255, 255, 255, " + value.toFixed(2) + ")");
				},
				finish: function() {
					cellEl.children(".fl-border").css("background", "");
				},
				scope: this
			}));
			var base = this.cellSelect.base;
			if (this._isBaseAutoSelectable(base)) {
				this.baseExitAttachment.set(base.unitType.changeEvent.bind(this.selectNextIfDone, this));
			} else if (base) {
				this.baseExitAttachment.set(base.unitType.changeEvent.bind(this.reselectCell, this));
			}
			if (this.cellSelect.unit && (this.cellSelect.unit.player === 0)) {
				this.unitSelection = JW.Array.map(this.cellSelect.unit.persons.get(), function() { return false; });
			}
			this.army.set((this.cellSelect.visible[0] && this.cellSelect.unit) ?
				new FL.Panel.Unit(this, this.cellSelect.unit) : null);
			this.panel.set(new FL.Panel(this, this.cellSelect));
			this.getElement("arrows").css("display", "");

			var xyCell = FL.ijToXy(this.cellSelect.ij);
			var offset = (FL.cellSize - this.arrowsSize) / 2;
			var xyArrows = FL.Vector.add(xyCell, [offset, offset]);
			var properties = {
				left: Math.round(xyArrows[0]) + "px",
				top : Math.round(xyArrows[1]) + "px"
			};
			if (animateArrows) {
				this.getElement("arrows").stop().animate(properties, 500, "easeOutQuad");
			} else {
				this.getElement("arrows").css(properties);
			}
		} else {
			this.army.set(null);
			this.panel.set(null);
			this.getElement("arrows").css("display", "none");
		}
	},

	selectNext: function() {
		if (!this.data.isControllable()) {
			this.selectCell(null);
			return;
		}
		while (this.selectionTail < this.selectionQueue.length) {
			var cell = this.data.map.getCell(this.selectionQueue[this.selectionTail++]);
			if (this._isCellAutoSelectable(cell)) {
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
		this._refreshSelectionQueue();
		if (this.selectionQueue.length) {
			this.selectCell(this.selectionQueue[this.selectionTail++]);
			return;
		}
		this.selectCell(null);
		this.endTurnAnimation.set(new FL.ButtonAnimation(this.getElement("end-turn")));
	},

	selectNextIfDone: function() {
		if (this.cellSelect && this._isBaseAutoSelectable(this.cellSelect.base)) {
			this.reselectCell();
		} else if (this.cellSelect && this._isUnitAutoSelectable(this.cellSelect.unit)) {
			this.reselectCell();
		} else {
			this.selectNext();
		}
	},

	reselectCell: function() {
		this.selectCell(this.cellSelect.ij);
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

	initOrder: function(order) {
		this.selectCell(null);
		this.order = order;
		this.getElement("cells").addClass("fl-order-active");
		for (var i = 0; i < this.data.map.size; ++i) {
			for (var j = 0; j < this.data.map.size; ++j) {
				var ij = [i, j];
				if (!this.order.test.call(this.order.scope || this, ij)) {
					this._getCell(ij).append('<div class="fl-order-overlay"></div>')
				}
			}
		}
		this.panel.set(new FL.Panel.Order());
	},

	resetOrder: function() {
		if (!this.order) {
			return;
		}
		var order = this.order;
		this.order = null;
		this.getElement("cells").removeClass("fl-order-active");
		this.getElement("cells").find(".fl-order-overlay").remove();
		if (order.finish) {
			order.finish.call(order.scope || this);
		}
	},

	collapse: function() {
		this.getElement("left-panel").
			add(this.getElement("right-panel")).
			css("visibility", "hidden").animate({
				"margin-right": 0,
				"width": 0
			}, 2000);
		this.panel.set(null);
		this.selectCell(null);
		this.collapsed = true;
	},

	_getCell: function(ij) {
		return this.cells.getCell(ij);
	},

	_updateCell: function(el, ij) {
		el = el || this._getCell(ij);
		var cell = this.data.map.getCell(ij);
		cell.invalid = false;
		el.empty();
		el.toggleClass("fl-scouted", cell.scouted[0]);
		el.toggleClass("fl-visible", cell.visible[0]);
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
		if (cell.scouted[0] && !cell.visible[0]) {
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
			+cellEl.attr("fl-i"),
			+cellEl.attr("fl-j")
		];
		switch (event.which) {
			case 1: this._onLeftMouseDown(cellEl, ij); break;
			case 3: this._onRightMouseDown(cellEl, ij); break;
		}
	},

	_onLeftMouseDown: function(cellEl, ij) {
		if (this.collapsed) {
			return;
		}
		this.selectCell(ij);
		if (!this._isCellAutoSelectable(this.cellSelect) && !this.endTurnAnimation.get()) {
			this.selectNextAnimation.set(new FL.ButtonAnimation(this.getElement("next")));
		}
	},

	_onRightMouseDown: function(cellEl, ij) {
		if (!this.data.isControllable()) {
			return;
		}
		if (this.order) {
			if (!this.order.test.call(this.order.scope || this, ij)) {
				return;
			}
			this.order.execute.call(this.order.scope || this, ij);
			this.resetOrder();
			this.selectNextIfDone();
			return;
		}
		if (!this.cellSelect) {
			return;
		}
		var unit = this.cellSelect.unit;
		if (!unit || (unit.player !== 0)) {
			return;
		}
		var distance = FL.Vector.length8(FL.Vector.diff(ij, unit.ij.get()));
		if (distance === 0) {
			unit.ijTarget = null;
			this.selectNext();
			return;
		}
		unit.ijTarget = ij;
		this.data.moveUnit(unit, this.unitSelection);
		if (unit.alive && unit.movement.get()) {
			this.selectCell(unit.ij.get());
		} else {
			this.selectNextIfDone();
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
		return (unit != null) && (unit.player === 0) && (unit.movement.get() !== 0) &&
			!unit.hold && !unit.skipped && !unit.ijTarget;
	},

	_isBaseAutoSelectable: function(base) {
		return (base != null) && (base.player === 0) && (base.unitType.get() == null);
	},

	_isCellAutoSelectable: function(cell) {
		return (cell != null) && (this._isUnitAutoSelectable(cell.unit) || this._isBaseAutoSelectable(cell.base));
	},

	_animateArrows: function() {
		var time = new Date().getTime() - this.beginTime;
		var rotation = 360 * JW.mod(time / this.arrowsRotationPeriod, 1);
		var scaling = .75 + .5 * Math.abs(JW.smod(time / this.arrowsScalingPeriod, 1));
		this.getElement("arrows").css("transform",
			"rotate(" + Math.round(rotation) + "deg) " +
			"scale(" + scaling.toFixed(3) + ")");
	}
});