FL.El = {
	xy: function(el, ij) {
		el.css({
			"left": ij[1] + "px",
			"top": ij[0] + "px"
		});
	},
	
	size: function(el, ij) {
		el.css({
			"width": ij[1] + "px",
			"height": ij[0] + "px"
		});
	}
};
