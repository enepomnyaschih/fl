FL.Cell = function(ij) {
	FL.Cell._super.call(this);
	this.ij = ij;
	this.rock = false;
	this.base = null;
	this.scouted = false; // removes black mask
	this.visible = false; // reveals units
	this.invalid = false; // forces to redraw
};

JW.extend(FL.Cell, JW.Class, {
	reveal: function() {
		this.scouted = true;
		this.visible = true;
		this.invalid = true;
	}
});
