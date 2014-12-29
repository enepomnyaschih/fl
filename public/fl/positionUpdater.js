FL.PositionUpdater = function(el, xy) {
	FL.PositionUpdater._super.call(this);
	this.el = el; // Element
	// JW.Property<Vector> xy;
	this.own(new JW.Updater([xy], function(xy) {
		this.el.css({
			left : xy[0] + "px",
			top  : xy[1] + "px"
		});
	}, this));
};

JW.extend(FL.PositionUpdater, JW.Class);
